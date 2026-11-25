---

description: "Implementation tasks for the relationship map redesign"
---

# Tasks: Relationship Map Redesign

**Input**: Design documents from `specs/018-relationship-map-redesign/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by user story so each increment can be implemented and verified independently.

## Phase 1: Setup

**Purpose**: Reuse the existing Node.js application, dependencies, and test harness. No project initialization or dependency changes are needed.

## Phase 2: Foundational

**Purpose**: Define rating-safe, visible-neighbor sizing before changing either map surface.

- [X] T001 [P] Add unit coverage for distinct neighbor counts, repeated and reversed relationship records, and self-relationships in `tests/unit/relationship-map-model.test.js`
- [X] T002 [P] Add HTTP assertions that excluded-rating characters, relationships, details, and size contributions are absent from relationship maps in `tests/integration/nsfw-character-relationships.test.js`
- [X] T003 Implement distinct visible-neighbor counts and bounded monotonic node radii in `src/lib/relationship-map-model.js` (satisfy T001; consume only rating-filtered rows from existing callers)

**Checkpoint**: The map model sizes nodes by distinct visible neighbors, and the HTTP regression tests define the rating-safety boundary.

## Phase 3: User Story 1 - Read the relationship network at a glance (Priority: P1) 🎯 MVP

**Goal**: Redesign the global and shared relationship-map rendering with variable-size avatars, directional curved paths, separated clusters, and complete server-rendered map content.

**Independent Test**: Open the global SFW and opted-in NSFW maps; verify every permitted node and relationship appears, direction and mutuality are clear, clusters are distinct, and the final paths meet the crossing baseline. Verify character names, relationship details, and profile links are present in the server response.

### Tests for User Story 1

- [X] T004 [P] [US1] Add tests for variable-radius spacing, bounds, edge endpoints, labels, and final routed-path crossings in `tests/unit/graph-layout.test.js`
- [X] T005 [P] [US1] Add tests for variable-radius node placement and disconnected-component packing in `tests/unit/planar-layout.test.js`
- [X] T006 [P] [US1] Add integration coverage for global-map node and relationship completeness, direction markers, disconnected groups, and server-rendered names and details in `tests/integration/relationship-map.test.js`

### Implementation for User Story 1

- [X] T007 [US1] Extend `src/lib/graph-layout.js` to use each node radius for spacing, bounds, edge endpoints, labels, and routed paths (satisfy T004)
- [X] T008 [US1] Extend `src/lib/planar-layout.js` to preserve radius-aware spacing and disconnected-component separation, with the deterministic fallback retained (satisfy T005 and T007)
- [X] T009 [US1] Update `src/views/partials/relationship-map.njk` to render per-node avatar clipping, labels, relationship paths and direction markers, and complete server-rendered relationship details
- [X] T010 [US1] Update `src/public/css/main.css` with the reference dark teal and muted-gold map treatment, circular avatar presentation, readable labels, and responsive map frame
- [X] T011 [US1] Wire the radius-aware map model and layout into the rating-separated global map route in `src/routes/public/relationships.js`
- [X] T012 [US1] Integrate the redesigned shared map into the global page surface in `src/views/pages/relationships.njk`

**Checkpoint**: The global maps render the full rating-visible network with the redesigned visual treatment and no-JavaScript content.

## Phase 4: User Story 2 - Control labels and explore the map (Priority: P1)

**Goal**: Let visitors toggle character names, zoom, use fullscreen, and inspect relationship details with pointer or keyboard while retaining the static content baseline.

**Independent Test**: Operate each map control with pointer and keyboard; select relationships and verify complete details and endpoints; test unsupported fullscreen behavior and confirm all essential names, links, and details remain available without JavaScript.

### Tests for User Story 2

- [X] T013 [P] [US2] Add interaction tests for label toggling, zoom, relationship selection, fullscreen success and failure, and keyboard operation in `tests/unit/relationship-map-script.test.js`
- [X] T014 [P] [US2] Add accessibility and no-JavaScript assertions for map controls, relationship selection, focus visibility, and readable server-rendered details in `tests/integration/accessibility.test.js`

### Implementation for User Story 2

- [X] T015 [US2] Update `src/views/partials/relationship-map.njk` with the lower-right controls and keyboard-focusable relationship links to their server-rendered details
- [X] T016 [US2] Extend `src/public/js/relationship-map.js` with name toggling, viewBox zoom, relationship selection and emphasis, and browser fullscreen handling without changing graph data
- [X] T017 [US2] Update `src/public/css/main.css` with lower-right control-panel placement, visible focus states, selected-relationship emphasis, and fullscreen presentation

**Checkpoint**: Map enhancements work by pointer and keyboard, while the relationship information remains usable without scripts.

## Phase 5: User Story 3 - Explore a character-centered map (Priority: P2)

**Goal**: Keep profile diagrams centered on the current character, limited to directly connected rating-visible relationships, and consistent with the global map; retain the clear empty state.

**Independent Test**: Open profiles with visible relationships and profiles with none at the current rating setting. Confirm centering, direct relationship scope, rating filtering, the shared style and controls, and the empty state.

### Tests for User Story 3

- [X] T018 [P] [US3] Add profile-map integration coverage for centering, direct visible relationships, rating filtering, and the empty state in `tests/integration/character-profile.test.js`

### Implementation for User Story 3

- [X] T019 [US3] Wire the shared radius-aware map model and centered layout to the profile's already-filtered direct relationships in `src/routes/public/character.js`
- [X] T020 [US3] Integrate the shared map surface into `src/views/pages/character.njk` while preserving the profile map's clear empty state and textual relationship list

**Checkpoint**: Profile maps retain their own direct-relationship scope and center character while sharing the redesigned map and controls.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align validation documentation and verify the feature across its defined surfaces.

- [X] T021 Update the manual scenarios and expected outcomes in `specs/018-relationship-map-redesign/quickstart.md` to verify distinct-neighbor sizing, duplicate records, and profile/global map behavior
- [X] T022 Run the automated checks listed in `specs/018-relationship-map-redesign/quickstart.md` and resolve any regressions in the affected source and test files
- [X] T023 Complete the manual scenarios in `specs/018-relationship-map-redesign/quickstart.md`, including narrow-screen behavior, keyboard use, fullscreen fallback, and no-JavaScript reading

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup tasks; the existing application and test tooling are reused.
- **Foundational (Phase 2)**: Must complete before map rendering work; T001 and T002 are independent test changes, and T003 depends on T001.
- **User Story 1 (Phase 3)**: Depends on the foundational phase. T004, T005, and T006 are independent test changes; T007 depends on T004; T008 depends on T005 and T007; map integration tasks follow the layout work.
- **User Story 2 (Phase 4)**: Depends on User Story 1's shared map markup. T013 and T014 are independent test changes; implementation follows the tests.
- **User Story 3 (Phase 5)**: Depends on User Story 1's shared map and layout. Its test precedes profile-route and page integration.
- **Polish (Phase 6)**: Depends on all three user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after the foundational phase and delivers the MVP global network redesign.
- **User Story 2 (P1)**: Follows User Story 1 because its controls and relationship selection enhance the shared SVG markup.
- **User Story 3 (P2)**: Follows User Story 1 to reuse the redesigned shared map; it is sequenced after User Story 2 to avoid concurrent edits to the shared template and styles.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T004, T005, and T008 can run in parallel after the foundational phase.
- T013 and T014 can run in parallel after User Story 1.
- Separate test files may be updated concurrently as marked `[P]`; shared template, stylesheet, and application integration tasks are sequential.

## Parallel Examples

### Foundational test work

```text
Task: T001 in tests/unit/relationship-map-model.test.js
Task: T002 in tests/integration/nsfw-character-relationships.test.js
```

### User Story 1 test work

```text
Task: T004 in tests/unit/graph-layout.test.js
Task: T005 in tests/unit/planar-layout.test.js
Task: T006 in tests/integration/relationship-map.test.js
```

### User Story 2 test work

```text
Task: T013 in tests/unit/relationship-map-script.test.js
Task: T014 in tests/integration/accessibility.test.js
```

## Implementation Strategy

### MVP First

1. Complete the foundational visible-neighbor model and rating-safety tests.
2. Complete User Story 1 to deliver the redesigned global relationship maps.
3. Validate User Story 1 independently using its automated tests and global-map scenarios.
4. Add User Story 2 controls and relationship inspection.
5. Add User Story 3 profile-centered map integration and verify the profile empty state.
6. Complete the quickstart automated and manual checks.

### Incremental Delivery

User Story 1 is the smallest useful visual redesign. User Story 2 adds interactive map exploration without making it the only way to read map content. User Story 3 completes parity for profile diagrams while retaining profile-specific centering and relationship scope.

## Notes

- Every task uses the required checkbox, sequential ID, optional parallel marker, user-story label where applicable, and exact file path.
- Rating filtering remains upstream of map construction; no task adds a media route, changes persistence, or adds a dependency.
- Test coverage includes the existing dedicated NSFW suite and HTTP-level assertions for the content-rating boundary.
- T023 and T025 were verified in Chromium at 320px, 375px, and desktop widths; fullscreen entry/exit and relationship selection, keyboard controls, profile centering, and no-JavaScript content were checked in-browser.

## Phase 7: Convergence

- [X] T024 Include the server-rendered relationship details in the fullscreen surface and keep them usable when selecting a relationship in `src/views/partials/relationship-map.njk` and `src/public/js/relationship-map.js` per FR-009 (partial)
- [X] T025 Complete the narrow-screen, keyboard, fullscreen fallback, and no-JavaScript manual scenarios in `specs/018-relationship-map-redesign/quickstart.md` per SC-008 (partial)

## Phase 8: Convergence

- [X] T026 Keep bounded avatar radii strictly increasing across supported distinct-neighbor counts and add regression coverage around the current cap boundary in `src/lib/relationship-map-model.js` and `tests/unit/relationship-map-model.test.js` per FR-004 (partial)
