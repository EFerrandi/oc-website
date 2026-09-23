# Implementation Plan: OC Photo Gallery Website

**Branch**: `001-oc-photo-gallery` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-oc-photo-gallery/spec.md`

## Summary

A personal gallery site for original characters. Visitors browse a filterable gallery of characters, open a detail page showing each character's images, stories, tags, traits, credits and relationships, view all relationships on one page, and browse every image grouped by artist. All adult content is hidden unless the visitor ticks an opt-in checkbox in the header. A single admin manages all content behind a login.

**Technical approach**: one Express 5 application rendering HTML on the server, backed by an embedded SQLite database, with no client-side framework and no build step. Server rendering is the decisive choice: the spec requires the server itself to refuse NSFW media on direct request (FR-012), which is only reliable when every response — pages *and* image bytes — passes through one gating middleware. Plain `GET` forms give shareable, reloadable filter URLs (FR-018) and keep the site fully operable without JavaScript. See [research.md](./research.md) for the full rationale.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node.js 22 LTS or newer — development on Node 26

**Primary Dependencies**: Express 5 (HTTP), Nunjucks (templates, layout inheritance), `express-session` + SQLite store (admin sessions), `multer` (uploads), `sharp` (preview generation), `zod` (form validation), `express-rate-limit` (sign-in throttling). Built-ins used deliberately in place of dependencies: `node:sqlite` (database driver), `node:crypto` (`scrypt` password hashing, CSRF tokens), `node:test` (test runner)

**Storage**: SQLite at `data/oc.db` via the built-in `node:sqlite`; uploaded originals on disk at `data/uploads/` with generated previews at `data/uploads/previews/`, both served **only** through a gated route, never statically

**Testing**: `node:test` + `node:assert/strict`, with `supertest` for HTTP-level tests against the app; throwaway seeded database per run

**Target Platform**: Node server (Linux or Windows); modern evergreen browsers, functional without JavaScript

**Project Type**: Server-rendered web application (single project)

**Performance Goals**: Gallery and detail pages readable within 3s at 100 characters / 1,000 images (SC-003); filter apply or clear within 1s (SC-004)

**Constraints**: No NSFW byte ever served without opt-in, including direct URL requests (FR-012, SC-001); no build step; no local compilation toolchain required — `sharp` is the one native dependency and it installs from prebuilt binaries on Windows and Linux (research R-017); usable without horizontal scrolling from 360px to 1920px (SC-009); every interactive control keyboard-operable (SC-006)

**Scale/Scope**: Single admin, anonymous visitors, low hundreds of characters, low thousands of images; 8 public routes, ~30 admin routes, 9 core tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md) **v1.0.0** (ratified 2026-09-23). This supersedes the earlier vacuous check recorded while the constitution was still an unfilled template.

| Principle | Gate result | How this design satisfies it |
|---|---|---|
| **I. Content Rating Safety** (NON-NEGOTIABLE) | **PASS** | Rating is resolved in one middleware and applied server-side to both queries and bytes. Uploads are never served statically; `GET /media/:id`, `GET /media/:id/full` and `GET /images/:id` are the only paths to stored content and all three gate identically (FR-070). Refusals return `404`, never `403`. Absent or malformed opt-in cookie ⇒ off. Dedicated isolated `test:nsfw` suite. |
| **II. Data Integrity Through Invariants** | **PASS** | Nine invariants (I-1…I-9) are enumerated in data-model.md, each with one enforcement point in `services/`. Tag-vs-trait delete asymmetry is encoded as `RESTRICT` vs `CASCADE` foreign-key actions and documented at its point of definition with its reason. Character + first image creation is one transaction; failed uploads delete their temp files before any write. Validation errors name the failing field (FR-027). |
| **III. Works Without JavaScript** | **PASS** | Server-rendered throughout, no client framework, no build step. Filters and the NSFW toggle are plain `GET`/`POST` forms; filter state lives in the URL (FR-018). Click-to-enlarge is an anchor to `GET /images/:id`, progressively enhanced into an overlay that restores focus on dismiss (FR-065, FR-066). Alt text mandatory at the schema level; 360–1920px verified by V-13. |
| **IV. Test-First Where It Counts** | **PASS** | The four mandatory-test-first areas map to `tests/integration/`: `nsfw-gating`, `character-creation`, `deletes`, and access control. Cross-cutting rules are exercised at the HTTP level with `supertest` rather than against internals. `tasks.md` must order these tests ahead of their implementation. |
| **V. Boring By Default** | **PASS (one justified deviation)** | Four built-ins replace dependencies (`node:sqlite`, `node:crypto`, `node:test`, plus a hand-rolled CSRF token in place of the deprecated `csurf`). No build step, no client framework, no ORM, no speculative abstraction. Deferred scope is recorded as deferred rather than left ambiguous. **`sharp` is a native dependency** — see Complexity Tracking. |

**Technical Constraints check**: PASS. Repository/service/route layering is the Structure Decision below; migrations are forward-only and transactional with a `schema_migration` ledger; `PRAGMA foreign_keys = ON` is set on every connection; the session secret and `scrypt` password hash come from the environment and are git-ignored; state-changing requests carry a session-bound CSRF token and sign-in is rate-limited; uploads are validated by magic bytes rather than the client-supplied type.

**Post-Phase 1 re-check**: **PASS**, unchanged. The design added no extra project, service boundary, or abstraction layer. The one addition since the previous plan revision — preview generation and the split media routes — strengthens Principle I (both variants gate identically) rather than weakening it, and introduced the single Principle V deviation tracked below.

**Compliance note**: Principle I requires re-verification whenever a new route serving stored content is added. This design adds two such routes (`/media/:id/full`, `/images/:id`) versus the pre-clarification plan; both are covered by V-14 step 6, which asserts `404` on all three content paths with NSFW off.

## Project Structure

### Documentation (this feature)

```text
specs/001-oc-photo-gallery/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Phase 0 output - 17 decisions, all unknowns resolved
├── data-model.md                # Phase 1 output - schema, invariants, derived values
├── quickstart.md                # Phase 1 output - setup + 14 validation scenarios
├── contracts/
│   ├── public-routes.md         # Phase 1 output - visitor-facing route contracts
│   └── admin-routes.md          # Phase 1 output - admin route contracts
├── checklists/
│   └── requirements.md          # Spec quality checklist (16/16 passing)
└── tasks.md                     # Phase 2 - created by /speckit-tasks, NOT by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── server.js                    # Process entry: config load, listen, graceful shutdown
├── app.js                       # Express app assembly (exported for tests)
├── config.js                    # Environment parsing and validation
├── db/
│   ├── index.js                 # Connection, PRAGMA foreign_keys/WAL
│   ├── migrate.js               # Ordered forward-only migration runner
│   └── migrations/              # 001_initial.sql, ...
├── repositories/                # One module per aggregate; all SQL lives here
│   ├── characters.js            # Filtered queries, facet derivation, avatar resolution
│   ├── images.js
│   ├── stories.js
│   ├── relationships.js
│   ├── traits.js                # Sins/virtues - note the delete asymmetry vs tags
│   ├── tags.js
│   ├── genders.js
│   └── credits.js               # Artists and designers
├── services/                    # Transactions and cross-entity invariants
│   ├── characterService.js      # Atomic character + first image creation (FR-049/050)
│   ├── imageService.js          # Upload validation, file lifecycle, orphan sweep
│   ├── storyService.js
│   ├── relationshipService.js
│   └── taxonomyService.js       # Tag/trait/gender/artist/designer delete rules
├── middleware/
│   ├── nsfw.js                  # Reads the nsfw cookie into res.locals - gates everything
│   ├── requireAdmin.js
│   ├── csrf.js                  # Session-bound synchroniser token
│   ├── upload.js                # multer + magic-byte confirmation + sharp preview generation
│   ├── logging.js               # structured request logging
│   └── errors.js                # 404/422/500 handlers
├── routes/
│   ├── public/                  # gallery, character, relationships, artists, media, image view, stories
│   └── admin/                   # auth, characters, images, stories, relationships, taxonomy
├── views/                       # Nunjucks: layout.njk, partials/, pages/, admin/
├── public/                      # Static: css/, js/ (progressive enhancement only), img/placeholder
└── lib/                         # slug, url validation, name normalisation, date helpers

