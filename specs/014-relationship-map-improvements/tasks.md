# Tasks: Relationship Map Improvements

**Input**: Design documents from `/specs/014-relationship-map-improvements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/relationship-map.md, quickstart.md

**Tests**: Included (constitution IV). Write tests first, confirm they fail, then implement.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup needed: existing project, no new dependencies.

## Phase 2: Foundational (blocks US3)

- [X] T001 Write `tests/integration/migrations.test.js` additions for migration `007`: `relationship.is_one_sided` exists, `NOT NULL DEFAULT 0 CHECK (is_one_sided IN (0, 1))`; existing rows become 0; two-sided pair+label stays unique in either direction; one-sided same direction+label is unique; one-sided opposite directions with the same label are both allowed; confirm it fails
- [X] T002 Create `src/db/migrations/007_relationship_sidedness.sql`: add `is_one_sided INTEGER NOT NULL DEFAULT 0 CHECK (is_one_sided IN (0, 1))`; drop `idx_relationship_unique_pair`; recreate it over `(CASE WHEN is_one_sided = 1 THEN from_character_id ELSE pair_low END, CASE WHEN is_one_sided = 1 THEN to_character_id ELSE pair_high END, is_one_sided, label COLLATE NOCASE)` (follow the table-rebuild pattern of `006_video_media.sql` if SQLite requires it)

**Checkpoint**: T001 passes.

---

## Phase 3: User Story 1 - Click-and-drag on the map (Priority: P1)

**Goal**: Reliable mouse press-drag of characters, mouse panning of the view, touch drags characters only.

**Independent Test**: On `/relationships`, drag a character and empty space with the mouse; on touch, empty space scrolls the page.

- [X] T003 [P] [US1] Write `tests/integration/relationship-map-script.test.js` (vm or the existing module-test approach used for `clamp`): pointerdown/move/up on a node moves it, redraws its edges and suppresses the click after a drag above the 4px threshold; a click without movement does not suppress navigation; a mouse pointerdown on empty SVG space changes the viewBox origin; a touch pointerdown on empty space does not start a pan; nothing is written to storage; confirm it fails
- [X] T004 [US1] Edit `src/public/js/relationship-map.js`: add mouse-only panning on empty space (change viewBox origin, clamp to the drawing's bounds); keep node dragging and the click suppression; make panning and node clamping use the current viewBox
- [X] T005 [P] [US1] Edit `src/public/css/main.css`: replace `touch-action: none` on `.relationship-map` with `touch-action: pan-y` (and keep `touch-action: none` on `.map-node`); add a grab cursor for the map background on mouse devices

**Checkpoint**: T003 passes.

---

## Phase 4: User Story 2 - Full text (Priority: P1)

**Goal**: Labels and names are never truncated; they wrap and the map grows taller.

**Independent Test**: A 100-character label and a long name appear in full, without overlapping avatars.

- [X] T006 [P] [US2] Write tests in `tests/unit/graph-layout.test.js` and `tests/integration/relationship-map-text.test.js`: a long label yields several wrapped lines whose joined text equals the full label; an overlong single word is broken; no ellipsis in the page; viewBox height grows and still contains every label (invariant I-M5); the hidden text equivalent has the full text; confirm they fail
- [X] T007 [US2] Edit `src/lib/graph-layout.js`: add a wrap helper (fixed maximum characters per line, break overlong words) and compute line counts for edge labels and node names; include the extra height in label offsets, name spacing and the viewBox bounds
- [X] T008 [US2] Edit `src/views/partials/relationship-map.njk`: remove `truncate(24, …)`; emit one `<tspan>` per wrapped line for edge labels and node names, vertically centered on the label anchor
- [X] T009 [US2] Edit `src/public/js/relationship-map.js`: when moving an edge label, keep every `<tspan>`'s `x` aligned to the new anchor and the block centered
- [X] T010 [P] [US2] Edit `src/public/css/main.css`: label and name text styles for multi-line (line spacing, no overflow clipping)

**Checkpoint**: T006 passes.

---

## Phase 5: User Story 3 - One-sided and two-sided relationships (Priority: P1)

**Goal**: Relationships can be one-sided (with direction) or two-sided, editable in the admin, shown on the map, text equivalent and character page.

**Independent Test**: Create one of each between two characters: an arrowhead on the one-sided line only; the character page and text equivalent state the difference.

### Tests for User Story 3

- [X] T011 [P] [US3] Write `tests/integration/relationship-sidedness.test.js`: create defaults to two-sided; creating one-sided stores `is_one_sided = 1` and the direction; opposite one-sided with the same label is allowed; same direction and label is refused with a `label` field error; a one-sided and two-sided with the same label between the pair is refused; edit can swap direction and change sidedness; existing fixtures behave as two-sided; NSFW one-sided relationships stay hidden when NSFW is off (also add a case to `tests/integration/nsfw-gate.test.js` style suite and run `npm run test:nsfw`); confirm they fail
- [X] T012 [P] [US3] Write `tests/integration/relationship-map-direction.test.js`: one-sided `.map-edge` has `data-one-sided="1"` and `marker-end="url(#map-<rating>-arrow)"` with the marker in `<defs>`; two-sided has neither; the text equivalent uses the directional wording; the character page states sidedness and direction; confirm it fails

### Implementation for User Story 3

- [X] T013 [US3] Edit `src/services/relationships.js`: read `is_one_sided` (`'1'` = one-sided, default 0); make the duplicate check direction-aware per `data-model.md` ("Two-sided: the pair (in either direction) plus label ... must be unique"; "One-sided: the ordered pair plus label must be unique"; one-sided and two-sided with the same label between a pair are duplicates); persist it in `createRelationship` and `updateRelationship`
- [X] T014 [US3] Edit `src/repositories/relationships.js`: select `r.is_one_sided AS isOneSided` and return it from `shape`
- [X] T015 [US3] Edit `src/routes/public/relationships.js`: carry `isOneSided` into each edge of `buildMapModel`; edit `src/lib/graph-layout.js` to pass it through to placed edges
- [X] T016 [US3] Edit `src/views/partials/relationship-map.njk`: add an arrow `<marker>` in `<defs>` per map, `data-one-sided` and `marker-end` on one-sided edges, and directional wording in the text equivalent
- [X] T017 [US3] Edit `src/public/js/relationship-map.js`: ensure redrawn one-sided paths still run from `from` to `to` so the arrowhead stays correct
- [X] T018 [US3] Edit `src/views/admin/relationships.njk` and `src/routes/admin/relationships.js`: add a "Two-sided / One-sided" choice to the create form; add an edit form (the update route `POST /admin/relationships/:id` already exists) with sidedness and a swap-direction control; show sidedness in the list
- [X] T019 [P] [US3] Edit `src/views/pages/character.njk` (and the repository data it uses): state each relationship as two-sided or one-sided with its direction
- [X] T020 [P] [US3] Edit `src/public/css/main.css`: arrowhead and one-sided edge styles

**Checkpoint**: T011 and T012 pass; `npm run test:nsfw` passes.

---

## Phase 6: User Story 4 - Use the character's avatar (Priority: P2)

**Goal**: The map shows each character's designated avatar with its saved crop.

**Independent Test**: A character whose avatar is not its first image, with a crop, appears that way on the map.

- [X] T021 [P] [US4] Write `tests/integration/relationship-map-avatar.test.js`: a character with a non-first designated avatar shows `/media/<avatar id>` on the map; a saved crop is reflected in the `<image>` geometry; an NSFW-only avatar with NSFW off shows the fallback or placeholder and never the hidden image's URL; confirm it fails
- [X] T022 [US4] Edit `src/repositories/relationships.js` and `src/routes/public/relationships.js`: select `avatar_crop_x`, `avatar_crop_y`, `avatar_crop_zoom` with each endpoint and add them to the node model
- [X] T023 [US4] Edit `src/views/partials/relationship-map.njk`: apply the crop and zoom to the avatar `<image>` inside the circular clip, matching how the gallery applies it

**Checkpoint**: T021 passes.

---

## Phase 7: Polish

- [X] T024 Run `npm test` and `npm run test:nsfw`; fix regressions (existing map tests may assert truncated labels or the old unique index)
- [X] T025 Run `git diff --check`; walk through `specs/014-relationship-map-improvements/quickstart.md`; update `README.md` only if it documents relationships

---

## Dependencies & Execution Order

- T001–T002 (migration) block US3; US1, US2 and US4 do not depend on it.
- US2 and US3 both edit `graph-layout.js`, `relationship-map.njk` and `relationship-map.js`: do US2 before US3 to avoid conflicts. US1 also edits `relationship-map.js`: do it first.
- Suggested order: US1 → US2 → Foundational → US3 → US4 → Polish.
- Within each story: tests first, then implementation.

## Parallel Example

T003, T006, T011, T012 and T021 are different test files and can be written together; T005, T010 and T020 are CSS-only and can follow their stories independently.

## Implementation Strategy

MVP is US1 (client script and CSS only). Then US2 (rendering), US3 (the only data change, with migration), and US4. Validate each checkpoint before moving on.

## Phase 8: Convergence

- [X] T026 Keep wrapped edge labels clear of avatars (FR-007): in `src/lib/graph-layout.js` make the ring radius (or a two-node pair's spacing) large enough that a label's widest line fits between the two avatar rims, and add a test in `tests/unit/graph-layout.test.js` asserting no label box overlaps a node circle in the default layout (partial)
- [X] T027 Make the map avatar match the gallery crop for non-square images (FR-013, SC-004): the SVG `<image>` uses `slice` and a square zoom offset, while the gallery uses `object-position` plus `scale`; align the geometry in `src/lib/graph-layout.js` / `src/views/partials/relationship-map.njk` and cover it in `tests/integration/relationship-map-avatar.test.js` (partial)
