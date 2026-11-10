# Tasks: Gallery and Admin Enhancements

**Input**: Design documents from `specs/005-gallery-admin-enhancements/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/gallery-admin-enhancements.md`, `quickstart.md`

**Tests**: Required by the plan and project constitution for migrations, data invariants, authorization, upload atomicity, and NSFW gating. Add the relevant failing tests before implementation.

**Organization**: Tasks are grouped by user story. Shared, story-blocking migration work is in the foundational phase.

## Phase 1: Setup

**Purpose**: Verify the current baseline and protect existing behavior before schema changes.

- [X] T001 Run `npm test` and `npm run test:nsfw` from `package.json`; record the baseline and investigate any pre-existing failures without weakening assertions. Baseline: 186/186 standard tests and 40/40 NSFW tests passed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish reusable legacy-schema fixtures for the story-specific forward-only migrations.

- [X] T002 [P] Add migration test fixtures for a legacy schema with duplicate designer/artist names, conflicting URLs, overlapping tags/traits, and duplicate associations in `tests/helpers/migrations.js`.

**Checkpoint**: A disposable legacy database can be created consistently for migration regression tests.

---

## Phase 3: User Story 1 - Manage artists in one place (Priority: P1)

**Goal**: Use one canonical artist identity for character design credits and image credits, with one public Artists destination.

**Independent Test**: Create a character design credit and image credit for the same artist; confirm both resolve to one artist and the public Artists page lists that artist once, including design-only artists.

### Tests for User Story 1

- [X] T003 [P] [US1] Add migration tests for normalized identity matching, URL precedence, preserved credits, idempotence, duplicate normalized rows, and foreign-key integrity in `tests/integration/migrations.test.js`.
- [X] T004 [P] [US1] Add integration tests for unified artist administration, duplicate-name rejection, design-credit propagation, and artist deletion restrictions in `tests/integration/admin.test.js`, `tests/integration/propagation.test.js`, and `tests/unit/taxonomy.test.js`.
- [X] T005 [P] [US1] Add public contract tests that design-only artists and artists with images appear once, and artwork remains NSFW-filtered, in `tests/contract/artists.test.js`.

### Implementation for User Story 1

- [X] T006 [US1] Implement the forward-only creator consolidation migration in `src/db/migrations/002_unify_designers_and_artists.sql`, preserving existing artist IDs/URLs where names match, copying a designer URL only when the matching artist URL is empty, creating artists for unmatched designers, and repointing all character design credits before removing the designer taxonomy.
- [X] T007 [US1] Update `src/repositories/credits.js` to remove designer queries and return canonical artist records, including artists with either character design credits or visible images.
- [X] T008 [US1] Update `src/repositories/characters.js` to load the design credit from `artist` and expose canonical artist name and website URL.
- [X] T009 [US1] Update `src/services/characters.js` to validate and save `artist_id` for character design credits while preserving existing character invariants and validation errors.
- [X] T010 [US1] Update `src/services/taxonomy.js` and `src/routes/admin/taxonomy.js` to remove designer CRUD and retain one artist taxonomy with case-insensitive name/URL validation and delete protection for both image and character credits.
- [X] T011 [US1] Update `src/views/admin/partials/character-fields.njk`, `src/views/admin/taxonomy.njk`, and `src/views/admin/characters-list.njk` to select and display the character's canonical artist instead of a designer.
- [X] T012 [US1] Update `src/repositories/credits.js`, `src/routes/public/artists.js`, and `src/views/pages/artists.njk` so the Artists page lists each canonical artist once and includes design-credit artists with no visible images.
- [X] T013 [US1] Update `src/views/partials/header.njk` and `src/views/admin/layout.njk` to expose one Artists destination and remove any separate designer navigation entry.

**Checkpoint**: Designer and image credits share one manageable artist identity and one public destination.

---

## Phase 4: User Story 2 - Create an artist while uploading an image (Priority: P1)

**Goal**: Allow the admin to select an existing artist or create one during an image upload, without leaving the upload form.

**Independent Test**: Upload an image while creating an artist; verify the image credit points to the new artist. Submit invalid or duplicate artist data and confirm no image, artist, or stored file is left behind.

### Tests for User Story 2

