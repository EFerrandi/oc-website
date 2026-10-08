# Tasks: Website-Wide Visual Refresh

**Input**: Design documents from `/specs/003-website-visual-refresh/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/visual-refresh.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story. Preserve the current behavior contract while completing each independently testable visual slice.

## Format

- [ ] T### [P?] [US#] Description with exact file paths

- **[P]**: Can be performed in parallel with other tasks without editing the same files or depending on incomplete changes.
- **[US#]**: User story label from `spec.md`.
- Every task names a file path or concrete validation artifact.

## Phase 1: Setup

**Purpose**: Establish the baseline and the full set of existing UI surfaces before changing presentation.

- [X] T001 Run `npm test`, `npm run test:nsfw`, and `node --test tests/integration/route-audit.test.js`; record the baseline results in the implementation session without changing test assertions.
- [X] T002 [P] Inventory the public and admin page templates under `src/views/pages/`, `src/views/admin/`, and shared components under `src/views/partials/`; map the inventory to the surface list in `specs/003-website-visual-refresh/contracts/visual-refresh.md`.

---

## Phase 2: Foundational

**Purpose**: Establish shared palette tokens and a behavior-preservation checkpoint before story-specific styling.

- [X] T003 Define the dark-neutral surfaces and purple brand colors (`#DD92FB`, `#8D79FF`, `#3E4EB4`) as shared CSS custom properties in `src/public/css/main.css`; include accessible foreground, border, focus, and state tokens, and do not assign the dark purple to text or boundaries unless the actual color pair meets the contract contrast ratio.
- [X] T004 Extend `tests/integration/accessibility.test.js` to assert that the shared stylesheet declares all three selected purple colors, retains a visible `:focus-visible` treatment and `overflow-wrap`, and does not replace the `.visually-hidden` clipping behavior with `display:none`.

**Checkpoint**: Shared color tokens exist and have a regression check; public and admin styling can now consume the same palette.

---

## Phase 3: User Story 1 - Browse a visually coherent gallery (Priority: P1)

**Goal**: Apply the common visual language to every public surface without changing its content, routes, or behavior.

**Independent Test**: Review the gallery, character profile, image detail, artist page, story detail, and relationship map; verify their shared palette, typography, spacing, cards, navigation, badges, and empty states. Check the selected styles and links against the visual refresh contract.

### Tests for User Story 1

- [X] T005 [P] [US1] Extend `tests/integration/accessibility.test.js` to assert that representative public responses retain the shared header, navigation, main/footer landmarks, image alt attributes, and accessible names after presentation changes.
- [X] T006 [P] [US1] Extend `tests/integration/relationship-map.test.js` with a regression assertion that map SVG labels, node focus treatment hooks, and map text-equivalent markup remain present after styling changes; do not change rating assertions.

### Implementation for User Story 1

- [X] T007 [US1] Restyle the shared public chrome in `src/public/css/main.css` for `.site-header`, `.site-controls`, `.site-nav`, `.site-main`, and `.site-footer`, preserving the NSFW form, admin control order, links, and responsive wrapping.
- [X] T008 [US1] Restyle the gallery and shared browsing components in `src/public/css/main.css`, including `.gallery`, `.card`, `.card-thumb`, filters, chips, badges, and empty states, with fluid columns and the shared tokens.
- [X] T009 [US1] Restyle character, image, artist, and story page content in `src/public/css/main.css`, including profile sections, image metadata, artist groupings, story disclosure, terms, permissions, and relationships; preserve existing document order and native controls.
- [X] T010 [US1] Restyle the relationship map in `src/public/css/main.css`, including map frame, nodes, avatars, relationship lines, labels, keyboard help, and text-equivalent presentation; preserve SVG geometry, labels, and interaction hooks.
- [X] T011 [US1] Make only the presentation-level template adjustments required for consistent public styling in `src/views/layout.njk`, `src/views/partials/header.njk`, `src/views/pages/gallery.njk`, `src/views/pages/character.njk`, `src/views/pages/image.njk`, `src/views/pages/artists.njk`, `src/views/pages/story.njk`, and `src/views/pages/relationships.njk`; retain all existing routes, text, form fields, and rating conditions.
- [X] T012 [US1] Run `npm test` and `npm run test:nsfw`; fix public styling regressions without weakening rating-safety or existing behavior assertions.

**Checkpoint**: All public pages share the visual system and remain functional independently of the admin refresh.

---

## Phase 4: User Story 2 - Use the admin area without a visual disconnect (Priority: P1)

**Goal**: Bring the dashboard, lists, forms, validation states, and destructive actions into the same visual system while preserving every admin workflow.

**Independent Test**: Sign in and inspect the dashboard, representative list, create/edit form, validation state, and delete section; verify shared visual tokens, legible statuses, and unchanged actions and CSRF fields.

### Tests for User Story 2

- [X] T013 [P] [US2] Extend `tests/integration/accessibility.test.js` to assert admin pages retain labelled controls, validation messages, and visible focus styling after the refresh.
- [X] T014 [P] [US2] Extend `tests/integration/admin-controls.test.js` to verify delete and return-to-admin controls keep their existing labels, destinations, and admin-only visibility; do not alter access-control assertions.

### Implementation for User Story 2

