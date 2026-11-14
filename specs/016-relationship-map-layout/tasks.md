---
description: "Task list for Relationship Map Interaction and Layout"
---

# Tasks: Relationship Map Interaction and Layout

**Input**: Design documents from `specs/016-relationship-map-layout/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/relationship-map.md`, `quickstart.md`

**Tests**: Tests are required by the project constitution and plan. Add or update tests before implementation where practical; verify interaction and layout behavior at unit and HTTP-rendered integration levels.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no incomplete-task dependency
- **[Story]**: User-story trace label; foundational tasks have no story label
- Each task names the target file or files.

## Phase 1: Setup

No project setup or new dependencies are required.

## Phase 2: Foundational Governance

**Purpose**: Record the owner-approved keyboard-movement exception before implementing the interaction change.

- [X] T001 Amend `.specify/memory/constitution.md` Principle III with a narrowly scoped exception for repositioning relationship-map characters by keyboard, preserving Tab focus and keyboard link activation; increment version 2.0.0 to 3.0.0 and add a Sync Impact Report explaining the owner-approved change and retained safeguards.

**Checkpoint**: Constitution amendment is complete before any behavior or layout implementation begins.

---

## Phase 3: User Story 1 - Move One Character at a Time (Priority: P1) 🎯 MVP

**Goal**: Only a drag that begins on a character's face moves that character; background panning and keyboard movement are removed, while normal link navigation remains.

**Independent Test**: Drag a character face and confirm only that node and its edges move; drag empty space or press arrow keys on a focused character and confirm no position changes; click or press Enter on a character link and confirm navigation works.

### Tests for User Story 1

- [X] T002 [P] [US1] Update `tests/unit/relationship-map-script.test.js` to cover face-origin mouse and touch dragging, no drag from the node name or empty SVG background, no background panning, no arrow-key movement, unchanged click-without-drag navigation, click suppression after a real drag, and edge/label following; remove expectations for the retired pan and keyboard-movement behavior.
- [X] T003 [P] [US1] Update `tests/integration/relationship-map.test.js` to assert that the rendered character face has a distinct drag target, the character name remains a navigable link, the page help no longer advertises empty-area or arrow-key movement, and keyboard focus/activation wording remains clear.

### Implementation for User Story 1

- [X] T004 [US1] Update `src/views/partials/relationship-map.njk` to provide an explicit circular hit target over each avatar face for drag initiation without replacing or disabling the containing character link.
- [X] T005 [US1] Update `src/public/js/relationship-map.js` so pointer/touch drag starts only from the face hit target, moves only the associated node and connected edges/labels, and retains threshold-based click suppression; remove `attachPan`, `panBox`, all empty-map viewBox movement, and the Arrow/Shift+Arrow movement handler.
- [X] T006 [US1] Update `src/public/css/main.css` so only the face drag target displays a drag cursor and disables browser touch gestures as needed; keep the map background available for normal page/touch scrolling and preserve visible keyboard focus for character links.
- [X] T007 [US1] Update the relationship interaction help in `src/views/pages/relationships.njk` to explain face-only dragging, plain link activation, no keyboard repositioning, keyboard link navigation, and that positions reset on reload.

**Checkpoint**: US1 tests pass; no alternate movement mode remains, while character links work by pointer and keyboard.

---

## Phase 4: User Story 2 - Read Both Relationship Areas Clearly (Priority: P1)

**Goal**: SFW and NSFW sections are vertically stacked and maps use larger, legible faces and text. Dense maps can scroll within their own frames on phones without causing page-level horizontal overflow.

**Independent Test**: At desktop and narrow phone widths, verify SFW precedes NSFW, face and text dimensions remain readable, long names and labels are complete, and any horizontal scroll is confined to the map frame.

### Tests for User Story 2

- [X] T008 [P] [US2] Update `tests/unit/graph-layout.test.js` to cover increased avatar radius, adequate ring/component and label spacing for the larger nodes and text, full wrapping of long names and labels, and viewBox bounds that contain all enlarged geometry.
- [X] T009 [P] [US2] Update `tests/integration/relationship-map.test.js` to verify SFW markup precedes NSFW markup, rendered map dimensions retain the computed layout width, long content remains complete, and both map frames are independently scrollable without page-level horizontal overflow.
- [X] T010 [P] [US2] Update `tests/integration/accessibility.test.js` to verify the relationships page and its surrounding sections do not introduce horizontal overflow while dense diagram scrolling remains confined to the map frame.

### Implementation for User Story 2

