---
description: "Implementation tasks for character relationship views"
---

# Tasks: Character Relationship Views

**Input**: Design documents in `specs/017-character-relationship-views/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/relationship-views.md`

**Organization**: Tasks are grouped by user story. This repository is already an initialized Node.js application, so setup requires no project scaffolding or tooling changes.

## Phase 1: Setup

**Purpose**: Project initialization and shared tooling.

No setup tasks are needed; the existing Node.js application, test runner, server-rendered templates, and relationship map are already in place.

## Phase 2: Foundational

**Purpose**: Establish one shared relationship-map view-model builder for global and profile views.

- [X] T001 [P] Add unit tests for global relationship rows and an optional profile-center node in `tests/unit/relationship-map-model.test.js`.
- [X] T002 Extract `buildMapModel` into `src/lib/relationship-map-model.js` and update `src/routes/public/relationships.js` to use it without changing the existing global-map output.

**Checkpoint**: Shared view-model tests pass and the global relationship page retains its existing output; the user stories can proceed.

## Phase 3: User Story 1 - See a character's connections from their profile (Priority: P1)

**Goal**: Show the profile character in the center of a diagram with every directly related visible character, their avatar and name, links, and relationship details.

**Independent Test**: Request a profile with multiple visible relationships and verify the center character, all unique related characters, every relationship, working profile links, and the empty state. Without NSFW opt-in, assert that excluded character names, relationship labels, links, and accessible text are absent; with opt-in, verify the newly visible rows appear. The server-rendered diagram must remain present without JavaScript.

### Tests for User Story 1

- [X] T003 [P] [US1] Add profile-diagram and no-JavaScript HTTP assertions in `tests/integration/character-profile.test.js` and rating-gate assertions in `tests/integration/nsfw-character-relationships.test.js`.

### Implementation for User Story 1

- [X] T004 [US1] Add `listRelationshipsForCharacterWithAvatars` to `src/repositories/relationships.js`, retaining SQL rating filtering and caching effective avatar resolution per character.
- [X] T005 [US1] Update `src/repositories/characters.js` to attach the avatar-enriched, rating-filtered relationship rows to the profile model.
- [X] T006 [US1] Add a deterministic root-centered profile layout to `src/lib/graph-layout.js`; keep the current character centered, place each unique related character around it, preserve every relationship edge, and include all labels and names in the bounds.
- [X] T007 [US1] Build the profile relationship view model in `src/routes/public/character.js` using the shared builder in `src/lib/relationship-map-model.js` and the profile layout from `src/lib/graph-layout.js`.
- [X] T008 [US1] Render the profile diagram, related-character links, text equivalent, and explicit empty state in `src/views/partials/relationship-map.njk` and `src/views/pages/character.njk`.
- [X] T009 [P] [US1] Add responsive profile diagram sizing and map-frame overflow rules in `src/public/css/main.css` without shrinking avatars or allowing page-level horizontal overflow.

**Checkpoint**: The profile diagram is independently testable, server-rendered, and contains only rating-visible relationship data.

## Phase 4: User Story 2 - Read relationship diagrams with fewer crossing lines (Priority: P1)

**Goal**: Use crossing-free layouts when possible and a deterministic non-planar fallback that is no worse than the input-order baseline.

**Independent Test**: Verify zero crossings for planar fixtures including K4 (which cannot be represented crossing-free by the existing circular ordering), verify disconnected planar fixtures and parallel relationships, and confirm a non-planar fixture has no more crossings than its input-order baseline. Exercise the global SFW and NSFW maps and confirm all visible nodes and labels remain represented. The existing 100-character/300-relationship performance fixture must remain below 150 ms.

### Tests for User Story 2

- [X] T010 [P] [US2] Add crossing-free planar and input-order baseline regression tests to `tests/unit/graph-layout.test.js`, including K4, disconnected components, non-planar input, and parallel relationships.

### Implementation for User Story 2

- [X] T011 [US2] Validate `@khalidsaidi/topoloom` against the researched API and deterministic coordinate output for planar, disconnected, and parallel-edge fixtures; only after validation, pin the dependency in `package.json` and `package-lock.json` and record package-level regression tests in `tests/unit/planar-layout.test.js`.
- [X] T012 [US2] Implement the validated planar embedding and coordinate adapter in `src/lib/planar-layout.js`, preserving stable character IDs and a testable crossing-free result.
- [X] T013 [US2] Update `src/lib/graph-layout.js` to use the planar adapter for planar simple graphs and retain the existing bounded deterministic search for non-planar graphs, explicitly scoring and retaining the input-order baseline.
- [X] T014 [P] [US2] Extend `tests/integration/relationship-map.test.js` to verify the global SFW/NSFW diagrams use the improved layout while retaining all rating-visible nodes, edges, labels, and independent rating geometry.

**Checkpoint**: Global and profile diagrams satisfy the crossing tests, fallback baseline, and graph-layout performance budget.

## Phase 5: User Story 3 - Trace one character's relationships at a glance (Priority: P2)

**Goal**: Hover and keyboard focus emphasize only a character's incident relationships while leaving other edges visible and preserving normal links.

**Independent Test**: In a map containing both incident and unrelated edges, hover a character and then focus its link. Verify only incident edges and labels are emphasized, unrelated content remains visible, emphasis resets only when both hover and focus end, and native profile links remain keyboard-activatable.

### Tests for User Story 3