- [X] T014 [P] [US2] Add upload integration tests for inline artist creation, existing-artist selection, duplicate artist names, invalid website URLs, transaction rollback, and file cleanup in `tests/integration/admin.test.js`.

### Implementation for User Story 2

- [X] T015 [US2] Update `src/views/admin/image-new.njk` with existing-artist selection and inline new-artist name/optional website fields, preserving submitted values and field errors.
- [X] T016 [US2] Update `src/routes/admin/images.js` to validate selected-or-new artist fields, repopulate form options after errors, and pass form input to the image-record service.
- [X] T017 [US2] Update `src/services/image-records.js` to create a new artist and image record atomically, reject normalized duplicate artist names with a field-specific error, and remove stored files/previews if the transaction fails.
**Checkpoint**: New artist and image are saved together, or neither is saved.

---

## Phase 5: User Story 3 - Choose genders and tags with tappable bubbles (Priority: P1)

**Goal**: Replace visible checkbox/select presentation for gender and tags with accessible centered-text bubbles everywhere those values are selected or filtered; treat former sins and virtues as ordinary tags.

**Independent Test**: Use keyboard and pointer to select one gender and multiple tags in public filters and admin character forms; verify state, submitted values, and resulting character set with JavaScript disabled.

### Tests for User Story 3

- [X] T018 [P] [US3] Add failing migration tests that preserve every character-trait membership as a deduplicated tag association and verify migration idempotence in `tests/integration/migrations.test.js`.
- [X] T019 [P] [US3] Add contract tests for gender and tag bubble markup, selected state, form names/values, and preserved public filter semantics in `tests/contract/gallery.test.js`.
- [X] T020 [P] [US3] Add admin integration tests for selecting required tags, adding former sin/virtue values as ordinary tags, and single gender selection in `tests/integration/admin.test.js`.
- [X] T021 [P] [US3] Add accessibility tests for keyboard-operable radio/checkbox inputs styled as bubbles, visible focus/selected states, wrapping, and no-JavaScript operation in `tests/integration/accessibility.test.js`.

### Implementation for User Story 3

- [X] T022 [US3] Implement the forward-only trait-to-tag migration in `src/db/migrations/003_traits_to_tags.sql`, merging names case-insensitively, preserving all character associations, deduplicating membership links, and removing the obsolete trait taxonomy only after verification.
- [X] T023 [US3] Update `src/repositories/tags.js` and `src/repositories/characters.js` to use only the unified tag taxonomy for character labels, facets, filtering, and profile values; remove trait joins and trait filter semantics.
- [X] T024 [US3] Update `src/services/characters.js` to validate all former sin/virtue values as tag IDs, preserve the required minimum of one tag, and remove trait-specific validation and persistence.
- [X] T025 [US3] Update `src/services/taxonomy.js`, `src/routes/admin/taxonomy.js`, and `src/views/admin/taxonomy.njk` to remove the separate traits/sins/virtues taxonomy and manage those labels as ordinary reusable tags.
- [X] T026 [US3] Update `src/views/partials/filters.njk` to render gender as a single-select radio bubble group and tags as a multi-select checkbox bubble group, retaining GET parameter names `gender` and `tag`.
- [X] T027 [US3] Update `src/views/admin/partials/character-fields.njk` to render gender as a single-select bubble group and required tags as multi-select bubbles, removing the separate Sins & Virtues fieldset.
- [X] T028 [US3] Update `src/public/css/main.css` so bubble labels center their text, visibly reflect checked/selected state, expose focus indicators, wrap at narrow widths, and do not display checkbox squares.
- [X] T029 [US3] Update `src/routes/public/gallery.js` and related public filter templates to remove the separate `trait` parameter while retaining shareable gender/tag filter URLs and AND semantics for multiple tags.

**Checkpoint**: Gender/tag selection and filtering use bubbles across public and admin pages; former sins and virtues are ordinary reusable tags.

---

## Phase 6: User Story 4 - See character tags and private ownership in the intended locations (Priority: P1)

**Goal**: Put character tags in the upper-right of the profile, display ownership at the bottom, and omit ownership entirely for non-admin visitors.

**Independent Test**: Compare anonymous and authenticated-admin HTML for the same character; tags appear upper-right in both, Relationships precede Stories, ownership appears only for admin and at the bottom.