scripts/
└── set-admin-password.js        # prompts, derives the scrypt hash for .env

tests/
├── contract/                    # Route contracts from contracts/*.md
├── integration/                 # nsfw-gating, filters, character-creation, deletes
├── unit/                        # lib helpers, validation schemas
└── helpers/                     # app factory, temp DB, fixtures

data/                            # git-ignored: oc.db, uploads/
```

**Structure Decision**: Single project, since one Express app serves both the rendered pages and the admin — there is no separate frontend to split out. The layering that matters is **repositories → services → routes**: all SQL is confined to `repositories/`, all multi-step invariants and transactions live in `services/`, and `routes/` only handles HTTP concerns. This exists specifically so the spec's trickiest rules — atomic character-plus-image creation (FR-049/FR-050), the orphan sweep on character delete (FR-029), and the tag-versus-trait delete asymmetry (FR-062) — each have exactly one home rather than being scattered across request handlers.

## Design Artifacts

| Artifact | Contents |
|---|---|
| [research.md](./research.md) | 17 decisions (R-001…R-017) covering architecture, runtime, storage, templating, NSFW gating, media delivery, delete semantics, auth, CSRF, uploads, uniqueness, filtering, facets, avatar fallback, testing, responsive/accessible approach, preview generation and click-to-enlarge — plus explicitly deferred items |
| [data-model.md](./data-model.md) | Core tables plus join tables, foreign-key delete actions, 9 cross-cutting invariants, per-request derived values, indexes, migration strategy |
| [contracts/public-routes.md](./contracts/public-routes.md) | 8 visitor routes with parameters, status codes, and the rating rule applied to each |
| [contracts/admin-routes.md](./contracts/admin-routes.md) | Auth, character/image/story/relationship CRUD, taxonomy management, validation and error conventions |
| [quickstart.md](./quickstart.md) | Setup commands, test commands, and 14 manual validation scenarios mapped to requirements |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| NSFW content leaking through a path that skips the gate | Breaks the site's core safety promise (SC-001) | Uploads are never served statically; the sole media paths are `GET /media/:id` (preview) and `GET /media/:id/full` (original), both gating by rating. Dedicated `test:nsfw` suite plus manual scenarios V-2 and V-14. |
| Tag/trait delete asymmetry "fixed" into consistency by a later change | Silent data corruption (invalid characters) or a blocked legitimate delete | Encoded as foreign-key actions in the schema, not just application code; called out in the data model, admin contract, and validation scenario V-10. |
| Character/image mutual requirement causing a creation deadlock | Admin cannot add any character at all | Combined form saved in one transaction (FR-049); `avatar_image_id` nullable purely to break the circular insert, set before commit. |
| Unbounded originals missing the 3s budget at 1,000 images | SC-003 / SC-013 failure | Previews are generated at upload and are the only variant galleries request; originals transfer solely on an explicit click (research R-017). |
| `node:sqlite` API gaps | Rework in the data layer | All SQL is confined to `repositories/`; `better-sqlite3` is a drop-in fallback touching only that directory. |

## Complexity Tracking

Principle V requires every native dependency to be justified against the build friction it imposes, and every deviation to record the simpler alternative that was rejected.

| Deviation | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| **`sharp`** — the only native dependency | FR-067 removed any practical cap on original file size, and SC-013 forbids gallery pages from transferring originals. Something must produce the reduced-size previews, and it must run at upload time so a failure surfaces to the admin immediately (FR-068). | *Serving originals scaled by CSS*: violates SC-013 and makes SC-003's 3s budget unreachable with unbounded originals. *Pure-JS resizing (`jimp`)*: no native code, but markedly slower and lower output quality on large originals. *Deferring previews entirely*: was the prior plan's position and is no longer tenable now that originals are unbounded. Build friction is low in practice: `sharp` installs prebuilt binaries on Windows and Linux, so no local toolchain is required — the constraint that actually matters is preserved. |

No other deviations. No Constitution Check gate failed; the design introduces no additional projects, services, or abstraction layers beyond the repository/service split described above.