- [X] T015 [P] [US3] Add hover, focus, combined hover/focus, and reset behavior tests to `tests/unit/relationship-map-script.test.js`.

### Implementation for User Story 3

- [X] T016 [US3] Update `src/public/js/relationship-map.js` to track pointer-hover and keyboard-focus node identity and apply incident/non-incident emphasis to each map's existing node and edge elements without changing navigation or dragging behavior.
- [X] T017 [US3] Add visible active-edge and subdued-edge styles in `src/public/css/main.css`, keeping unrelated edges visible and preserving the visible keyboard focus indicator.

**Checkpoint**: Global and profile maps share equivalent pointer and keyboard emphasis, with no-JavaScript content unchanged.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align validation documentation and verify all feature requirements together.

- [X] T018 Update `specs/017-character-relationship-views/quickstart.md` and `specs/017-character-relationship-views/contracts/relationship-views.md` to reflect the implemented routes, tests, and verified layout behavior.
- [X] T019 Run the targeted feature tests, `npm test`, `npm run test:nsfw`, and `git diff --check`; confirm all cases in `specs/017-character-relationship-views/quickstart.md`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; the application and tooling already exist.
- **Foundational (Phase 2)**: T001 precedes T002; both must complete before profile work uses the shared relationship-map model.
- **User Story 1 (Phase 3)**: Depends on Phase 2. T003 is test-first; T004 precedes T005; T006 and T007 precede T008. T009 can proceed independently once its responsive profile-map selectors are agreed.
- **User Story 2 (Phase 4)**: Depends on T006 because both stories extend `src/lib/graph-layout.js`. T010 precedes implementation; T011 is a hard validation gate. Do not weaken the zero-crossing requirement if the candidate package fails; select and validate another planar embedding/drawing method.
- **User Story 3 (Phase 5)**: Depends on Phase 2. T015 precedes T016; T017 follows the profile CSS task T009 because both edit `src/public/css/main.css`.
- **Polish (Phase 6)**: Depends on all selected stories.

### User Story Dependencies

- **US1 (P1)**: Starts after the shared model foundation. It can be demonstrated independently with the existing graph arrangement.
- **US2 (P1)**: Starts after US1's graph-layout change to avoid concurrent edits to `src/lib/graph-layout.js`; its coverage includes both global and profile diagrams.
- **US3 (P2)**: Does not depend on US2's crossing algorithm. Its JavaScript tests and enhancement can proceed after the foundation; the CSS task waits for T009 to avoid conflicting edits.

### Parallel Opportunities

- T001 and T003 are independent test additions in separate files and can be prepared in parallel.
- T009 can be implemented independently of the profile route and template once the selectors are agreed.
- T010 can be prepared alongside T015 because they use separate test files.
- After their respective tests exist, T012's planar adapter and T016's interaction enhancement edit separate source files and can be implemented in parallel, provided T011 has passed before T012 begins.
- T018 and T019 are final validation/documentation tasks and should run after implementation is complete.

## Parallel Example: User Story 1

```text
Task: "Add profile and rating-gate HTTP tests in tests/integration/character-profile.test.js and tests/integration/nsfw-character-relationships.test.js"
Task: "Add responsive profile-map styles in src/public/css/main.css"
```

## Parallel Example: User Story 2

```text
Task: "Add crossing and baseline tests in tests/unit/graph-layout.test.js"
Task: "Add global-map integration tests in tests/integration/relationship-map.test.js"
```

## Parallel Example: User Story 3

```text
Task: "Add hover/focus behavior tests in tests/unit/relationship-map-script.test.js"
Task: "Add profile and rating-gate HTTP tests in tests/integration/character-profile.test.js and tests/integration/nsfw-character-relationships.test.js"
```

## Implementation Strategy

### MVP First

1. Complete T001-T002 to share the existing map model without changing global behavior.
2. Complete T003-T009 for the character-centered profile diagram and verify its server-side rating filtering.
3. Validate US1 independently before beginning the shared crossing-layout changes.

US1 is the smallest independently deliverable increment. Both P1 stories remain required for the complete feature.

### Incremental Delivery

1. Establish the shared relationship-map model.
2. Deliver the profile relationship diagram (US1).
3. Add planar layouts and the non-planar baseline fallback across diagrams (US2).
4. Add shared hover/focus emphasis (US3).
5. Run quickstart and full regression checks.

## Phase 7: Convergence

- [X] T020 Preserve the actual input-node ordering as a candidate and guaranteed crossing-count bound for non-planar components in `src/lib/graph-layout.js`, and add a deterministic regression case to `tests/unit/graph-layout.test.js` proving the chosen arrangement never exceeds its input-order baseline per FR-008 and plan decision 4 (partial).

## Phase 8: Convergence

- [X] T021 Ensure simultaneous pointer hover and keyboard focus emphasize only one character's incident relationships (with pointer hover taking precedence and focus restored on pointer exit), and add distinct-node overlap/reset coverage in `tests/unit/relationship-map-script.test.js` per FR-010, FR-011, SC-005, and plan decision 6 (partial).

## Phase 9: Convergence

- [X] T022 Test crossings in final routed paths for planar graphs with parallel relationships, then adjust routing so curves do not cross unrelated edges and labels remain readable per FR-007, FR-009, SC-002, US2/AC1, and plan R-004 (partial).

## Phase 10: Convergence

- [X] T023 Keep parallel-relationship labels separated while anchoring them to their rendered routes, and add long-label regression coverage per FR-009, US2/AC4, and plan decision 4 (partial).
