# Feature Specification: Prominent Admin Actions and Designer as First-Image Artist

**Feature Branch**: `013-admin-actions-designer-artist`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "1. In the admin screen, the add buttons must come before the statistics and must be bigger and nicer, with a color that stands out. 2. When adding a character, I can choose the designer as also being the artist of the first image."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prominent "add" buttons at the top of the admin home (Priority: P1)

The admin opens the admin home page. The three creation actions (add a character, add an image, add a story) are the first thing they see, above the counts and statistics. Each one is a large, attractive button in a color that clearly stands out from the rest of the page.

**Why this priority**: Adding content is the admin's main task, and the actions are currently hidden below the statistics.

**Independent Test**: Open the admin home page and confirm the three buttons appear before the counts and statistics, are visibly larger than ordinary links, and use a distinct accent color.

**Acceptance Scenarios**:

1. **Given** the admin home page, **When** it loads, **Then** the "Add a character", "Add an image" and "Add a story" buttons appear before the counts and the image statistics.
2. **Given** the admin home page, **When** the admin looks at the buttons, **Then** they are noticeably larger than regular links and chips, and their color contrasts with the page and with other controls.
3. **Given** a phone-sized screen, **When** the page loads, **Then** the buttons remain fully visible, usable, and do not cause horizontal scrolling.
4. **Given** keyboard navigation, **When** the admin tabs through the page, **Then** the buttons are reached first and show a visible focus indicator.
5. **Given** a button, **When** it is activated, **Then** it opens the same creation form it opened before.

---

### User Story 2 - Designer is also the first image's artist (Priority: P1)

On the new-character form, the admin often credits the same person as both the character's designer and the artist of the first image. They tick a "same as designer" option instead of choosing the artist again.

**Why this priority**: It removes a repeated, error-prone step from every character creation where the two are the same person.

**Independent Test**: Create a character with the option ticked and confirm the first image is credited to the chosen designer without selecting an image artist.

**Acceptance Scenarios**:

1. **Given** the new-character form with a designer chosen, **When** the admin ticks "Same artist as the designer", **Then** the character is created and the first image is credited to that designer.
2. **Given** the option is ticked, **When** the form is submitted, **Then** a separate image artist is not required.
3. **Given** the option is ticked and the designer is a newly entered artist, **When** the character is created, **Then** one artist record is created and used for both roles.
4. **Given** the option is not ticked, **When** the admin submits, **Then** an image artist is required exactly as before.
5. **Given** the option is ticked, **When** the admin also selected a different image artist, **Then** the designer is used and the character is saved without error.
6. **Given** the option is ticked but no designer is chosen, **When** submitted, **Then** the usual missing-designer message appears and nothing is saved.
7. **Given** the form is redisplayed after a validation error, **When** it reappears, **Then** the option keeps its ticked or unticked state.

---

### Edge Cases

- A designer who has no website: the first image is credited to them with no link, as for any such artist.
- JavaScript unavailable: the option still works through a normal checkbox submitted with the form.
- The option never changes the designer or artist of any other image or character.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin home page MUST show the "Add a character", "Add an image" and "Add a story" actions before the counts and statistics.
- **FR-002**: The three actions MUST be presented as large buttons, clearly bigger than ordinary links and chips.
- **FR-003**: The buttons MUST use an accent color that stands out from the page and from other controls, while keeping text readable (sufficient contrast).
- **FR-004**: The buttons MUST be usable on small screens without horizontal scrolling, be keyboard-reachable with a visible focus state, and keep their existing destinations.
- **FR-005**: The new-character form MUST offer an option to use the designer as the artist of the first image.
- **FR-006**: When the option is selected, the first image MUST be credited to the chosen designer, and a separate image artist MUST NOT be required.
- **FR-007**: When the option is selected and the designer is newly entered, the system MUST create a single artist and use it for both roles.
- **FR-008**: When the option is not selected, the image artist MUST remain required, as today.
- **FR-009**: The option MUST work without JavaScript and MUST keep its state when the form is redisplayed after an error.
- **FR-010**: A failed submission MUST save nothing, including no new artist and no stored files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin sees all three creation buttons without scrolling on the admin home page on desktop and phone screens.
- **SC-002**: An admin can create a character whose designer and first-image artist are the same person with one fewer selection than before.
- **SC-003**: 100% of characters created with the option ticked have a first image credited to their designer.
- **SC-004**: The creation buttons meet accessible text-contrast standards.

## Assumptions

- Only the page's order, size and color of the three actions change; the counts and statistics are otherwise unchanged.
- The accent color is chosen from the site's existing palette family, consistent with its look.
- The option applies only to the new-character form, not to the edit forms or the standalone image form.
- The option is off by default.
- Only admins use these screens, as elsewhere in the site.
