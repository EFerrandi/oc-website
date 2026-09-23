# Tasks: OC Photo Gallery Website

**Input**: Design documents from `specs/001-oc-photo-gallery/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **REQUIRED and test-first for safety-critical areas.** Constitution v1.0.0 Principle IV makes tests mandatory *before* implementation for four areas only â€” rating enforcement, the data invariants (I-1â€¦I-9), deletion semantics, and access control. Tasks covering those are marked **âš ï¸ TEST-FIRST** and their implementation task explicitly depends on the test existing and failing. Everything else still gets tests, but they may be written after the code.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: The user story the task serves (US1â€¦US6)
- Every task names its exact file path

## Path Conventions

Single project at repository root: `src/`, `tests/`, `data/` â€” per the Source Code layout in [plan.md](./plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization. Nothing here depends on the feature's domain.

- [X] T001 Rewrite `package.json`: set `"type": "module"` (currently `"commonjs"` â€” ES modules are assumed throughout the plan), set `"engines": { "node": ">=22" }`, and add scripts `start`, `dev`, `test`, `test:nsfw`, `migrate`, `seed`, `admin:set-password`
- [X] T002 Install runtime dependencies: `npm install express nunjucks express-session multer sharp zod express-rate-limit`. Do **not** add a SQLite driver, a password-hashing library, a CSRF library, or a test runner â€” `node:sqlite`, `node:crypto` and `node:test` replace them per research R-002, R-008, R-009, R-015
- [X] T003 Install dev dependency `supertest` via `npm install --save-dev supertest`
- [X] T004 [P] Create the directory skeleton from plan.md: `src/{db/migrations,repositories,services,middleware,routes/public,routes/admin,views/{partials,pages,admin},public/{css,js,img},lib}` and `tests/{contract,integration,unit,helpers}`
- [X] T005 [P] Create `.gitignore` covering `node_modules/`, `.env`, `data/oc.db*`, `data/uploads/` â€” the password hash, session secret, database and uploads must never be committed (Constitution, Technical Constraints)
- [X] T006 [P] Create `.env.example` with `PORT`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `DATABASE_PATH`, `UPLOAD_DIR`, `PREVIEW_DIR`, `PREVIEW_MAX_EDGE=800`, `MAX_UPLOAD_BYTES=104857600` per quickstart.md
- [X] T007 [P] Implement `src/config.js`: read and validate the above environment variables with `zod`, failing fast at startup with a message naming the missing or invalid key. `MAX_UPLOAD_BYTES` defaults to `104857600` (the 100 MB safety ceiling, FR-067); `PREVIEW_MAX_EDGE` defaults to `800`
- [X] T008 [P] Add a static placeholder avatar image at `src/public/img/placeholder-avatar.svg` for the no-visible-image fallback (FR-014)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The database, gating middleware, and rendering shell that every user story sits on.

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete.

### Database layer

- [X] T009 Implement `src/db/index.js`: open the database via `node:sqlite`, and set `PRAGMA foreign_keys = ON` **and** `PRAGMA journal_mode = WAL` on **every** connection â€” SQLite defaults foreign keys off, and the entire tag/trait delete asymmetry silently stops working if this is missed (data-model.md, research R-007)
- [X] T010 Implement `src/db/migrate.js`: apply ordered `.sql` files from `src/db/migrations/` in filename order, each inside a transaction, recording applied filenames in a `schema_migration` table. Forward-only; no down-migrations
- [X] T011 Write `src/db/migrations/001_initial.sql` creating the taxonomy tables exactly per data-model.md: `gender`, `designer`, `artist`, `tag` (each `name TEXT NOT NULL UNIQUE COLLATE NOCASE`, `created_at TEXT NOT NULL`; `designer`/`artist` add nullable `website_url` and `updated_at`), and `trait` (`name TEXT NOT NULL UNIQUE COLLATE NOCASE` â€” uniqueness on **name alone, not `(name, kind)`**, per FR-059 â€” plus `kind TEXT NOT NULL CHECK (kind IN ('sin','virtue'))`)
- [X] T012 Extend `src/db/migrations/001_initial.sql` with `character`: `name TEXT NOT NULL`, `slug TEXT NOT NULL UNIQUE`, `gender_id` FK â†’ `gender(id)` `ON DELETE RESTRICT`, `short_description TEXT NOT NULL`, `terms_of_use TEXT NOT NULL`, `can_regift`/`can_retrade`/`can_resell` each `INTEGER NOT NULL CHECK (x IN (0,1))`, `designer_id` FK â†’ `designer(id)` `ON DELETE RESTRICT`, `avatar_image_id INTEGER NULL` FK â†’ `image(id)` `ON DELETE SET NULL`, `created_at`/`updated_at TEXT NOT NULL`; plus `character_job_title(character_id FK ON DELETE CASCADE, title TEXT NOT NULL, position INTEGER NOT NULL)` with PK `(character_id, position)`
- [X] T013 Extend `src/db/migrations/001_initial.sql` with `image`: `file_name TEXT NOT NULL UNIQUE`, `preview_file_name TEXT NOT NULL UNIQUE`, `mime_type TEXT NOT NULL` (one of `image/jpeg`, `image/png`, `image/webp`, `image/gif`), `byte_size INTEGER NOT NULL`, `width`/`height INTEGER NOT NULL`, `alt_text TEXT NOT NULL` (non-empty â€” SC-006 requires 100% coverage), `short_description TEXT NULL`, `artist_id INTEGER NOT NULL` FK â†’ `artist(id)` `ON DELETE RESTRICT`, `is_nsfw INTEGER NOT NULL CHECK (IN (0,1)) DEFAULT 0`; and `story`: `title TEXT NOT NULL`, `slug TEXT NOT NULL UNIQUE`, `body TEXT NOT NULL`, `is_nsfw` as above
- [X] T014 Extend `src/db/migrations/001_initial.sql` with `relationship`: `from_character_id`/`to_character_id` FKs â†’ `character(id)` `ON DELETE CASCADE`, `label TEXT NOT NULL`, `is_nsfw INTEGER NOT NULL CHECK (IN (0,1)) DEFAULT 0`, `CHECK (from_character_id <> to_character_id)` (FR-028), plus generated `pair_low`/`pair_high` columns with a unique index on `(pair_low, pair_high, label COLLATE NOCASE)` â€” SQLite has no `LEAST`/`GREATEST`, so this is how the same pair in either direction is blocked (FR-028)
- [X] T015 Extend `src/db/migrations/001_initial.sql` with the four join tables, each with a composite PK. **The delete actions are not uniform and must be copied exactly**: `character_tag` (character â†’ CASCADE, tag â†’ **RESTRICT**), `character_trait` (both â†’ **CASCADE**), `character_image` (both â†’ CASCADE, plus `position INTEGER`), `character_story` (both â†’ CASCADE)
- [X] T016 Extend `src/db/migrations/001_initial.sql` with the indexes listed in data-model.md: `character(gender_id)`, `image(artist_id)`, `is_nsfw` on `image`/`story`/`relationship`, and reverse-lookup indexes on `character_tag(tag_id)`, `character_trait(trait_id)`, `character_image(image_id)`, `character_story(story_id)`, `relationship(from_character_id)`, `relationship(to_character_id)`

### Test harness

- [X] T017 [P] Implement `tests/helpers/db.js`: create a throwaway migrated SQLite database per test run (temp path, deleted afterwards) so no test touches `data/oc.db`
- [X] T018 [P] Implement `tests/helpers/app.js`: build the Express app via the exported factory against a test database, for `supertest` to drive
- [X] T019 [P] Implement `tests/helpers/fixtures.js`: seed a known graph â€” SFW and NSFW images, SFW and NSFW stories, SFW and NSFW relationships, characters with tags/traits/genders, and at least one character whose only images are NSFW (the placeholder-avatar case, FR-014)

### Core middleware and shell

- [X] T020 âš ï¸ **TEST-FIRST** Write `tests/integration/nsfw-gating.test.js` asserting the rating rule before any gating code exists: with no `nsfw` cookie, NSFW rows are absent from every public page; with `nsfw=1`, they appear. Also assert that an absent, empty, or malformed cookie value all resolve to **off** (Constitution I: the safe state is the default). Confirm it FAILS
- [X] T021 Implement `src/middleware/nsfw.js` making T020 pass: parse the `nsfw` cookie, expose a single boolean on `res.locals` used by every query. Treat any value other than exactly `1` as off
- [X] T022 [P] Implement `src/lib/` helpers: `slug.js` (name â†’ unique URL slug), `url.js` (accept only absolute `http`/`https`, used to decide link vs plain text per FR-005), `names.js` (trim and collapse internal whitespace before uniqueness checks, FR-048/FR-059), `dates.js`
- [X] T023 Implement `src/middleware/csrf.js`: a session-bound synchroniser token using `node:crypto`, compared with `timingSafeEqual`, rejecting with `403`. Hand-rolled because `csurf` is deprecated (research R-009)
- [X] T024 Implement `src/middleware/errors.js`: `404`, `422` and `500` handlers. Visitor-facing errors must not expose internals; admin-facing validation errors name the failing field (FR-027, Constitution Technical Constraints)
- [X] T025 Create the Nunjucks shell â€” `src/views/layout.njk` plus `src/views/partials/header.njk` â€” rendering on **every** page the NSFW checkbox in the top-right corner and the admin sign-in entry point immediately to its right (FR-008, FR-019), and `src/public/css/main.css` with a responsive layout usable from 360px to 1920px without horizontal scrolling (FR-033, SC-009)
- [X] T026 Implement `src/app.js` (exported Express app factory, no `listen`) and `src/server.js` (config load, listen, graceful shutdown), wiring session, CSRF, NSFW middleware, static assets, views and the error handlers. `src/public/` is served statically; **`data/uploads/` must never be** (FR-012, research R-006)

**Checkpoint**: Database, gating, and page shell exist. User story work can begin.

---

## Phase 3: User Story 1 â€” Browse the OC gallery and open a character (Priority: P1) ðŸŽ¯ MVP

**Goal**: A visitor sees a gallery of characters and can open any one to view its full details.

**Independent Test**: Seed characters via fixtures, load `/`, confirm avatar/name/job titles render, click through, and confirm every detail section renders with working external credit links.

### Tests for User Story 1

- [X] T027 [P] [US1] Contract test for `GET /` in `tests/contract/gallery.test.js` per contracts/public-routes.md
- [X] T028 [P] [US1] Contract test for `GET /characters/:slug` (including `404` on unknown slug) in `tests/contract/character.test.js`
- [X] T029 [P] [US1] Integration test in `tests/integration/avatar-fallback.test.js` for the three-step effective-avatar rule: designated avatar if visible â†’ else oldest visible linked image â†’ else static placeholder (FR-014, R-014). **Note**: the third step is only fully exercised once T052 renders the placeholder in US2; assert resolution returns "no avatar" here and leave the rendering assertion to T046

### Implementation for User Story 1

- [X] T030 [P] [US1] Implement `src/repositories/credits.js`: artist and designer lookups (shared by several stories; all SQL confined here per the layering rule)
- [X] T031 [P] [US1] Implement `src/repositories/tags.js`, `src/repositories/genders.js`, `src/repositories/traits.js` â€” read paths only at this stage
- [X] T032 [US1] Implement `src/repositories/characters.js`: gallery listing and single-character fetch by slug, applying the rating filter to images, stories and relationships, and resolving the effective avatar (T029 must pass)
- [X] T033 [P] [US1] Implement `src/repositories/images.js` and `src/repositories/stories.js` read paths, both rating-filtered
- [X] T034 [P] [US1] Implement `src/repositories/relationships.js` read path, rating-filtered, returning both characters and the label
- [X] T035 [US1] Implement `src/routes/public/gallery.js` for `GET /` rendering one card per character with avatar, name and **all** job titles (FR-001, FR-002)
- [X] T036 [US1] Implement `src/routes/public/character.js` for `GET /characters/:slug` (FR-003)
- [X] T037 [P] [US1] Create `src/views/pages/gallery.njk` â€” responsive card grid
- [X] T038 [US1] Create `src/views/pages/character.njk` rendering name, gender, description, job titles, tags, traits grouped under separate **Sins** and **Virtues** headings, terms of use, the three permission values, designer credit, images, stories and relationships (FR-003), with an explicit empty state for every section that has no visible content (FR-006)
- [X] T039 [P] [US1] Create `src/views/partials/credit.njk` rendering a designer or artist name as a link opening in a **new tab** when a valid absolute URL exists, and as plain text otherwise (FR-005) â€” used everywhere a credit appears
- [X] T040 [P] [US1] Create `src/views/partials/trait-list.njk` grouping traits under **Sins** and **Virtues**, showing only the populated heading when the other is empty (FR-003, Edge Cases)
- [X] T041 [US1] Implement `GET /stories/:slug` in `src/routes/public/stories.js` with `src/views/pages/story.njk`, rating-gated per contracts/public-routes.md
- [X] T042 [US1] Implement `src/seed.js` and the `npm run seed` script to load the fixture graph into a development database, so the gallery is demonstrable before any admin UI exists

**Checkpoint**: The gallery and detail pages work end to end against seeded data. This is the MVP.

---

## Phase 4: User Story 2 â€” NSFW opt-in gating (Priority: P1)

**Goal**: Adult content is invisible by default and appears only after an explicit opt-in â€” enforced by the server.

**Independent Test**: With the box unticked, confirm zero NSFW items across every public page **and** that requesting an NSFW image or story address directly returns `404`. Tick the box and confirm they appear.

> This is Constitution Principle I, the project's one non-negotiable. Every task here is test-first.

### Tests for User Story 2 âš ï¸ **ALL TEST-FIRST**

- [X] T043 [P] [US2] Extend `tests/integration/nsfw-gating.test.js` with direct-request refusal: an NSFW image's `/media/:id`, `/media/:id/full` and `/images/:id`, plus an NSFW `/stories/:slug`, must **all** return `404` when not opted in â€” and `404`, never `403`, because `403` confirms the item exists (FR-012, contracts/public-routes.md). Confirm it FAILS
- [X] T044 [P] [US2] Write `tests/contract/media.test.js` covering the full status matrix for `GET /media/:imageId` and `GET /media/:imageId/full`: SFW â†’ `200`; NSFW + opted in â†’ `200`; NSFW + not opted in â†’ `404`; unknown id â†’ `404`
- [X] T045 [P] [US2] Write `tests/contract/preferences.test.js` for `POST /preferences/nsfw`: sets a session cookie named `nsfw` with value `1`, **no `maxAge`** so it clears when the browser closes, `sameSite=lax`; unticking clears it
- [ ] T046 [P] [US2] Write `tests/integration/nsfw-placeholder.test.js`: a character whose only images are NSFW still appears in the gallery with the placeholder avatar, and its detail page remains reachable showing SFW information only (FR-014, Clarifications)

### Implementation for User Story 2

- [X] T047 [US2] Implement `src/routes/public/media.js` serving `GET /media/:imageId` (the **preview** copy) and `GET /media/:imageId/full` (the **original**), both applying the identical rating check. This route family is the only path to stored media â€” uploads are never served statically (FR-012, FR-070, research R-006)
- [X] T048 [US2] Set response headers in `src/routes/public/media.js`: `Content-Type` from the stored MIME type, and `Cache-Control: private, no-store` for NSFW images so no shared or proxy cache can serve them to a visitor who has not opted in
- [X] T049 [US2] Implement `POST /preferences/nsfw` in `src/routes/public/preferences.js`, redirecting back to the referring page with filters preserved (FR-035)
- [X] T050 [US2] Add the NSFW checkbox to `src/views/partials/header.njk` as a real form control that submits without JavaScript (FR-008, Constitution III)
- [X] T051 [US2] Apply the rating filter to the read paths in `src/repositories/relationships.js` and `src/repositories/images.js` so NSFW rows are excluded from both (FR-010, FR-013)
- [X] T052 [US2] Render the placeholder in `src/views/pages/gallery.njk` when the effective-avatar resolution from T032 yields none, so an NSFW-only character appears with `placeholder-avatar.svg` rather than being hidden. **Resolution logic belongs to T032; this task is view rendering only** (T046 must pass)
- [X] T053 [US2] Wire `npm run test:nsfw` to execute only the gating suites, so a regression in the project's central promise cannot be buried in a full-suite summary (Constitution IV)
- [ ] T054 [US2] Audit every route added so far and confirm each content-serving path passes through the gate; record the result against quickstart scenario V-2

**Checkpoint**: Rating safety holds across all public surfaces and against direct URL access.

---

## Phase 5: User Story 6 â€” Administer characters, images, and stories (Priority: P2)

**Goal**: The admin can sign in and manage all content.

**Independent Test**: Sign in, create a character with its first image in one step, edit it, add a story and a relationship, and delete something â€” confirming every rule below holds.

> Sequenced ahead of the other P2 stories because it is what allows real content to exist; the remaining stories then have something to filter and group.

### Tests for User Story 6 âš ï¸ **TEST-FIRST (access control, invariants, deletes)**

- [ ] T055 [P] [US6] Write `tests/integration/access-control.test.js`: every `/admin` route and action rejects unauthenticated requests; sign-in throttles repeated failures (`429`); idle sessions expire (FR-020, FR-031, SC-007). Confirm it FAILS
- [ ] T056 [P] [US6] Write `tests/integration/character-creation.test.js` for invariant I-7: character and first image are created atomically. Assert that a failure partway leaves **no** character row, **no** image row, and **no** orphaned file on disk (FR-049, FR-050)
- [ ] T057 [P] [US6] Write `tests/integration/invariants.test.js` covering I-1â€¦I-6: a character cannot end up with zero images, zero tags or zero job titles; an image or story cannot end up linked to zero characters; `avatar_image_id` must reference an image linked to that same character
- [ ] T058 [P] [US6] Write `tests/integration/deletes.test.js` for the **tag/trait asymmetry** â€” the single most fragile rule in the model. Deleting an in-use **tag** must be refused with `409`; deleting an in-use **trait** must **succeed** and detach it from its characters. Both assertions must be present so a later "consistency fix" breaks the suite (FR-041, FR-060, FR-062)
- [ ] T059 [P] [US6] Extend `tests/integration/deletes.test.js` with invariant I-8: deleting a character removes images and stories left with zero links, while preserving any still linked to another character (FR-029)
- [ ] T060 [P] [US6] Write `tests/contract/admin-validation.test.js` for the status conventions in contracts/admin-routes.md: `303` on success, `422` on validation failure with per-field messages, `409` on dependency refusal, `403` on bad CSRF, `401` on bad credentials, `429` when throttled
- [ ] T115 [P] [US6] Write `tests/integration/propagation.test.js`: renaming an artist or designer updates every credit referencing it (FR-047); renaming a trait updates every character carrying it and the gallery filter; **re-classifying a trait from sin to virtue moves it between the `Sins` and `Virtues` headings everywhere it appears** (FR-058, FR-061). These hold automatically because rows are referenced rather than copied â€” the test exists so a future change to copy values is caught immediately

### Authentication

- [X] T061 [US6] Implement `scripts/set-admin-password.js` behind `npm run admin:set-password`: prompt for a password, derive a `scrypt` hash with `node:crypto`, and print it for `.env`. The password is never stored in the database or in source (research R-008)
- [X] T062 [US6] Implement `src/routes/admin/auth.js`: `GET /admin/login`, `POST /admin/login` verifying against `ADMIN_PASSWORD_HASH` with a **timing-safe** comparison, and `POST /admin/logout` (FR-030)
- [X] T063 [US6] Implement `src/middleware/requireAdmin.js` and apply it to every admin route; add `express-rate-limit` on sign-in and a rolling idle timeout on the session (FR-031) â€” T055 must pass
- [X] T064 [US6] Add the admin sign-in entry point to `src/views/partials/header.njk`, positioned immediately to the right of the NSFW checkbox (FR-019)

### Uploads and previews

- [X] T065 [US6] Implement `src/middleware/upload.js`: `multer` disk storage with the `MAX_UPLOAD_BYTES` ceiling, an accept list of `image/jpeg`/`image/png`/`image/webp`/`image/gif`, and **magic-byte confirmation** of the declared type â€” a browser-supplied `Content-Type` is trivially forged (research R-010, Constitution Technical Constraints)
- [X] T066 [US6] Add preview generation to `src/middleware/upload.js` using `sharp`: cap the longest edge at `PREVIEW_MAX_EDGE`, re-encode to WebP, write to `PREVIEW_DIR`, leave the original byte-identical. When the original is already within the cap, **copy it rather than upscaling** (FR-068, FR-069, research R-017)
- [X] T067 [US6] Ensure every upload failure path â€” wrong type, over ceiling, failed preview generation â€” deletes all temporary files and creates no record, returning `422` naming the failure and, for the size case, stating the actual and maximum size (FR-027, FR-067, FR-068)

### Services (invariants and transactions)

- [X] T068 [US6] Implement `src/services/characterService.js`: atomic character + first image creation in one transaction, setting `avatar_image_id` before commit (`avatar_image_id` is nullable *only* to break the circular insert), and enforcing I-1, I-2, I-3, I-6 â€” T056 and T057 must pass
- [X] T069 [US6] Implement the character delete path in `src/services/characterService.js` with the post-delete orphan sweep inside the same transaction: after link rows cascade, remove any image or story left with zero links along with its files, and leave anything still linked untouched (I-8) â€” T059 must pass
- [X] T070 [P] [US6] Implement `src/services/imageService.js`: upload lifecycle, edits, linking to â‰¥1 character (I-4), and deletion removing **both** the original and its preview (I-9). The unlink path must **refuse to remove a character's only remaining image** â€” I-1 is violated on edit, not just on creation, and this is the path where it actually breaks (FR-051)
- [X] T071 [P] [US6] Implement `src/services/storyService.js` enforcing I-5 (a story is always linked to â‰¥1 character)
- [X] T072 [P] [US6] Implement `src/services/relationshipService.js` rejecting self-references and duplicate pair+label in either direction (FR-028)
- [X] T073 [US6] Implement `src/services/taxonomyService.js` with the delete rules exactly as tabulated in contracts/admin-routes.md: `tags` â†’ `409` if in use; `traits` â†’ **succeeds** when in use, detaching from characters; `genders`, `artists`, `designers` â†’ `409` if referenced. Trait uniqueness is on **name alone** so `Greed (sin)` blocks `greed (virtue)` â€” T058 must pass

### Admin routes and views

- [X] T074 [US6] Implement `src/routes/admin/characters.js`: list, the **combined** new-character form including the first image upload, create, edit, update and delete (FR-021, FR-049)
- [X] T075 [P] [US6] Implement `src/routes/admin/images.js` (FR-022) â€” `artist_id` required (FR-042), `alt_text` required, â‰¥1 linked character
- [X] T076 [P] [US6] Implement `src/routes/admin/stories.js` (FR-023)
- [X] T077 [P] [US6] Implement `src/routes/admin/relationships.js` (FR-024)
- [X] T078 [US6] Implement `src/routes/admin/taxonomy.js` serving the shared shape for all five kinds, trimming and collapsing whitespace in names before the case-insensitive uniqueness check (FR-048, FR-059)
- [X] T113 [US6] Implement **inline creation** of taxonomy records from within the content forms in `src/views/admin/_inline-create.njk` and the corresponding handlers: an artist or designer can be created while uploading an image or creating a character (FR-045), and a trait can be created while editing a character (FR-058), each without leaving the form or losing already-entered values. Newly created records are selected immediately. Reuses the same normalisation and uniqueness rules as T078
- [X] T114 [US6] Allow attaching a story during character creation in `src/routes/admin/characters.js` and `src/views/admin/character-form.njk`, so a complete character â€” character, first image, and a story â€” can be published in one pass without a separate follow-up step (SC-005)
- [X] T079 [US6] Build the admin views under `src/views/admin/`, reusing a shared form partial that renders per-field validation messages and re-populates submitted values on `422` (FR-027)
- [X] T080 [US6] Implement a reusable delete-confirmation step in `src/views/admin/_confirm-delete.njk` naming the item, required before **any** deletion; confirmed deletions are permanent (FR-053)
- [X] T081 [US6] Add the avatar designation control to `src/views/admin/character-form.njk`, restricted to images linked to that character (FR-026, I-6)

**Checkpoint**: Full content management works, with every invariant and delete rule enforced.

---

## Phase 6: User Story 3 â€” Filter the gallery by tags, gender, and traits (Priority: P2)

**Goal**: Visitors narrow the gallery by any combination of tags, gender, and traits.

**Independent Test**: Apply each filter alone and in combination, confirm results match, confirm the URL is shareable and reloadable, and confirm selections survive a round trip to a detail page.

### Tests for User Story 3

- [X] T082 [P] [US3] Write `tests/integration/filters.test.js`: filters combine with **AND** semantics; two tags return only characters carrying both
- [X] T083 [P] [US3] Extend `tests/integration/filters.test.js` to assert facet lists are derived from the **currently visible, currently filtered** character set â€” never from the full taxonomy tables â€” so no offered option can ever yield zero results (FR-016, FR-040, FR-056, research R-013)

### Implementation for User Story 3

- [X] T084 [US3] Implement filtered queries in `src/repositories/characters.js` using `GROUP BY â€¦ HAVING COUNT(DISTINCT â€¦) = :n` for AND semantics across repeated `tag=` and `trait=` parameters (research R-012)
- [X] T085 [US3] Implement facet derivation in `src/repositories/characters.js` computing available tags, genders and traits from the visible filtered set (T083 must pass)
- [X] T086 [US3] Extend `src/routes/public/gallery.js` to parse repeated `tag=`, `trait=` and a single `gender=` query parameter, ignoring unknown values rather than erroring
- [X] T087 [US3] Create `src/views/partials/filters.njk` as plain HTML checkbox groups inside a `GET` form, so filtering works without JavaScript and produces shareable, reloadable URLs (FR-018, Constitution III)
- [X] T088 [US3] Preserve tag, gender, trait and NSFW selections in the detail-page back link in `src/views/pages/character.njk` and `src/routes/public/character.js` when returning to the gallery (FR-035)
- [X] T089 [US3] Add a visible "clear filters" control to `src/views/partials/filters.njk` and an explicit empty state in `src/views/pages/gallery.njk` when a combination matches nothing

**Checkpoint**: Filtering works, combines correctly, and survives navigation.

---

## Phase 7: User Story 4 â€” Relationship overview page (Priority: P2)

**Goal**: One page showing all relationships, split into an SFW card and an NSFW card.

**Independent Test**: Load `/relationships` with the box unticked and confirm only the SFW card is populated; tick it and confirm the NSFW card appears.

### Tests for User Story 4

- [X] T090 [P] [US4] Write `tests/contract/relationships.test.js` for `GET /relationships` per contracts/public-routes.md, asserting the NSFW card is absent entirely when not opted in (FR-013)

### Implementation for User Story 4

- [X] T091 [US4] Implement `src/routes/public/relationships.js` returning relationships partitioned into SFW and NSFW groups
- [X] T092 [US4] Create `src/views/pages/relationships.njk` with a dedicated SFW card and a dedicated NSFW card, each entry showing both character names, the label, and links to both detail pages (FR-007)
- [X] T093 [US4] Show an explicit empty state per card in `src/views/pages/relationships.njk` when a group has no entries (FR-006)

**Checkpoint**: The relationship overview works and respects the rating gate.

---

## Phase 8: User Story 5 â€” Browse all images grouped by artist (Priority: P3)

**Goal**: A page listing every visible image grouped under its artist.

**Independent Test**: Load `/artists`, confirm each visible image appears exactly once under exactly one artist, and that artists with no visible images are absent entirely.

### Tests for User Story 5

- [X] T094 [P] [US5] Write `tests/contract/artists.test.js` for `GET /artists`: each visible image appears exactly once under exactly one group (SC-011), and an artist whose images are all NSFW is omitted **entirely** when not opted in (FR-037)

### Implementation for User Story 5

- [X] T095 [US5] Implement artist grouping in `src/repositories/images.js`, returning only artists having â‰¥1 visible image
- [X] T096 [US5] Implement `src/routes/public/artists.js` for `GET /artists`
- [X] T097 [US5] Create `src/views/pages/artists.njk` grouping images by artist, each group headed by the artist credit partial (new tab, or plain text when no valid link), with each image linking to a linked character's detail page (FR-036, FR-038)

**Checkpoint**: All six user stories are independently functional.

---

## Phase 9: Previews and Click-to-Enlarge (Cross-Cutting)

**Purpose**: FR-063â€“FR-070 span every page that displays an image, so they are completed once all image surfaces exist rather than repeated per story.

- [ ] T098 [P] Write `tests/integration/previews.test.js`: gallery, detail and artists pages request **only** `/media/:id` and never `/media/:id/full`, so page weight is independent of original size (FR-063, SC-013)
- [X] T099 Create `src/views/partials/image-preview.njk` rendering every image as a preview wrapped in an anchor whose `href` is `/images/:id` â€” a real link, so enlarging works with JavaScript unavailable (FR-065)
- [X] T100 Replace every direct image rendering in the gallery, character and artists views with the `image-preview.njk` partial (FR-063)
- [X] T101 Implement `GET /images/:imageId` in `src/routes/public/images.js` with `src/views/pages/image.njk`: the standalone full-size view, rating-gated, showing alt text, short description, artist credit and links back to each linked character
- [X] T102 Implement `src/public/js/lightbox.js` (~40 lines, no framework): intercept preview anchor clicks, show the original in an overlay dialog, close on both a visible control and **Escape**, and return keyboard focus to the preview that opened it (FR-064, FR-066)
- [ ] T103 Verify the overlay is keyboard-operable end to end and that removing the script leaves navigation to `/images/:id` fully working (SC-014, Constitution III)

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T104 [P] Write `tests/unit/` coverage for `src/lib/` helpers and the `zod` validation schemas â€” slug generation, URL acceptance, whitespace-collapsing name normalisation
- [ ] T105 [P] Add structured request logging in `src/middleware/logging.js`, ensuring visitor-facing errors in `src/middleware/errors.js` never leak internals (Constitution Technical Constraints)
- [ ] T106 Verify SC-003 and SC-004 against a seeded set of 100 characters and 1,000 images: gallery and detail pages readable within 3 seconds, filter apply or clear within 1 second
- [ ] T107 [P] Confirm every rendered image carries non-empty alt text and every interactive control is keyboard-reachable with a visible focus indicator (SC-006)
- [ ] T108 [P] Verify no horizontal scrolling from 360px to 1920px across all pages including admin screens (SC-009, FR-033)
- [ ] T109 Write `README.md` setup instructions and confirm `quickstart.md` is accurate end to end
- [ ] T110 Execute all 14 quickstart validation scenarios V-1â€¦V-14 and record the results
- [ ] T111 Re-verify Constitution Principle I against the finished route table: enumerate every route that serves stored content and confirm each one gates. Principle I mandates this re-check whenever such a route is added
- [ ] T112 Remove the Sync Impact Report comment from the top of `.specify/memory/constitution.md` before committing â€” it is review scratch, not governance content

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup â€” **blocks every user story**
- **US1 (Phase 3)** and **US2 (Phase 4)**: both P1; depend only on Foundational
- **US6 (Phase 5)**: sequenced next because it produces the content the remaining stories operate on
- **US3 (Phase 6)**, **US4 (Phase 7)**, **US5 (Phase 8)**: depend only on Foundational; mutually independent
- **Phase 9**: requires every image surface to exist (US1, US5, US6)
- **Phase 10**: requires all desired stories complete

### Critical Path

T001 â†’ T009 â†’ T011â€“T016 â†’ T020/T021 â†’ T026 â†’ T032 â†’ T035/T036 â†’ *MVP*

### Within Each User Story

- âš ï¸ TEST-FIRST tasks must be written and **failing** before their implementation task begins
- Repositories â†’ services â†’ routes â†’ views
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup: T004â€“T008 all parallel
- Foundational: test harness T017â€“T019 parallel; `src/lib/` helpers T022 independent
- US1: repositories T030/T031/T033/T034 parallel; view partials T037/T039/T040 parallel
- US2: all four test tasks T043â€“T046 parallel
- US6: all six test tasks T055â€“T060 parallel, plus T115; services T070â€“T072 parallel; admin routes T075â€“T077 parallel
- Once Foundational completes, US3, US4 and US5 can proceed concurrently with US6

---

## Parallel Example: User Story 6 Tests

```bash
# Write all six safety-critical test files together, before any admin code:
Task: "Access control tests in tests/integration/access-control.test.js"
Task: "Atomic creation tests in tests/integration/character-creation.test.js"
Task: "Invariant tests I-1..I-6 in tests/integration/invariants.test.js"
Task: "Tag/trait delete asymmetry in tests/integration/deletes.test.js"
Task: "Orphan sweep I-8 in tests/integration/deletes.test.js"
Task: "Admin status conventions in tests/contract/admin-validation.test.js"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup
2. Phase 2 Foundational â€” **blocks everything**
3. Phase 3 User Story 1
4. **STOP and VALIDATE**: browse the seeded gallery and detail pages independently