- [X] T015 [US2] Restyle the admin navigation and shared admin messages in `src/public/css/main.css` for `.admin-nav`, `.flash`, `.field-errors`, and admin page headings, using the same tokens as public pages.
- [X] T016 [US2] Restyle admin lists and dashboard cards in `src/public/css/main.css` and add only necessary styling hooks to `src/views/admin/dashboard.njk`, `src/views/admin/characters-list.njk`, `src/views/admin/images-list.njk`, `src/views/admin/stories-list.njk`, `src/views/admin/relationships.njk`, and `src/views/admin/taxonomy.njk`; preserve all labels and destinations.
- [X] T017 [US2] Restyle admin create/edit forms and destructive zones in `src/public/css/main.css` and add only necessary styling hooks to `src/views/admin/character-new.njk`, `src/views/admin/character-edit.njk`, `src/views/admin/image-new.njk`, `src/views/admin/image-edit.njk`, and `src/views/admin/story-form.njk`; preserve form methods, actions, input names, validation, and CSRF fields.
- [X] T018 [US2] Restyle the admin sign-in form in `src/public/css/main.css` and `src/views/admin/login.njk`, preserving authentication fields, error feedback, and submission behavior.
- [X] T019 [US2] Run `npm test` and `npm run test:nsfw`; confirm all admin controls remain available only under their existing authorization conditions.

**Checkpoint**: Admin workflows look integrated with the public website and remain behaviorally unchanged.

---

## Phase 5: User Story 3 - Read and operate the site at different screen sizes (Priority: P1)

**Goal**: Ensure the complete public and admin interface remains responsive, keyboard-operable, contrast-compliant, and readable without styling.

**Independent Test**: In a PC browser, inspect representative public and admin pages at 320px, 768px, 1280px, and 1920px. Check page overflow, long text, controls, visible keyboard focus, contrast pairs, and source order with CSS disabled.

### Tests for User Story 3

- [X] T020 [P] [US3] Extend `tests/integration/accessibility.test.js` to assert every rendered image keeps an alt attribute, every form control remains labelled, responsive viewport metadata remains present, and focus-indicator CSS remains defined.
- [X] T021 [US3] Add static stylesheet assertions in `tests/integration/accessibility.test.js` for `overflow-wrap`, responsive gallery/layout rules, visible focus styling, and no page-level `overflow-x: hidden` rule that could conceal clipped content.

### Implementation for User Story 3

- [X] T022 [US3] Audit and correct responsive rules in `src/public/css/main.css` so all shared chrome, gallery grids, profile blocks, relationship maps, admin navigation, and forms fit from 320px to 1920px without page-level horizontal scrolling or overlap.
- [X] T023 [US3] Audit all interactive states in `src/public/css/main.css` and adjust foreground/background pairs for body text, large text, control labels, borders, focus, badges, errors, success states, hover, and selected states to meet the contrast contract.
- [X] T024 [US3] Preserve and refine keyboard focus and reduced-motion behavior in `src/public/css/main.css`; ensure focus is never removed and motion is not required to understand state or operate a control.
- [ ] T025 [US3] Inspect representative public and admin pages in a PC browser with CSS disabled; correct only source-order or semantic issues caused by presentation hooks in `src/views/` while preserving content and behavior.
- [ ] T026 [US3] Run the viewport, keyboard, contrast, and styling-disabled scenarios in `specs/003-website-visual-refresh/quickstart.md`; record the viewport sizes and any corrections made in the implementation session.
- [X] T027 [US3] Run `npm test`, `npm run test:nsfw`, and `node --test tests/integration/route-audit.test.js`; all rating, route, accessibility, and interface-preservation checks must pass.

**Checkpoint**: The whole site remains readable and operable across supported widths, keyboard use, and styling availability.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation and perform end-to-end verification across the complete surface inventory.

- [X] T028 [P] Update `README.md` with the selected purple palette and the dark-neutral theme direction.
- [X] T029 Review every item in `specs/003-website-visual-refresh/contracts/visual-refresh.md` against the final templates and styles; resolve any missing surface or changed behavior.
- [ ] T030 Run `npm test`, `npm run test:nsfw`, and `node --test tests/integration/route-audit.test.js`; complete `specs/003-website-visual-refresh/quickstart.md` and confirm the route inventory and NSFW content behavior are unchanged.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) precedes all implementation.
- Foundational (Phase 2) precedes every user story.
- User Story 1 establishes public shared styling and should complete before the admin refresh.
- User Story 2 depends on the shared tokens from Phase 2 and follows US1 to reduce conflicting edits to `src/public/css/main.css`.
- User Story 3 follows US1 and US2 because it validates and corrects their combined responsive and accessibility behavior.
- Polish follows all three stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on another story.
- **US2 (P1)**: Starts after Phase 2; logically follows US1 to avoid concurrent edits to the shared stylesheet.
- **US3 (P1)**: Requires the public and admin surfaces from US1 and US2 to be present.

### Parallel Opportunities

- T002 can run alongside T001 because it is a read-only inventory.
- T004 is independent of the token implementation, but should be merged before visual changes begin.
- Within US1, T005 and T006 are separate test files; T008, T009, and T010 are separate CSS sections that may be drafted independently but must be merged carefully into `main.css`; T007 and T011 touch shared chrome/templates and should be coordinated.
- Within US2, T013 and T014 are separate test files; T016, T017, and T018 should be coordinated because they all update `main.css`.
- Within US3, T020 and T021 share a test file and are sequential; the responsive, contrast, and keyboard tasks all share `main.css` and should be implemented as one coordinated stylesheet pass.
- T028 is independent of validation and can run in parallel with T029 after US3.

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 to deliver a coherent public site.
3. Validate public pages and NSFW behavior before continuing.

### Incremental Delivery

1. Apply shared palette tokens.
2. Refresh public pages (US1), then admin pages (US2).
3. Run the complete responsive/accessibility pass (US3) across both.
4. Perform final route, rating, and visual contract checks.

## Notes

- Every style change must preserve the existing markup contract and behavior unless a necessary presentation hook is added without changing semantics or control behavior.
- Recheck computed color pairs rather than assuming a palette token is accessible in every role.
- Do not add a CSS framework, build step, route, dependency, or database change for this presentation-only feature.
