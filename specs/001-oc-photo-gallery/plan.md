# Implementation Plan: OC Photo Gallery Website

**Branch**: `001-oc-photo-gallery` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-oc-photo-gallery/spec.md`

## Summary

A personal gallery site for original characters. Visitors browse a filterable gallery of characters, open a detail page showing each character's images, stories, tags, traits, credits and relationships, view all relationships on one page, and browse every image grouped by artist. All adult content is hidden unless the visitor ticks an opt-in checkbox in the header. A single admin manages all content behind a login.

**Technical approach**: one Express 5 application rendering HTML on the server, backed by an embedded SQLite database, with no client-side framework and no build step. Server rendering is the decisive choice: the spec requires the server itself to refuse NSFW media on direct request (FR-012), which is only reliable when every response — pages *and* image bytes — passes through one gating middleware. Plain `GET` forms give shareable, reloadable filter URLs (FR-018) and keep the site fully operable without JavaScript. See [research.md](./research.md) for the full rationale.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node.js 22 LTS or newer — development on Node 26

**Primary Dependencies**: Express 5 (HTTP), Nunjucks (templates, layout inheritance), `express-session` + SQLite store (admin sessions), `multer` (uploads), `zod` (form validation), `express-rate-limit` (sign-in throttling). Built-ins used deliberately in place of dependencies: `node:sqlite` (database driver), `node:crypto` (`scrypt` password hashing, CSRF tokens), `node:test` (test runner)

**Storage**: SQLite at `data/oc.db` via the built-in `node:sqlite`; uploaded files on disk at `data/uploads/`, served **only** through a gated route, never statically

**Testing**: `node:test` + `node:assert/strict`, with `supertest` for HTTP-level tests against the app; throwaway seeded database per run

**Target Platform**: Node server (Linux or Windows); modern evergreen browsers, functional without JavaScript

**Project Type**: Server-rendered web application (single project)

**Performance Goals**: Gallery and detail pages readable within 3s at 100 characters / 1,000 images (SC-003); filter apply or clear within 1s (SC-004)

**Constraints**: No NSFW byte ever served without opt-in, including direct URL requests (FR-012, SC-001); no build step; no native compilation; usable without horizontal scrolling from 360px to 1920px (SC-009); every interactive control keyboard-operable (SC-006)

**Scale/Scope**: Single admin, anonymous visitors, low hundreds of characters, low thousands of images; 7 public routes, ~30 admin routes, 9 core tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is **an unmodified template** — every principle is still a `[PRINCIPLE_N_NAME]` placeholder, so it defines no ratified, project-specific gates to evaluate against.

**Gate result: PASS (vacuous).** No constitutional constraint is violated because none is defined.

In the absence of ratified principles, the plan holds itself to the template's own default themes:

| Default theme | How this plan responds |
|---|---|
| Simplicity / YAGNI | Single project, no build step, no client framework, no ORM. Four built-in Node modules replace dependencies that would otherwise be added. |
| Test-first | Contracts and the data model are written before implementation; `tasks.md` will order tests ahead of the code they cover. The highest-risk area (NSFW gating) has a dedicated suite. |
| Integration testing | HTTP-level tests via `supertest` cover gating, filter combinations, atomic creation, and delete semantics — the cross-cutting rules where unit tests would miss the real behaviour. |
| Observability | Structured request logging; errors surfaced to the admin with the offending field named (FR-027), never leaking internals to visitors. |
| Versioning | Forward-only ordered SQL migrations recorded in a `schema_migration` table. |

**Recommendation (non-blocking)**: run `/speckit-constitution` to ratify real principles. Until then this gate cannot provide meaningful enforcement, and that is a known gap rather than a passed check.

**Post-Phase 1 re-check**: still PASS. The design added no extra project, no service boundary, and no dependency beyond those listed above; the schema maps directly onto the spec's entities with nothing speculative.

## Project Structure

### Documentation (this feature)

```text
specs/001-oc-photo-gallery/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Phase 0 output - 16 decisions, all unknowns resolved
├── data-model.md                # Phase 1 output - schema, invariants, derived values
├── quickstart.md                # Phase 1 output - setup + 13 validation scenarios
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
│   ├── upload.js                # multer + magic-byte confirmation
│   └── errors.js                # 404/422/500 handlers
├── routes/
│   ├── public/                  # gallery, character, relationships, artists, media, stories
│   └── admin/                   # auth, characters, images, stories, relationships, taxonomy
├── views/                       # Nunjucks: layout.njk, partials/, pages/, admin/
├── public/                      # Static: css/, js/ (progressive enhancement only), img/placeholder
└── lib/                         # slug, url validation, name normalisation, date helpers

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
| [research.md](./research.md) | 16 decisions (R-001…R-016) covering architecture, runtime, storage, templating, NSFW gating, media delivery, delete semantics, auth, CSRF, uploads, uniqueness, filtering, facets, avatar fallback, testing, responsive/accessible approach — plus explicitly deferred items |
| [data-model.md](./data-model.md) | Core tables plus join tables, foreign-key delete actions, 8 cross-cutting invariants, per-request derived values, indexes, migration strategy |
| [contracts/public-routes.md](./contracts/public-routes.md) | 7 visitor routes with parameters, status codes, and the rating rule applied to each |
| [contracts/admin-routes.md](./contracts/admin-routes.md) | Auth, character/image/story/relationship CRUD, taxonomy management, validation and error conventions |
| [quickstart.md](./quickstart.md) | Setup commands, test commands, and 13 manual validation scenarios mapped to requirements |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| NSFW content leaking through a path that skips the gate | Breaks the site's core safety promise (SC-001) | Uploads are never served statically; the sole media path is `GET /media/:id`, which gates by rating. Dedicated `test:nsfw` suite plus manual scenario V-2. |
| Tag/trait delete asymmetry "fixed" into consistency by a later change | Silent data corruption (invalid characters) or a blocked legitimate delete | Encoded as foreign-key actions in the schema, not just application code; called out in the data model, admin contract, and validation scenario V-10. |
| Character/image mutual requirement causing a creation deadlock | Admin cannot add any character at all | Combined form saved in one transaction (FR-049); `avatar_image_id` nullable purely to break the circular insert, set before commit. |
| Full-size images missing the 3s budget at 1,000 images | SC-003 failure | Deferred thumbnail pipeline can be added behind the existing `/media/:id` boundary with no template changes (research, Deferred). |
| `node:sqlite` API gaps | Rework in the data layer | All SQL is confined to `repositories/`; `better-sqlite3` is a drop-in fallback touching only that directory. |

## Complexity Tracking

> No Constitution Check violations to justify — the constitution defines no ratified gates, and the design introduces no additional projects, services, or abstraction layers beyond the repository/service split described above.
