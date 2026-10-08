# Tasks: ToyHouse-Inspired Home Gallery

**Input**: Design documents from `/specs/004-toyhouse-gallery-home/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/home-gallery.md`, `quickstart.md`

**Tests**: Included. The plan and contract require HTTP-level checks for count gating, removal links, filtering, and accessibility.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format

`- [ ] T### [P?] [US#] Description with file path`

---

## Phase 1: Setup

**Purpose**: Record the baseline before changing the home page.

- [X] T001 Run `npm test`, `npm run test:nsfw`, and `node --test tests/integration/route-audit.test.js`; record baseline results without changing assertions.
- [X] T002 [P] Review current home-page markup and styles in `src/views/pages/gallery.njk`, `src/views/partials/filters.njk`, and `src/public/css/main.css` against `specs/004-toyhouse-gallery-home/contracts/home-gallery.md`.

---

## Phase 2: Foundational

**Purpose**: Establish shared home-page layout hooks used by all stories.

- [X] T003 Add a home-page wrapper and section hooks in `src/views/pages/gallery.njk` for the collection header, filter bar, results bar, and grid, keeping one `<h1>` and existing route data unchanged.
- [X] T004 Add home-page layout tokens and base section spacing in `src/public/css/main.css`, using the existing dark-neutral purple variables and no ToyHouse branding or assets.

**Checkpoint**: The page has stable structural hooks; story work can proceed.

---

## Phase 3: User Story 1 - Scan characters in an image-first grid (Priority: P1) MVP

**Goal**: Show visible characters as uniform square tiles with only avatar, name, and job titles.

**Independent Test**: Open `/` with seeded characters; every tile has the same square thumbnail, name, and job titles, contains one link, and opens the correct character.

### Tests for User Story 1

- [X] T005 [P] [US1] Extend `tests/contract/gallery.test.js` to assert each `.character-tile` has exactly one `/characters/{slug}` link, a thumbnail with `alt`, the name, all job titles, and no gender, tag, or trait text.
- [X] T006 [P] [US1] Extend `tests/integration/accessibility.test.js` to assert the tile grid has at least two columns at narrow widths, square `object-fit: cover` thumbnails, visible tile focus, wrapping text, and reduced-motion handling.

### Implementation for User Story 1

- [X] T007 [US1] Update tile markup in `src/views/pages/gallery.njk` to add `character-tile`, retain avatar or placeholder behavior, render `jobTitles` only when present, and remove no existing character destination.
- [X] T008 [US1] Style `.character-tile` in `src/public/css/main.css` with uniform square thumbnails, name/job title spacing, hover/focus states, long-text wrapping, two-column minimum at 320px, and dense auto-fill columns at wider widths.
- [X] T009 [US1] Run `node --test tests/contract/gallery.test.js tests/integration/accessibility.test.js` and fix US1 regressions.

**Checkpoint**: US1 is independently usable as a modern image-first grid.

---

## Phase 4: User Story 2 - Filter from a compact bar above the grid (Priority: P1)

**Goal**: Keep existing filters in a horizontal bar with collapsible tag and sin/virtue sections, removable active chips, and clear-all.

**Independent Test**: Apply gender and tag filters, confirm results narrow, remove one chip while preserving the other filter, then clear all; all actions work without JavaScript.

### Tests for User Story 2

- [X] T010 [P] [US2] Extend `tests/contract/gallery.test.js` to assert the filter bar is a GET form to `/`, gender and "Apply filters" are visible, tags and sins/virtues use `<details>`, and an active section renders with `open`.
- [X] T011 [P] [US2] Extend `tests/contract/gallery.test.js` to assert every active chip has an accessible removal name, its `removeHref` removes only that exact value, other filters remain, and "Clear all" links to `/`.
- [X] T012 [P] [US2] Extend `tests/integration/accessibility.test.js` to assert filter controls remain labelled, summaries and chips have visible focus, and the filter bar wraps without page-level horizontal scrolling.

### Implementation for User Story 2