### Tests for User Story 4

- [X] T030 [P] [US4] Add HTTP tests proving ownership values are absent anonymously and present for admins in `tests/contract/character.test.js` and `tests/integration/character-profile.test.js`.
- [X] T031 [P] [US4] Add contract/accessibility assertions for profile tags and section order in `tests/contract/character.test.js`.

### Implementation for User Story 4

- [X] T032 [US4] Update `src/routes/public/character.js` and `src/repositories/characters.js` to load ownership only when `res.locals.isAdmin` is true.
- [X] T033 [US4] Update `src/views/pages/character.njk` to place tags in the profile summary and render ownership/terms/permissions at the end for authenticated admins only.
- [X] T034 [US4] Update `src/public/css/main.css` to right-align and wrap profile tags responsively while preserving reading order on narrow screens.

**Checkpoint**: Public HTML contains no ownership data; admins see ownership at the bottom of the profile.

---

## Phase 7: User Story 5 - Review image statistics in the admin dashboard (Priority: P1)

**Goal**: Show association-based image totals and rating breakdowns, SFW/NSFW percentages, and a per-character pie chart with an accessible table.

**Independent Test**: With SFW and NSFW fixtures including a shared image, compare all displayed counts, percentages, and chart values to the image-character associations; verify anonymous access is denied.

### Tests for User Story 5

- [X] T035 [P] [US5] Add repository tests for overall and per-character total/SFW/NSFW association counts, shared images, and zero-count percentages in `tests/unit/image-statistics.test.js`.
- [X] T036 [P] [US5] Add admin HTTP tests that dashboard counts and chart data are visible to admins but absent to anonymous visitors in `tests/integration/admin.test.js`.
- [X] T037 [P] [US5] Add accessibility tests for the pie chart's accessible name and equivalent readable table in `tests/integration/accessibility.test.js`.

### Implementation for User Story 5

- [X] T038 [US5] Add `src/repositories/image-statistics.js` with aggregate queries counting `character_image` associations by character and rating, plus overall totals.
- [X] T039 [US5] Update `src/routes/admin/dashboard.js` to calculate percentages, handle zero totals, and provide exact chart counts.
- [X] T040 [US5] Update `src/views/admin/dashboard.njk` to show overall and per-character counts, percentages, an SVG pie chart, and an equivalent accessible table.
- [X] T041 [US5] Update `src/public/css/main.css` to style the responsive statistics summary, chart, and per-character table.

**Checkpoint**: Authenticated admins can audit association-based counts and percentages; anonymous users cannot access the dashboard data.

---

## Phase 8: User Story 6 - Read relationships before stories and crop an avatar (Priority: P2)

**Goal**: Ensure Relationships precede Stories and let admins save a character-specific square avatar crop without modifying the source image.

**Independent Test**: Save different square crops for two characters sharing an image; verify each crop persists independently, source bytes remain unchanged, and the profile uses the correct crop.

### Tests for User Story 6

- [X] T042 [P] [US6] Add tests for centered crop defaults, validation/bounds, per-character persistence with a shared image, and unchanged image records in `tests/integration/admin.test.js` and `tests/integration/migrations.test.js`.
- [X] T043 [P] [US6] Add accessibility tests for labelled crop controls, keyboard-operable range inputs, responsive preview, and regular-form saving in `tests/integration/accessibility.test.js`.
- [X] T044 [P] [US6] Add a contract assertion that Relationships precedes Stories in character document order in `tests/contract/character.test.js`.

### Implementation for User Story 6

- [X] T045 [US6] Add crop position/zoom columns with numeric bounds and centered defaults in `src/db/migrations/004_character_avatar_crop.sql`.
- [X] T046 [US6] Update `src/services/characters.js` to validate and persist crop values while retaining avatar ownership validation.
- [X] T047 [US6] Update avatar and character repositories to return crop settings only for the designated visible avatar and use centered fallback crops.
- [X] T048 [US6] Update `src/views/pages/character.njk` to render Relationships before Stories in document/source order.
- [X] T049 [US6] Update `src/views/admin/character-edit.njk` with square-crop controls and a preview that preserves entered values after validation errors.
- [X] T050 [US6] Update `src/public/js/enhance.js` and `src/views/admin/character-edit.njk` with optional live crop preview and standard form saving without JavaScript.
- [X] T051 [US6] Update character/gallery templates and `src/public/css/main.css` to render character-specific square crops without changing source files or bypassing the media gate.

