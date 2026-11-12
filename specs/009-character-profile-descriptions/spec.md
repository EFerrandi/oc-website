# Feature Specification: Character Profile Descriptions

**Feature Branch**: `009-character-profile-descriptions`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "just before the story part, add a personnality zone and physical description zone"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describe a character's personality and appearance (Priority: P1)

As an admin, I can add or update a personality description and a physical description for each character so visitors can learn more about them.

**Why this priority**: These details are the purpose of the requested profile additions and need to be manageable using the existing character administration flow.

**Independent Test**: Add both descriptions to a character, save, reopen its edit form, and verify both values remain.

**Acceptance Scenarios**:

1. **Given** the admin is creating or editing a character, **When** they enter personality and physical-description text and save, **Then** both values are saved for that character.
2. **Given** either field is left blank, **When** the character is saved, **Then** saving succeeds and the blank value remains empty.
3. **Given** the admin edits one description, **When** the character is saved, **Then** the other description is unchanged.

---

### User Story 2 - Read the character's personality and physical description (Priority: P1)

As a visitor, I can read a character's personality and physical description on the character details page, immediately before its stories.

**Why this priority**: The requested information is useful only if it is presented with the character's existing profile content.

**Independent Test**: Open a character page with both descriptions and verify the Personality and Physical Description sections appear in that order immediately before Stories.

**Acceptance Scenarios**:

1. **Given** a character has both descriptions, **When** a visitor opens its details page, **Then** Personality appears first, Physical Description second, and both are immediately before Stories.
2. **Given** one description is blank, **When** the page is displayed, **Then** the non-empty description remains readable and no empty content section is shown for the blank field.
3. **Given** a description contains multiple paragraphs, **When** the page is displayed, **Then** its paragraph breaks are preserved.

### Edge Cases

- Existing characters without either description continue to display normally.
- Clearing a description removes that section from the public profile after saving.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each character MUST have an optional Personality description and an optional Physical Description.
- **FR-002**: The admin MUST be able to enter, edit, and clear each description while creating or editing a character.
- **FR-003**: The system MUST save each description with its character and preserve the other description when only one is changed.
- **FR-004**: The character details page MUST display non-empty Personality and Physical Description sections immediately before Stories, in that order.
- **FR-005**: The character details page MUST preserve paragraph breaks in both descriptions.
- **FR-006**: Empty descriptions MUST NOT produce empty public profile sections.

### Key Entities *(include if feature involves data)*

- **Character**: Gains two optional text values: personality and physical description.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can save, reopen, edit, and clear either description without changing the other description.
- **SC-002**: For every character with both descriptions, the public profile presents Personality and Physical Description in that order immediately before Stories.
- **SC-003**: All non-empty paragraphs in either description remain separated in the public profile.
- **SC-004**: Characters with empty descriptions display no empty description sections.

## Assumptions

- Both descriptions are optional plain text, may contain multiple paragraphs, and are not content-rated separately from the character profile.
- The new sections appear after the character's existing relationships section and immediately before Stories.
- The section headings and admin field labels use the site's existing English UI language.
