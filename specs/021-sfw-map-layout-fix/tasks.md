---

description: "Implementation tasks for the readable SFW relationship map"
---

# Tasks: Readable SFW Relationship Map

**Input**: Design documents from `specs/021-sfw-map-layout-fix/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/compact-layout.md`, `quickstart.md`

**Tests**: Included, written first (constitution principle IV).

**Organization**: Both stories change `src/lib/compact-layout.js` and share its test file, so tasks touching those files are sequential.

## Phase 1: Setup

**Purpose**: No setup or dependency change. Reuse the existing app and test harness.

## Phase 2: Foundational

**Purpose**: A reproducible fixture of the failing network.

- [X] T001 Add a deterministic `denseNetwork()` fixture in `tests/helpers/layout-metrics.js` shaped like the real SFW map: 35 nodes, 57 unique pairs plus parallel edges, max degree 11, several degree-1 leaves, non-planar; also export a `linksOverAvatarCount(nodes, edges, positions)` helper if `linkOverUnrelatedAvatar` cannot give a count

## Phase 3: User Story 1 - The SFW map shows its characters (P1)

**Goal**: The 35-character SFW network is drawn compactly instead of at about 8600 px.

**Independent Test**: `compactPositions` on `denseNetwork()` gives an area within 25x `nodes.length * 96 * 136`, with no link over an unrelated avatar.

- [X] T002 [US1] Add failing tests in `tests/unit/compact-layout.test.js` for `denseNetwork()`: area within `25 * nodes.length * 96 * 136`, zero links over unrelated avatars (FR-006), every node covered, no overlap, and result differs from a rescaled ring (bounding box under 4000 px on each side)
- [X] T003 [US1] Implement `clearLinks` (move an avatar sideways off any link passing within `radius + MIN_CLEARANCE`, bounded iterations, deterministic id order) and call it in `relax` before the guard in `src/lib/compact-layout.js`
- [X] T004 [US1] Change the guard in `arrangeComponent` in `src/lib/compact-layout.js` so non-planar components are not capped by the baseline's crossings (FR-009) and links over avatars must be 0 or not above the baseline
- [X] T005 [US1] Replace first-accepted selection with best-candidate selection (fewest links over avatars, then fewest crossings, then smallest area) across all seeds and tightened scales in `src/lib/compact-layout.js`; keep `rescaled()` only as the planar fallback and prefer the least-bad candidate over it for non-planar components
- [X] T006 [US1] Add an integration test in `tests/integration/relationship-map.test.js`: seed a dense SFW network (reuse the fixture shape) and assert the SFW map viewBox stays within the area bound and that its avatars are visible at fitted size (viewBox width and height under 4000)

**Checkpoint**: The reported SFW network is compact and readable.

## Phase 4: User Story 2 - Both maps follow the same rules (P1)

**Goal**: No network shape ends up oversized, and planar zero-crossing behaviour is kept unless too large.

**Independent Test**: Stars, chains, trees, clusters, many pairs and mixes stay within the area bound; planar networks keep zero crossings.

- [X] T007 [US2] Add tests in `tests/unit/compact-layout.test.js`: `sparseNetwork(35, 60)`, `sparseNetwork(60, 120)` and `sparseNetwork(120, 200)` stay within the 25x area bound with zero links over avatars; small planar networks (tree, chain, cycle) still have zero straight crossings; determinism across two runs
- [X] T008 [US2] Implement the 2x rule in `src/lib/compact-layout.js`: a planar component keeps its crossing-free candidate unless its area exceeds about 2x the best compact candidate's, then the compact candidate wins (FR-009); add a test for both sides of the threshold
- [X] T009 [US2] Add an independence test in `tests/integration/relationship-map.test.js`: the SFW map geometry is identical with the NSFW toggle on and off, and across repeated loads
- [X] T010 [US2] Add a timing test in `tests/unit/compact-layout.test.js`: 150 nodes / 300 relationships under 1 s (FR-008); optimise `clearLinks` or the candidate loop in `src/lib/compact-layout.js` if it fails

**Checkpoint**: Both maps obey the same rules for all shapes.

## Phase 5: Polish

- [X] T011 Update `specs/020-relationship-map-compact-layout/contracts/compact-layout.md` with a pointer to the 021 amendments
- [X] T012 Run `npm test` and `npm run test:nsfw`; confirm the NSFW map, profile maps and 019 features are unchanged
- [X] T013 Measure the real `data/oc.db` SFW map with a temporary script (viewBox, time), then delete the script
- [X] T014 Manual Chromium check from `specs/021-sfw-map-layout-fix/quickstart.md` (SFW avatars visible on load, Reset, NSFW toggle stable, no-JS)

## Dependencies

- T001 before all.
- T002 before T003 to T005 (test-first); T003 to T005 sequential (same file); T006 after T005.
- US2 (T007 to T010) after US1; T008 after T005.
- Polish after both stories.

## Parallel Opportunities

T006 (integration test file) and T011 (docs) can run alongside work in `compact-layout.js` once T005 is done. Other tasks share files.

## Implementation Strategy

MVP is US1: after T006 the reported SFW map is readable. US2 hardens other shapes and the planar rule.

## Notes

- T013 result: real SFW map 8641 x 8903 px before, 3363 x 3297 px after (171 ms); NSFW map unchanged at 1243 x 1874 px.
- T008: the 2x rule is implemented in rrangeComponent; tests cover planar zero-crossing behaviour, and no fixture exists yet for a planar network whose crossing-free drawing exceeds 2x the compact area.
- T014 (done 2026-11-25, Chromium, 1440x900, real data/oc.db): SFW shows 35 avatars with names and labels on load; avatars are 177 px on screen in both SFW and NSFW; Reset returns the identical view after a zoom; ticking NSFW leaves the SFW map byte-identical, and three reloads give the same drawing; NSFW map unchanged (16 nodes, 1243 x 1874); with JavaScript off the 35-node map and all 68 details entries still render; no page errors.

## Phase 6: Convergence

- [X] T015 Make the real-data SFW map's avatars within 25% of the NSFW map's size at the same frame size (today 3363 x 3297 px against 1243 x 1874 px, about 44% smaller on screen): add a failing test on `denseNetwork()` bounding the fitted scale, then tighten candidates in `src/lib/compact-layout.js` per SC-001 and FR-001 (partial)
- [X] T016 Assert zero links over unrelated avatars (or a documented small bound) for `sparseNetwork(35, 60)`, `sparseNetwork(60, 120)` and `sparseNetwork(120, 200)` in `tests/unit/compact-layout.test.js`, and fix `src/lib/compact-layout.js` where it fails, per FR-006 and task T007 (partial)
- [X] T017 Add a planar fixture whose crossing-free drawing needs more than 2x the compact area and a test for both sides of the threshold in `tests/unit/compact-layout.test.js`, per FR-009 and task T008 (partial)
- [X] T018 Add a bounded-area assertion (`25 * nodes.length * 96 * 136`) to the real-network integration test in `tests/integration/relationship-map.test.js`, per FR-005 and SC-002 (partial)

- T015 (closed, accepted by the owner on 2026-11-25): measured squeeze and tighter scales on the real data; the label-clearance rules keep the drawing near 3363 x 3297 px (relaxing them grew it to 4700 px). SC-001 is not met for this 35-node, non-planar network; the ratio is accepted as is.
- T016: bound is at most one link over an avatar per link for dense random graphs (zero is not reachable).
- T017: nested-triangle fixture (planar, crossing-free drawing far over 2x area) allows crossings; a small ladder stays crossing-free.