- [X] T011 [US2] Update `src/lib/graph-layout.js` to enlarge `NODE_RADIUS` and adjust ring radii, component spacing, name space, label clearance, and viewBox bounds for approximately 96px avatars and 16px map text without node, name, or label collisions.
- [X] T012 [US2] Update `src/views/partials/relationship-map.njk` to size each rendered SVG to at least its computed layout width while retaining responsive full-width behavior when the frame is wider than the diagram.
- [X] T013 [US2] Update `src/public/css/main.css` to make relationship regions explicitly single-column, keep the page and cards within viewport width, confine necessary horizontal overflow to `.relationship-map-frame`, and style the enlarged map labels and faces without clipping.
- [X] T014 [US2] Update `src/views/pages/relationships.njk` to explicitly preserve SFW-before-NSFW vertical ordering and keep the user instructions consistent with the stacked, readable layout.

**Checkpoint**: US2 tests pass at desktop and narrow phone sizes; full text and large map elements remain readable.

---

## Phase 5: User Story 3 - Preserve Keyboard Navigation (Priority: P2)

**Goal**: Keyboard users can still reach and activate every character link, while arrows do not reposition nodes and the approved exception is explicit in project governance.

**Independent Test**: Use Tab to focus character links and Enter to open a character page; confirm arrows do not move a character and verify the constitution documents the narrow movement exception.

### Tests for User Story 3

- [X] T015 [P] [US3] Update `tests/integration/relationship-map.test.js` to verify character anchors remain in the tab order with working destinations and the rendered page explains keyboard navigation without promising keyboard movement.
- [X] T016 [P] [US3] Update `tests/integration/accessibility.test.js` to verify the map retains a visible focus indicator and that keyboard navigation and activation are not removed along with keyboard repositioning.

### Implementation for User Story 3

- [X] T017 [US3] Review and, if needed, refine `.specify/memory/constitution.md` so the Principle III exception applies only to relationship-map character repositioning and does not waive keyboard access to character links or other controls; keep the 3.0.0 Sync Impact Report accurate.
- [X] T018 [US3] Update `src/public/js/relationship-map.js` and `src/public/css/main.css` only if required by the keyboard integration tests to ensure arrow keys never move nodes while links retain native keyboard activation and a visible focus indicator.

**Checkpoint**: US3 tests pass and governance clearly distinguishes prohibited keyboard movement from required keyboard navigation.

---

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Validate unchanged rating behavior, no-JavaScript reading/navigation, and the end-to-end quickstart.

- [X] T019 Run `npm test`, `npm run test:nsfw`, `git diff --check`, and verify the quickstart scenarios that can be covered without a browser; record any browser-only scenario as unverified. Update the existing `README.md` if it documents relationship-map interaction or layout and is now inaccurate, then fix any validation regressions in the touched implementation or tests.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup is required.
- **Foundational (Phase 2)**: T001 is a mandatory governance gate and must complete before any user-story implementation.
- **User Stories (Phase 3+)**: All depend on T001. US1 precedes the shared script/template work in US2. US3 validates and refines keyboard behavior after the interaction implementation.
- **Polish (Phase 6)**: Depends on all user-story tasks.

### User Story Dependencies

- **US1 (P1)**: Starts after T001; delivers the MVP interaction change.
- **US2 (P1)**: Starts after T001; perform after US1 because both stories update the shared SVG template and CSS.
- **US3 (P2)**: Starts after T001 and validates focus/link behavior after US1; constitution scope is established in T001.

### Within Each User Story

- Tests are written/updated before their corresponding implementation and must assert the new behavior.
- T004 and T005 are sequential because the script consumes the face target markup.
- T008–T010 are independent test-file updates; T011–T014 follow the US1 changes to shared rendering and CSS.
- T015 and T016 can run in parallel; T017 is already gated by T001 and T018 is only needed if tests identify a remaining gap.

## Parallel Opportunities

- T002 and T003 can run in parallel after T001 because they touch different test files.
- T008, T009, and T010 can run in parallel after US1 because they touch different test files.
- T015 and T016 can run in parallel after US1 and US2.

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 before any application code changes.
2. Update US1 tests and confirm they reject the old pan and keyboard movement behavior.
3. Implement face-only drag and revised help text.
4. Validate US1 independently before changing map sizing and layout.

### Incremental Delivery

1. Complete US1 to deliver the requested movement restriction.
2. Complete US2 to deliver stacked sections, larger cards, and confined scrolling for dense maps.
3. Complete US3 to verify keyboard access and governance boundaries.
4. Run all validation scenarios and the rating-specific test suite.

## Phase 7: Convergence

- [X] T020 Keep moved character names and connected relationship labels within the visible SVG bounds when a character is dragged to a map edge; update `src/public/js/relationship-map.js` and add a regression test in `tests/unit/relationship-map-script.test.js` per FR-010 and SC-004 (partial).

## Phase 8: Convergence

- [X] T021 Preserve the single-column SFW/NSFW relationship layout in the final stylesheet cascade and add regression coverage for the effective desktop rule in `src/public/css/main.css` and `tests/integration/relationship-map.test.js` per FR-008 and US2/AC1 (contradicts).
