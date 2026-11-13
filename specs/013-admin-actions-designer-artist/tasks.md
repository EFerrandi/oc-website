# Tasks: Prominent Admin Actions and Designer as First-Image Artist

**Input**: Design documents from `/specs/013-admin-actions-designer-artist/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-ui.md, quickstart.md

**Tests**: Included (constitution IV: tests first for the create path). Write tests, confirm they fail, then implement.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup needed: existing project, no new dependencies, no schema change.

## Phase 2: Foundational

No blocking prerequisites. US1 and US2 are independent and touch different files.

---

## Phase 3: User Story 1 - Prominent add buttons on the admin home (Priority: P1)

**Goal**: The three add actions appear before the counts/statistics as large accent-colored buttons.

**Independent Test**: Open `/admin`; the three buttons come first, are large, and wrap on a phone width.

### Tests for User Story 1

- [x] T001 [P] [US1] Write `tests/integration/admin-dashboard-actions.test.js`: GET `/admin` as admin; assert `<nav class="admin-actions" aria-label="Create new content">` contains three `a.btn-action` links (hrefs `/admin/characters/new`, `/admin/images/new`, `/admin/stories/new`), that the nav appears after the `<h1>` and before `admin-counts` and `admin-statistics`, and that the old bottom `chip` links are gone; confirm it fails

### Implementation for User Story 1

- [x] T002 [US1] Edit `src/views/admin/dashboard.njk`: add the `<nav class="admin-actions">` block with the three `btn-action` links directly after the `<h1>`; remove the three `chip` links at the bottom
- [x] T003 [P] [US1] Edit `src/public/css/main.css`: add `.admin-actions` (flex, wrap, gap) and `.btn-action` (large padding and font, `--accent` background, `--accent-ink` text, rounded, visible `:focus-visible` ring, hover state, min 44px touch target, WCAG AA contrast)

**Checkpoint**: T001 passes.

---

## Phase 4: User Story 2 - Designer is also the first image's artist (Priority: P1)

**Goal**: A "Same artist as the designer" checkbox on the new-character form makes the first image's artist the designer.

**Independent Test**: Create a character with a new designer and the box ticked: one artist record exists and the image uses it.

### Tests for User Story 2

- [x] T004 [P] [US2] Write `tests/integration/character-same-artist.test.js` using `withAdminApp`, `csrfFrom` and fixtures: (a) ticked with an existing designer and no image artist → 303, image artist = designer; (b) ticked with a new designer → exactly one new artist row, shared by character and image; (c) ticked with a conflicting `image_artist_id` → ignored, designer used; (d) unticked with no image artist → 422 and nothing saved; (e) ticked with no designer → 422, nothing saved, no files left in the upload dir; (f) redisplay after a 422 keeps the checkbox checked; (g) form renders the checkbox unchecked by default and the image-artist select without HTML `required`; confirm they fail

### Implementation for User Story 2

- [x] T005 [US2] Edit `src/services/characters.js`: in `validateImageInput` accept a `sameAsDesigner` flag that skips image-artist validation; in `validateCharacterInput`/`createCharacterWithImage` read `body.image_artist_same_as_designer === '1'` and use `designerId` as the image artist (reusing `findOrCreateArtist` so a new designer yields one artist record); keep `image_artist_id` required when unticked
- [x] T006 [US2] Edit `src/views/admin/character-new.njk`: add the `image_artist_same_as_designer` checkbox (label "Same artist as the designer", value `1`, checked from `values`) in the First image section; remove HTML `required` from the `image_artist_id` select
- [x] T007 [US2] Check `src/routes/admin/characters.js`: ensure the create route passes the checkbox to the service and that 422 redisplay returns it in `values`; fix if not
- [x] T008 [P] [US2] Edit `src/public/js/enhance.js` (progressive enhancement only): hide the image-artist fields while the box is ticked and show them when unticked; add a `vm`-based test in `tests/integration/enhance.test.js`

**Checkpoint**: T004 passes; the form works with JavaScript disabled.

---

## Phase 5: Polish

- [x] T009 Run `npm test` and `npm run test:nsfw`; fix regressions (existing character-creation tests may assert the old `required` attribute)
- [x] T010 Run `git diff --check`; walk through `specs/013-admin-actions-designer-artist/quickstart.md`; update `README.md` only if it documents the admin home or character form

---

## Dependencies & Execution Order

- US1 and US2 are independent and can be done in either order.
- Within each story: tests (T001 / T004) → implementation.
- T003 is parallel with T002; T008 is parallel with T005–T007.
- Polish runs last.

## Parallel Example

T001 and T004 (different files) can be written together; then T002/T003 and T005–T008 proceed independently.

## Implementation Strategy

MVP is US1 (small, view and CSS only), then US2 (the only logic change). Validate each checkpoint before moving on.
