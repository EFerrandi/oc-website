# Tasks: Merged Rating Chart and Prefilled Permissions on Edit

**Input**: Design documents from `specs/008-chart-rating-merge-and-permissions-prefill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-changes.md

**Tests**: Included, per the plan's test-first gate (constitution principle IV).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup or foundational work is needed; no new dependencies, schema or routes.

---

## Phase 2: User Story 1 - Two continuous rating colors in the statistics chart (Priority: P1) 🎯 MVP

**Goal**: The chart shows one SFW region and one NSFW region sized from the overall totals.

**Independent Test**: Render `/admin` with several characters; the chart has at most two `circle.statistics-slice` elements, SFW then NSFW, titled `SFW: N images` and `NSFW: N images`.

### Tests for User Story 1

- [X] T001 [US1] Update the 006 chart assertions in `tests/integration/admin.test.js`: expect exactly two `circle.statistics-slice` (`statistics-sfw` then `statistics-nsfw`) titled `SFW: N images` and `NSFW: N images` whose lengths match `totals.sfw` / `totals.nsfw` over `totals.total`; drop the per-character title patterns (`<title>Name: N SFW images</title>`, no `: 0 SFW images`); keep the `aria-labelledby`, caption, legend, table, `<strong>4</strong>`, 50%/50% and no `statistics-color-` assertions. Add cases: only SFW images gives one arc; no images gives none. Verify they fail first.
- [X] T002 [P] [US1] Check `tests/integration/accessibility.test.js` still asserts the distinct `.statistics-sfw` / `.statistics-nsfw` strokes; adjust only if it references per-character arcs.

### Implementation for User Story 1

- [X] T003 [US1] In `src/routes/admin/dashboard.js`, build `chart` as at most two arcs from `totals.sfw` and `totals.nsfw` over `totals.total` (SFW first, zero arcs omitted, empty when total is 0), using the existing `stroke-dasharray`/`stroke-dashoffset` geometry (`r=15.9155`).
- [X] T004 [US1] In `src/views/admin/dashboard.njk`, render the arcs with classes `statistics-slice statistics-sfw|statistics-nsfw` and titles `SFW: N images` / `NSFW: N images`; keep the legend, table, description and totals unchanged.

**Checkpoint**: T001â€“T002 pass.

---

## Phase 3: User Story 2 - Permissions are prefilled when editing a character (Priority: P1)

**Goal**: Saved permissions show as selected on the edit form, survive a 422 redisplay and an unchanged save; the creation form preselects nothing.

**Independent Test**: Open the edit form of a character with `can_regift=1`, `can_retrade=0`; the matching radios are `checked`.

### Tests for User Story 2

- [X] T005 [US2] In `tests/integration/admin.test.js`, add failing tests: (a) the edit form checks the saved radio for each of `can_regift`, `can_retrade`, `can_resell`, including a stored `0` ("Not allowed"); (b) posting the edit with other fields changed but the same permissions leaves permissions unchanged; (c) a 422 edit redisplays the submitted permission choices instead of the stored ones; (d) GET `/admin/characters/new` has no checked permission radio.

### Implementation for User Story 2

- [X] T006 [US2] In `src/views/admin/partials/character-fields.njk`, resolve each permission as the submitted `values[key]` if defined, otherwise the stored camelCase value (`values.canRegift`, `values.canRetrade`, `values.canResell`), and compare as strings so `0` counts as a value; check "Allowed" for `1` and "Not allowed" for `0`.
- [X] T007 [US2] In `src/routes/admin/characters.js` (edit 422 branch) and `src/views/admin/character-edit.njk`, make submitted body values take priority over the stored `character` when redisplaying, without altering the creation form.

**Checkpoint**: T005 passes.

---

## Phase 4: Polish

- [X] T008 Run `npm test`, `npm run test:nsfw`, and `git diff --check`; all must pass.
- [X] T009 Walk through `specs/008-chart-rating-merge-and-permissions-prefill/quickstart.md`.

---

## Dependencies & Execution Order

- T001 â†’ T003 â†’ T004. T005 â†’ T006 â†’ T007. The two stories are independent.
- Both T001 and T005 edit `tests/integration/admin.test.js`; do them sequentially. Polish last.

## Parallel Opportunities

- US1 (dashboard files) and US2 (character form files) can be implemented in parallel once their tests are written.

## Implementation Strategy

MVP is US1; US2 is equally P1 and independent. Finish with polish.
