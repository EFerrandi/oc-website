# Tasks: Visible Tags and Preserved Line Breaks

**Input**: Design documents from `specs/011-visible-tags-and-line-breaks/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-changes.md`

**Tests**: Included to cover the required filter behavior, text formatting, accessibility, and existing NSFW guarantees.

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

No setup tasks are required; the feature uses existing application structure and dependencies.

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by user stories

No foundational tasks are required; the two user stories can be implemented independently.

## Phase 3: User Story 1 - Browse all character filters at a glance (Priority: P1)

**Goal**: Show all gender choices and tags without a collapsed control and immediately apply gender/tag selection while preserving the other filters.

**Independent Test**: Verify the server-rendered listing shows all native gender and tag controls with no collapsed disclosure, GET filtering preserves both `gender` and repeated `tag` values, changes submit the existing form when JavaScript is active, and manual form submission remains available without JavaScript.

### Tests for User Story 1

- [X] T001 [P] [US1] Update gallery filter assertions in `tests/contract/gallery.test.js` to require all gender and tag choices in visible markup without a `<details>` disclosure, and verify combined gender/tag query state is rendered after filtering.
- [X] T002 [P] [US1] Extend the enhancement test harness in `tests/integration/enhance.test.js` to verify both gender-radio and tag-checkbox changes submit the existing filter form, and verify the manual Apply button remains visible when no supported filter controls are enhanced.
- [X] T003 [P] [US1] Update filter accessibility assertions in `tests/integration/accessibility.test.js` to confirm gender and tag choices remain labelled, keyboard-operable, visibly focusable, and wrapped for narrow screens without a disclosure summary.

### Implementation for User Story 1

- [X] T004 [P] [US1] Remove the collapsed tag disclosure and render every tag checkbox directly in the existing filter form in `src/views/partials/filters.njk`, preserving checked tags, the single-select gender group, and the Apply filters fallback.
- [X] T005 [P] [US1] Enhance the existing filter form in `src/public/js/enhance.js` so changes to gender radios or tag checkboxes submit the form; hide the Apply filters button only when change listeners have been attached to available controls.
- [X] T006 [US1] Adjust filter layout styles in `src/public/css/main.css` so all gender and tag choices remain visible, wrap within the available width on mobile, and retain visible keyboard focus.

**Checkpoint**: User Story 1 works with and without JavaScript, and combined gender/tag filtering remains reloadable and shareable.

## Phase 4: User Story 2 - Preserve line breaks in authored text (Priority: P1)

**Goal**: Preserve single line breaks and blank-line paragraph separation in character descriptions, inline and standalone story bodies, and terms of use, with consistent CRLF/LF/CR handling and escaped text.

**Independent Test**: Render text containing single newlines, blank lines, CRLF, LF, and CR in each in-scope content area; verify every line boundary is visible, blank lines separate paragraphs, whitespace-only content does not create empty output, and HTML-like text is escaped.

### Tests for User Story 2

- [X] T007 [P] [US2] Extend character profile integration assertions in `tests/integration/character-profile.test.js` to cover single-line and blank-line breaks in personality, physical description, inline story body, and terms of use, including CRLF/LF/CR variants, whitespace-only input, and escaped markup.
- [X] T008 [P] [US2] Add standalone story rendering and rating-gate assertions in `tests/integration/story-display.test.js` for single and blank-line breaks with mixed line endings, escaped text, and unchanged NSFW visibility.

### Implementation for User Story 2

- [X] T009 [P] [US2] Normalize CRLF, LF, and CR and render each authored line boundary while retaining paragraph spacing in Personality, Physical Description, inline story bodies, and Terms of use in `src/views/pages/character.njk`; omit empty description/story paragraphs and keep all content escaped.
- [X] T010 [P] [US2] Normalize CRLF, LF, and CR and preserve single and blank-line breaks in the standalone story body in `src/views/pages/story.njk`, rendering story text as escaped content.

**Checkpoint**: User Story 2 preserves authored line boundaries on profile and standalone story pages without changing which rated stories the server returns.

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify both stories and regression-sensitive behavior

- [X] T011 Run the focused contract and integration suites listed in `specs/011-visible-tags-and-line-breaks/quickstart.md`, covering `tests/contract/gallery.test.js`, `tests/integration/accessibility.test.js`, `tests/integration/character-profile.test.js`, `tests/integration/story-display.test.js`, and `tests/integration/enhance.test.js`.
- [X] T012 Run `npm test` and `npm run test:nsfw` from `package.json` to verify the complete application and content-rating safeguards after both stories are implemented.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; the existing project is initialized.
- **Foundational (Phase 2)**: No tasks; no shared infrastructure changes are needed.
- **User Stories (Phases 3-4)**: Independent and can be implemented in either order or in parallel.
- **Polish (Phase 5)**: Depends on both stories being implemented.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on User Story 2.
- **User Story 2 (P1)**: No dependency on User Story 1.

### Within Each User Story

- Write and run the story's tests first; confirm they fail for the missing behavior before implementation.
- User Story 1 test tasks can run in parallel. Its implementation tasks touch separate template, script, and stylesheet files.
- User Story 2 test tasks can run in parallel. Its implementation tasks touch separate public templates.
- Complete the relevant story independently before moving to cross-cutting validation.

### Parallel Opportunities

- T001, T002, and T003 can run in parallel.
- After tests are in place, T004, T005, and T006 can run in parallel.
- T007 and T008 can run in parallel.
- After tests are in place, T009 and T010 can run in parallel.
- The two user stories can be implemented in parallel because their implementation files do not overlap.

## Parallel Example: User Story 1

```text
Task: T004 Expand tag filter choices in src/views/partials/filters.njk
Task: T005 Submit gender and tag changes in src/public/js/enhance.js
Task: T006 Keep all filter choices visible and responsive in src/public/css/main.css
```

## Parallel Example: User Story 2

```text
Task: T009 Preserve line breaks in src/views/pages/character.njk
Task: T010 Preserve line breaks in src/views/pages/story.njk
```

## Implementation Strategy

### MVP First

User Story 1 is the smallest independent MVP: make all filter choices visible and preserve the existing server-side query behavior. User Story 2 can then be delivered independently.

### Incremental Delivery

1. Add and run User Story 1 contract, enhancement, and accessibility tests; implement the visible and immediate gender/tag controls.
2. Add and run User Story 2 profile and standalone-story rendering tests; implement newline normalization and rendering.
3. Run focused, full, and dedicated NSFW validation.

## Notes

- Every task uses the required checkbox, sequential ID, parallel marker where applicable, story label for story tasks, and concrete file path or validation target.
- No migration, route, repository, service, dependency, or API work is in scope.

## Phase 6: Convergence

- [X] T013 Treat whitespace-only separator lines as paragraph boundaries in character descriptions and inline/standalone story bodies, and add rendering regressions in `tests/integration/character-profile.test.js` and `tests/integration/story-display.test.js`, per FR-008 (partial).
