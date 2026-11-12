# Tasks: Character Profile and Tag Filters

**Input**: Design documents from `specs/010-character-profile-tag-filters/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-changes.md`

**Tests**: Included because the implementation plan calls for focused profile and filter behavior assertions.

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

No setup tasks are required; this feature uses the existing project structure and dependencies.

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by user stories

No foundational tasks are required; both stories can be implemented independently.

## Phase 3: User Story 1 - Read profile sections in the intended order (Priority: P1)

**Goal**: Display Personality, Physical Description, then Relationships, with descriptions styled as visible story-like text.

**Independent Test**: Render a profile with all three sections and multiple paragraphs; verify the order, paragraph preservation, text styling, and omission of empty descriptions.

### Tests for User Story 1

- [X] T001 [P] [US1] Update profile ordering and paragraph rendering assertions in `tests/integration/character-profile.test.js` to require Personality, Physical Description, and Relationships in order, preserving escaped paragraph text and omitting empty descriptions.

### Implementation for User Story 1

- [X] T002 [P] [US1] Move the Relationships section after Personality and Physical Description in `src/views/pages/character.njk`, keeping both description sections visible and preserving paragraph splitting and escaping.
- [X] T003 [P] [US1] Apply the existing story text width and paragraph spacing to the Personality and Physical Description sections in `src/public/css/main.css`.

**Checkpoint**: User Story 1 is independently testable through the character profile integration suite.

## Phase 4: User Story 2 - Filter the character listing by selecting a tag (Priority: P1)

**Goal**: Immediately apply tag filter selections while preserving other selected filters and the existing no-JavaScript form submission.

**Independent Test**: Verify that changing a tag checkbox submits its containing GET form with the current selections, while the existing listing remains usable through its submit button without JavaScript.

### Tests for User Story 2

- [X] T004 [P] [US2] Add a `node:test` harness with minimal DOM stubs to verify tag-checkbox changes immediately submit the filter form and do not alter non-tag filter behavior in `tests/integration/enhance.test.js`.

### Implementation for User Story 2

- [X] T005 [US2] Add progressive enhancement for tag-checkbox changes in `src/public/js/enhance.js`; submit the existing filter form with its current checked tags and gender, and hide its Apply filters button only when the enhancement is active so the no-JavaScript fallback remains intact.

**Checkpoint**: User Story 2 is independently testable through the script interaction test and existing gallery filter contract tests.

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify behavior across the changed surfaces

- [X] T006 Run the focused and full validation commands in `specs/010-character-profile-tag-filters/quickstart.md`, confirming both user stories and existing NSFW behavior pass.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; the existing project is already initialized.
- **Foundational (Phase 2)**: No tasks; no shared infrastructure changes are needed.
- **User Stories (Phases 3-4)**: Independent and can be implemented in either order or in parallel.
- **Polish (Phase 5)**: Depends on both stories being implemented.

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories.
- **User Story 2 (P1)**: No dependencies on other stories.

### Within Each User Story

- Write and run the test task first; confirm it fails for the missing behavior.
- Implement the feature only after its corresponding test is in place.
- The two US1 implementation tasks affect different files and can proceed in parallel after T001.

### Parallel Opportunities

- T001 and T004 can be started independently.
- After T001, T002 and T003 can run in parallel.
- US1 and US2 can be implemented in parallel because their implementation files do not overlap.

## Parallel Example: User Story 1

```text
Task: T002 Move profile sections in src/views/pages/character.njk
Task: T003 Style profile descriptions in src/public/css/main.css
```

## Implementation Strategy

### MVP First

Both P1 stories are required for the requested feature. Implement and independently verify either story first; the profile-order story is a self-contained MVP slice.

### Incremental Delivery

1. Add and run the profile regression test, then reorder sections and align their typography.
2. Add and run the tag-interaction test, then submit the GET form on tag changes while retaining the no-JavaScript fallback.
3. Run all validation commands in the quickstart guide.

## Notes

- Every task uses the required checkbox, sequential ID, optional parallel marker, story label where applicable, and concrete file path.
- No migration, route, repository, service, dependency, or API work is in scope.
