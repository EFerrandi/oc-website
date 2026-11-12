# Tasks: Fix Listing Text Overlap and Chart Rating Colors

**Input**: Design documents from `specs/006-fix-listing-and-chart-colors/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-changes.md

**Tests**: Included, per the plan's test-first gate (constitution principle IV).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup or foundational work is needed; no new dependencies, schema, or routes.

---

## Phase 2: User Story 1 - Read character name and jobs in the listing (Priority: P1) ðŸŽ¯ MVP

**Goal**: The avatar never paints over the name and job titles in the listing.

**Independent Test**: Render `/` with a zoomed avatar; the image sits inside a clipping square frame and the name/jobs follow it.

### Tests for User Story 1

- [X] T001 [P] [US1] Add a contract test in `tests/contract/gallery.test.js` asserting each tile has `.card-thumb-frame` containing the `img.card-thumb` (also for the placeholder avatar), followed by `.card-body` with `.card-name`; keep the existing assertions. Verify it fails first.
- [X] T002 [P] [US1] Add a CSS assertion in `tests/integration/accessibility.test.js` that `.character-tile .card-thumb-frame` declares `overflow: hidden` and `aspect-ratio: 1 / 1`; keep the existing `.character-tile .card-thumb` assertion intact. Verify it fails first.

### Implementation for User Story 1

- [X] T003 [US1] In `src/views/pages/gallery.njk`, wrap both the avatar `<img class="card-thumb">` and the placeholder `<img>` in `<div class="card-thumb-frame">`, keeping the inline crop styles on the image.
- [X] T004 [US1] In `src/public/css/main.css`, add `.character-tile .card-thumb-frame` (`overflow: hidden; aspect-ratio: 1 / 1; position: relative`), keep `.character-tile .card-thumb` with `aspect-ratio: 1 / 1` and `object-fit: cover`, and keep `.card-body` stacked after the frame (name and jobs wrap with `overflow-wrap: anywhere`).

**Checkpoint**: Listing tiles show name and jobs on every viewport; crops still apply.

---

## Phase 3: User Story 2 - Distinguish SFW and NSFW in the statistics chart (Priority: P2)

**Goal**: The dashboard pie chart uses one color for SFW and another for NSFW, per character slice, with a legend.

**Independent Test**: Open `/admin` with mixed-rating data; SFW and NSFW arcs carry distinct classes and a legend is shown.

### Tests for User Story 2

- [X] T005 [P] [US2] In `tests/integration/admin.test.js`, add assertions that the dashboard has `statistics-sfw` and `statistics-nsfw` circles, titles like `Name: 3 SFW images`, a legend listing SFW and NSFW, no `statistics-color-` classes, and no arc for a zero count; keep the existing dashboard assertions. Verify it fails first.
- [X] T006 [P] [US2] In `tests/integration/accessibility.test.js` (or `admin.test.js`), assert the CSS defines different stroke colors for `.statistics-sfw` and `.statistics-nsfw`, and that both differ from `.statistics-chart-background`.

### Implementation for User Story 2

- [X] T007 [US2] In `src/routes/admin/dashboard.js`, build `imageStatistics.chart` as per-character SFW then NSFW arcs (`name`, `rating`, `count`, `percentage = count / totals.total * 100`, cumulative `offset`), omitting zero-count arcs, and remove `colorIndex`.
- [X] T008 [US2] In `src/views/admin/dashboard.njk`, render each arc with `statistics-slice statistics-{{ rating }}` and a `<title>` such as `Name: 3 SFW images`; update the chart `<desc>`; add a legend (`<ul class="statistics-legend">` with swatches and the text "SFW" and "NSFW"). Leave the table and totals unchanged.
- [X] T009 [US2] In `src/public/css/main.css`, replace `.statistics-color-0..7` with `.statistics-sfw` and `.statistics-nsfw` strokes (two clearly different colors, distinct from `--surface-2`), and add legend and swatch styles that wrap on narrow screens.

**Checkpoint**: Chart and legend distinguish ratings; table and totals unchanged.

---

## Phase 4: Polish

- [X] T010 Run `npm test` and `npm run test:nsfw`; fix any regressions.
- [X] T011 Run the manual checks in `specs/006-fix-listing-and-chart-colors/quickstart.md` (320px, 768px and 1280px listing; dashboard colors and legend) and `git diff --check`.

---

## Dependencies & Execution Order

- US1 and US2 are independent; both edit `src/public/css/main.css`, so T004 and T009 run sequentially.
- Within each story, tests (T001/T002, T005/T006) come before implementation.
- Polish follows both stories.

## Parallel Opportunities

- T001 and T002 together; T005 and T006 together.
- T003 and T007/T008 touch different files and can run in parallel.

## Implementation Strategy

- MVP is US1 (the visible bug), then US2, then polish.
