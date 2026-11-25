---

description: "Implementation tasks for the compact relationship map layout"
---

# Tasks: Compact, Readable Relationship Map Layout

**Input**: Design documents from `specs/020-relationship-map-compact-layout/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/compact-layout.md`, `quickstart.md`

**Tests**: Included, written first, per the plan's test-first decision and constitution principle IV.

**Organization**: Tasks are grouped by user story. All stories extend the new `src/lib/compact-layout.js` and its test file, so tasks touching the same file are sequential.

## Phase 1: Setup

**Purpose**: Reuse the existing Node.js app, dependencies, and test harness. No setup or dependency changes are needed.

## Phase 2: Foundational

**Purpose**: Make `layoutGraph` accept precomputed positions and provide shared test measurements.

- [X] T001 Add failing unit tests in `tests/unit/graph-layout.test.js` for the `placed` option: a Map covering every node replaces ring and planar placement, curve offsets, labels, avatar geometry and `fitToBox` still apply, the result shape is unchanged, and omitting `placed` leaves current behaviour (including `centerId` profile layout) identical
- [X] T002 Implement the `placed` option in `layoutGraph` and export `buildAdjacency` and `findComponents` in `src/lib/graph-layout.js` (satisfy T001)
- [X] T003 Create `tests/helpers/layout-metrics.js` with `averageLinkLength`, `countStraightCrossings`, `onSingleCircle`, and `linkOverUnrelatedAvatar` helpers, and a `baselineLayout(nodes, edges)` that returns the current planar/ring result used for the SC-001 and SC-003 comparisons

**Checkpoint**: `layoutGraph` can render any supplied arrangement; measurements exist.

## Phase 3: User Story 1 - Related characters sit close together (Priority: P1) 🎯 MVP

**Goal**: Linked characters are near each other with no large empty areas, on the global map.

**Independent Test**: For 10 to 30 character networks, average link length is at least 40% shorter than baseline, a single-link character sits next to its neighbour, and the page uses the new layout.

- [X] T004 [US1] Add failing tests in `tests/unit/compact-layout.test.js` for `compactPositions`: covers every node with finite coordinates, centre distance at least `r_a + r_b + 56`, average link length at least 40% below `baselineLayout` on 10, 20 and 30 node fixtures, and a one-link character within one avatar gap of its neighbour
- [X] T005 [US1] Create `src/lib/compact-layout.js` exporting `compactPositions(nodes, edges)`: per component start from the planar drawing or ordering ring, run fixed-iteration stress majorization with target distance `hops * (2 * avg radius + label gap)` ordered by node id, then push overlapping pairs apart to the 56px gap (satisfy T004)
- [X] T006 [US1] Add a failing integration test in `tests/integration/relationship-map.test.js` that the `/relationships` SFW map for a seeded 15 character network has a smaller viewBox area than the baseline, and the NSFW map does not change SFW positions
- [X] T007 [US1] Wire `buildMap` in `src/routes/public/relationships.js` to call `compactPositions` and pass the result as `placed` to `layoutGraph`; leave `src/routes/public/character.js` unchanged (satisfy T006)

**Checkpoint**: The global map is compact; profile maps are unchanged.

## Phase 4: User Story 2 - The map shows its structure, not a ring (Priority: P1)

**Goal**: Clusters, hubs, chains and separate groups are visible; deterministic; large networks stay fast.

**Independent Test**: A hub with neighbours, a chain and a separate pair are laid out as such, nodes are never all on one circle (for networks with a hub, chain or branch), five loads are identical, and 150 nodes finish in under 1 s.

- [X] T008 [US2] Add failing tests in `tests/unit/compact-layout.test.js`: hub lies near the centroid of its neighbours, a chain is monotone along a path rather than folded on a circle, `onSingleCircle` is false for hub, chain and branch fixtures, repeated calls return identical maps (5 runs), and a 150 node / 300 edge network completes in under 1 s
- [X] T009 [US2] Add component packing to `src/lib/compact-layout.js`: sort components by area then id, shelf-pack rows and choose the row width that minimises the bounding box area, with no aspect-ratio target, and keep a pure cycle at the smallest circle that fits (satisfy T008)
- [X] T010 [US2] Add a failing test in `tests/unit/compact-layout.test.js` that separate groups (three components of different sizes) leave no gap between neighbouring groups larger than one avatar diameter plus the group gap, then adjust packing in `src/lib/compact-layout.js` to pass

**Checkpoint**: Structure is visible, repeatable and fast.