- [X] T013 [US2] Add a pure `buildActiveFilters(applied)` helper in `src/routes/public/gallery.js` that returns `{ kind, label, removeHref }` for every applied value, where `kind` is `gender`, `tag`, or `trait` and `removeHref` is `/` plus all current filters except this exact value using `URLSearchParams`.
- [X] T014 [US2] Pass `activeFilters` from `src/routes/public/gallery.js` to `pages/gallery.njk` without changing `listCharacters`, facet queries, query parameter names, or filter semantics.
- [X] T015 [US2] Rebuild `src/views/partials/filters.njk` as a horizontal GET filter bar with labelled gender select, tags and sins/virtues in native `<details>` sections opened only when they contain active filters, and the existing checkbox names and values.
- [X] T016 [US2] Render active-filter chips, accessible removal labels, the empty-state clear link, and "Clear all" in `src/views/pages/gallery.njk`.
- [X] T017 [US2] Style the filter bar, disclosure summaries, checkbox option groups, active chips, empty state, and wrapping behavior in `src/public/css/main.css`.
- [X] T018 [US2] Run `node --test tests/contract/gallery.test.js tests/integration/accessibility.test.js` and fix US2 regressions.

**Checkpoint**: US2 filtering works independently with and without JavaScript.

---

## Phase 5: User Story 3 - Understand the collection at a glance (Priority: P2)

**Goal**: Show the fixed collection header and an NSFW-safe count of rendered characters.

**Independent Test**: Open `/` with and without filters and NSFW enabled; the heading is "Original characters", the fixed introduction is present, and the count equals visible tiles.

### Tests for User Story 3

- [X] T019 [P] [US3] Extend `tests/contract/gallery.test.js` to assert the page has `<h1>Original characters</h1>`, the fixed one-line introduction, singular/plural count text, and count changes when filters reduce results.
- [X] T020 [P] [US3] Extend `tests/integration/nsfw-gating.test.js` to assert the home-page count includes only characters visible without opt-in and reveals no NSFW marker before opt-in.

### Implementation for User Story 3

- [X] T021 [US3] Render the collection header in `src/views/pages/gallery.njk` with fixed heading "Original characters", one fixed generic introduction, and count derived only from `characters.length`.
- [X] T022 [US3] Style the collection header and count in `src/public/css/main.css`, ensuring readable contrast and responsive wrapping.
- [X] T023 [US3] Run `node --test tests/contract/gallery.test.js` and `npm run test:nsfw`; fix US3 regressions without weakening rating assertions.

**Checkpoint**: All three stories are independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Update `README.md` with a brief description of the ToyHouse-inspired home gallery and filter bar.
- [X] T025 Review `src/views/pages/gallery.njk`, `src/views/partials/filters.njk`, and `src/public/css/main.css` against every item in `specs/004-toyhouse-gallery-home/contracts/home-gallery.md`.
- [ ] T026 Run the manual scenarios in `specs/004-toyhouse-gallery-home/quickstart.md` at 320, 768, 1280, and 1920px, including keyboard-only use, JavaScript disabled, contrast, and reduced motion.
- [X] T027 Run `npm test`, `npm run test:nsfw`, and `node --test tests/integration/route-audit.test.js`; all tests must pass.

---

## Dependencies & Execution Order

- Setup (T001–T002) precedes Foundational work.
- Foundational (T003–T004) blocks all stories.
- US1 should complete first as the MVP.
- US2 and US3 depend on Foundational work and edit shared `gallery.njk` and `main.css`; implement them sequentially after US1 to avoid conflicts.
- Polish follows all desired stories.

## Parallel Opportunities

- T002 can run with T001.
- US1: T005 and T006 can be written in parallel.
- US2: T010, T011, and T012 can be drafted in parallel, but T010 and T011 must be merged carefully because they edit the same test file.
- US3: T019 and T020 can be written in parallel.
- T024 can run alongside T025.

## Implementation Strategy

1. Complete Setup and Foundational phases.
2. Deliver US1 and validate the tile grid.
3. Add US2 filtering improvements and validate no-JavaScript behavior.
4. Add US3 header and count, then rerun NSFW checks.
5. Complete polish, manual quickstart checks, and the full test suite.

---

## Phase 7: Convergence

- [X] T028 Render the visible-character count in the results bar of `src/views/pages/gallery.njk` next to the active-filter chips and "Clear all" (results bar shown whenever results or filters are displayed, count derived only from `characters.length`), style it in `src/public/css/main.css`, and extend `tests/contract/gallery.test.js` to assert the results-bar count matches rendered tiles with and without filters per US2/AC4, FR-007, contracts/home-gallery.md section 3 (partial)