**Checkpoint**: Relationships are shown before Stories, and a saved square crop affects only one character's avatar presentation.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validate all migrations, public/admin behavior, accessibility, and documentation end-to-end.

- [X] T052 [P] Update `README.md` with the unified artist/tag model, migration note, and dashboard image-statistics description.
- [X] T053 Run the automated validation scenarios in `specs/005-gallery-admin-enhancements/quickstart.md`; verify migrations, public/admin behavior, accessibility, uploads, stats, and crops without weakening assertions.
- [X] T054 Run `npm test`, `npm run test:nsfw`, `node --test tests/integration/route-audit.test.js`, and `git diff --check`; resolve all failures and whitespace errors.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; creates only the reusable migration fixture, not a feature schema change.
- **User Stories (Phase 3+)**: Each migration is implemented and validated with the story that consumes the resulting schema.
- **Polish (Phase 9)**: Depends on all selected stories.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; establishes the canonical artist data model and one Artists destination.
- **US2 (P1)**: Depends on US1's artist service/repository contract and uses the canonical artist table.
- **US3 (P1)**: Depends on US1's ordered migration slot for migration `003`; then uses the unified tag schema and is independent of upload UI.
- **US4 (P1)**: Depends on US1 for displaying the canonical design artist and US3 for the final tag view. Its independent ownership and section-order work can proceed once Phase 2 is complete.
- **US5 (P1)**: Can start after Phase 2; statistics use existing image-character associations and are otherwise independent.
- **US6 (P2)**: Can start after Phase 2; crop editing uses the existing character edit flow and resolved avatar. It shares profile templates/CSS with US4, so those files must be integrated sequentially.

### Within Each User Story

- Add safety-critical and contract tests before implementation; verify they fail for the intended missing behavior.
- Complete migration tasks before code paths that depend on the resulting schema.
- Keep tasks touching the same file sequential.
- Run that story's test files at its checkpoint before starting dependent stories.

### Parallel Opportunities

- T002 can run alongside T001.
- US1: T006 and T007 can be authored in parallel; repository and view changes must be coordinated after tests.
- US2: test authoring T015 can run independently from unrelated US3/US5 tests, but upload service and route/template integration is sequential.
- US3: T020–T022 can be authored in parallel; repository/service/template/CSS changes touch shared files and should be sequenced.
- US4: T030 and T031 can be authored in parallel; profile template/CSS work is sequential with US6.
- US5: T035–T037 can be authored in parallel; query, route, and template implementation follows the tests.
- US6: T042 and T043 can be authored in parallel; migration precedes persistence/repository/template work.
- T050 can run alongside final test triage only after implementation paths are stable.

## Parallel Example: User Story 5

```text
Task: Add aggregate-count tests in tests/unit/image-statistics.test.js
Task: Add dashboard authorization tests in tests/integration/admin-pages.test.js
Task: Add chart accessibility tests in tests/integration/accessibility.test.js
```

## Implementation Strategy

### MVP First

Complete setup and taxonomy migrations, then deliver **US1** as the first independently testable increment: one canonical artist identity and one Artists destination. Validate migration preservation and artist deletion protections before proceeding.

### Incremental Delivery

1. Complete baseline and forward-only artist/tag migrations.
2. Deliver US1, then US2 so inline upload uses the canonical artist identity.
3. Deliver US3 to convert all public/admin gender and tag selection to accessible bubbles.
4. Deliver US4 and US5 as independently testable profile/privacy and dashboard increments.
5. Deliver US6, integrating profile files sequentially with US4.
6. Run the full quickstart and test suites.

## Notes

- All tasks use the required checkbox, sequential ID, optional `[P]`, story label for story phases, and an exact repository file path.
- Story task counts include test and implementation tasks; setup/foundational/polish tasks are counted separately.
- Migrations are kept with the story that consumes them: artist consolidation precedes the trait-to-tag migration, and each story completes its related repository/service changes before its checkpoint.
- No dependencies or client-side framework are introduced.