## Phase 5: User Story 3 - Clear, uncluttered links and labels (Priority: P2)

**Goal**: Crossings never exceed the baseline, planar networks have none, and labels stay clear.

**Independent Test**: Crossings are at or below baseline on all fixtures, zero for planar ones, no link over an unrelated avatar where avoidable, no label overlaps.

- [X] T011 [US3] Add failing tests in `tests/unit/compact-layout.test.js`: planar fixtures give 0 straight crossings, non-planar fixtures give no more than `baselineLayout` crossings, no link passes over an unrelated avatar when the baseline has none, and a fully-connected 5 node graph and a self-link plus parallel-edge fixture still hold
- [X] T012 [US3] Add the acceptance guard to `src/lib/compact-layout.js`: after relaxation compare crossings and link-over-avatar with the baseline for each component; if worse, fall back to the baseline drawing scaled with the 56px gap instead of the 240px gap (satisfy T011); reduce the gap constant in `src/lib/planar-layout.js` and update `tests/unit/planar-layout.test.js` expectations accordingly
- [X] T013 [US3] Add a failing test in `tests/unit/graph-layout.test.js` that with `placed` positions no relationship label overlaps an avatar, a name, or another label on a 30 node fixture, then fix label placement in `src/lib/graph-layout.js` (`expandForParallelLabels` and `labelT`) so it passes

**Checkpoint**: The layout is compact without sacrificing readability.

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T014 Run `npm test` and `npm run test:nsfw`; update any assertions in `tests/integration/relationship-map*.test.js` and `tests/integration/character-profile.test.js` that depended on the old global geometry, confirming profile map output is unchanged
- [X] T015 Add a short pointer to the new layout contract in `specs/018-relationship-map-redesign/contracts/` (or the nearest relationship-map contract) so the layout rules are discoverable
- [X] T016 Run the manual checks in `specs/020-relationship-map-compact-layout/quickstart.md` in Chromium: 30 and 120 character networks, reload stability, NSFW toggle, profile map unchanged, 019 zoom/pan/focus/Reset still working, and no-JavaScript rendering

## Dependencies & Execution Order

- Phase 2 (T001 to T003) blocks all stories; T001 before T002; T003 is independent of T001 and T002.
- US1 (T004 to T007) is the MVP and blocks US2 and US3, because they extend `src/lib/compact-layout.js`.
- US2 (T008 to T010) and US3 (T011 to T013) both edit `compact-layout.js` and its test file, so run them in order: US2 then US3.
- Polish (T014 to T016) runs last.

## Parallel Opportunities

- T003 can run alongside T001 and T002 (different files).
- T006 can be written alongside T004 (different test files).
- T013 touches `graph-layout.js` and its test only, so it can run alongside T011 and T012 once T002 is done.
- T015 can run any time after T007.

## Implementation Strategy

- **MVP**: Phases 2 and 3. After T007 the global map is already compact.
- **Increment**: US2 adds structure, packing, determinism and performance checks; US3 adds the crossing guard and label checks.
- Write each test task first and confirm it fails before the matching implementation task.

## Phase 7: Convergence

- [X] T017 Investigate and fix the oversized global map for a 120 character seeded network (viewBox measured about 9500x9570, far larger than the avatars need) in `src/lib/compact-layout.js` (likely the rescaled baseline fallback or inflation), and add a unit test in `tests/unit/compact-layout.test.js` that the packed area stays within a fixed multiple of the summed avatar-plus-name areas per FR-001/FR-002 (partial)
- [X] T018 Strengthen the T006 integration test in `tests/integration/relationship-map.test.js` to compare the SFW viewBox area against the old baseline layout (`findPlanarPositions` plus `layoutGraph`) instead of a fixed 1,500,000 threshold per SC-001 (partial)
- [X] T019 Reduce the 240px `NODE_GAP` scaling in `src/lib/planar-layout.js` and update `tests/unit/planar-layout.test.js`, or record in `specs/020-relationship-map-compact-layout/research.md` why it stays, per T012 (partial)
- [X] T020 Add a unit test in `tests/unit/compact-layout.test.js` that avatar radii of 64 to 104 (feature follow-up) still keep MIN_CLEARANCE, and update `spec.md`-linked `contracts/compact-layout.md` with the 36px clearance and new radius range, per SC-001 (partial)
- [ ] T021 Complete the manual Chromium checks of T016 for 30 and 120 character networks and record the result in `specs/020-relationship-map-compact-layout/quickstart.md` per SC-006 and SC-007 (missing)
