# Tasks: Character Profile Descriptions

**Input**: Design documents from `specs/009-character-profile-descriptions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-changes.md

**Tests**: Included, as required by the plan and project constitution.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup needed; this feature uses the existing project, dependencies, migrations, and test harness.

---

## Phase 2: Foundational

**Purpose**: Add nullable storage for both optional character descriptions. This prerequisite enables creation, editing, and public display.

- [X] T001 Add a forward-only migration at `src/db/migrations/005_character_profile_descriptions.sql` with nullable `personality TEXT` and `physical_description TEXT` columns; existing characters must remain valid and read as null.

**Checkpoint**: The existing migration runner applies the new schema without changing prior migration files.

---

## Phase 3: User Story 1 - Describe a character's personality and appearance (Priority: P1) 🎯 MVP

**Goal**: Admins can add, edit, and clear the optional descriptions, and changing one preserves the other.

**Independent Test**: Create a character with both fields, reopen and edit it, clear either field, and verify values persist independently.

### Tests for User Story 1

- [X] T002 [P] [US1] In `tests/integration/admin.test.js`, add tests for create/edit persistence of both descriptions, blank values accepted and cleared, unchanged field retained when the other changes, and submitted descriptions redisplayed after validation errors.

### Implementation for User Story 1

- [X] T003 [US1] In `src/services/characters.js`, normalize optional `personality` and `physical_description` inputs by trimming outer whitespace and storing blank values as null; include both in character creation and the existing update transaction.
- [X] T004 [US1] In `src/views/admin/partials/character-fields.njk`, add optional multiline textareas labelled `Personality` and `Physical description`, supporting both snake_case submitted values and stored camelCase values, with all submitted content redisplayed on validation errors.
- [X] T005 [US1] In `src/routes/admin/characters.js`, select and pass `personality` and `physicalDescription` into the edit form values, including the validation-error render, without changing unrelated character behavior.

**Checkpoint**: T002 passes for both creation and edit; both optional values can be cleared independently.

---

## Phase 4: User Story 2 - Read the character's personality and physical description (Priority: P1)

**Goal**: Visitors can read each non-empty description in order immediately before Stories, with paragraph breaks preserved.

**Independent Test**: Render a character profile with both fields set and verify Personality then Physical Description appear immediately before Stories; verify empty fields omit their sections.

### Tests for User Story 2

- [X] T006 [P] [US2] In `tests/integration/character-profile.test.js`, add tests for profile section order after Relationships and immediately before Stories, omission of null/blank sections, preservation of multiple paragraphs, and escaped HTML text.

### Implementation for User Story 2

- [X] T007 [US2] In `src/repositories/characters.js`, select `personality` and `physical_description` as `personality` and `physicalDescription` for character detail results, without adding queries.
- [X] T008 [US2] In `src/views/pages/character.njk`, render non-empty Personality and Physical Description sections in that order between Relationships and Stories; split on blank lines into escaped paragraphs and omit empty sections.

**Checkpoint**: T006 passes for populated, blank, and multi-paragraph values.

---

## Phase 5: Polish

- [X] T009 Run `npm test`, `npm run test:nsfw`, and `git diff --check`; all must pass.
- [ ] T010 Follow `specs/009-character-profile-descriptions/quickstart.md` and verify the admin and public profile flows manually.

---

## Dependencies & Execution Order

- T001 is a prerequisite for all story work.
- US1: T002 → T003/T004/T005; implementation tasks share form and service flow and should be integrated before validating.
- US2: T006 → T007 → T008.
- The stories depend on T001 but can otherwise be implemented independently; polish follows both.

## Parallel Opportunities

- US1 and US2 test work can proceed independently after T001.
- After tests are written, US1 service and form tasks affect separate files and can proceed in parallel; the route task depends on understanding the service/form values.
- US2 repository work and the profile template work affect separate files and can proceed in parallel after the profile tests are in place.

## Implementation Strategy

MVP is US1: add storage and admin editing so descriptions can be managed. Then complete US2 to expose the saved information publicly. Finish with automated and manual validation.

## Phase 6: Convergence

- [X] T011 Normalize description line endings before splitting paragraphs and add an integration test for CRLF paragraph breaks in `tests/integration/character-profile.test.js` per FR-005, US2/AC3 (partial).

## Phase 7: Convergence

- [ ] T012 Run and record the manual admin and public-profile walkthrough in `specs/009-character-profile-descriptions/quickstart.md` per SC-001 through SC-004 (partial).

## Phase 8: Convergence

- [ ] T013 Complete the manual admin and public-profile walkthrough in `specs/009-character-profile-descriptions/quickstart.md`, record results, and close T010 and T012 per US1/SC-001 and US2/SC-002–SC-004 (partial).