### Incremental Delivery

1. Setup + Foundational â†’ foundation ready
2. **+ US1** â†’ gallery and detail pages â†’ **MVP**
3. **+ US2** â†’ rating safety complete; the site is now safe to show anyone
4. **+ US6** â†’ real content can be created without touching fixtures
5. **+ US3 / US4 / US5** â†’ filtering, relationships, artists (parallelisable)
6. **+ Phase 9** â†’ previews and click-to-enlarge across all image surfaces
7. **+ Phase 10** â†’ polish and full quickstart validation

> Do not demo publicly before US2 is complete. Until rating gating exists, adult content is served to everyone â€” the one failure Constitution Principle I calls unrecoverable.

---

## Notes

- `[P]` = different files, no dependency on incomplete work
- âš ï¸ TEST-FIRST tasks are mandated by Constitution IV; the rest may be tested after implementation
- Verify each test fails before implementing against it â€” a test that never failed proves nothing
- Commit after each task or logical group
- The tag/trait delete asymmetry (T015, T058, T073) is the rule most likely to be "fixed" into a bug; it is encoded in the schema **and** locked by tests for exactly that reason
- **T113â€“T115 were added after `/speckit-analyze`** and are placed in their correct execution position within Phase 5 despite their higher numbers. IDs were not renumbered because roughly forty tasks reference each other by ID ("T029 must pass"), and renumbering would silently break those references
