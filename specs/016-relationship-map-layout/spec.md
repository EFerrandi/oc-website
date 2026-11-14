# Feature Specification: Relationship Map Interaction and Layout

**Feature Branch**: `016-relationship-map-layout`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "pour l'affichage des relations, en maintenant le click sur un visage je peux bouger uniquement ce personnage, comme tu l'as fait pour la selection avec TAB. Retire les autres modes de déplacements. Met les deux zones l'une sous l'autre et n'hésite pas à faire de grandes cartes, tout doit rester lisibles. Comme c'est fait dans l'onglet "connections" du site www.westmarches.games."

## Clarifications

### Session 2026-11-14

- Q: On a narrow phone, if a dense relationship map cannot remain readable at the available width, which should take priority? → A: Keep faces and text large, allowing horizontal scrolling inside the map only; the page itself must not overflow horizontally.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Move one character at a time (Priority: P1)

A visitor presses and holds a character's face and drags it to reposition only that character. Moving an individual character is the sole way to reposition the relationship display; the visitor cannot move the whole map or reposition a focused character with keyboard arrows. Keyboard focus and activation remain available to navigate to a character page.

**Why this priority**: The visitor needs to arrange characters without accidentally shifting the whole map or moving another character.

**Independent Test**: Open either relationship area, drag one character's face, and confirm only that character and its connected relationships move; try dragging the empty area and using arrow keys on a focused character and confirm neither repositions the map.

**Acceptance Scenarios**:

1. **Given** a relationship map, **When** a visitor presses and holds a character's face and drags it, **Then** only that character moves and its connecting lines and labels follow.
2. **Given** a visitor starts dragging a character, **When** the pointer or finger is released, **Then** the character remains at the moved position for the current page view and a drag does not activate the character link.
3. **Given** a visitor clicks or taps a character without dragging, **When** the interaction ends, **Then** the character page opens as before.
4. **Given** a visitor presses and drags empty map space with a mouse or touch, **When** the gesture ends, **Then** no character or map position has moved.
5. **Given** a character is focused using Tab, **When** the visitor presses an arrow key, **Then** the character is not repositioned; Enter or an equivalent activation still opens its page.
6. **Given** the page is reloaded, **When** either relationship area is displayed, **Then** its initial arrangement is restored.
7. **Given** JavaScript is unavailable, **When** a visitor opens the relationships page, **Then** both maps, their labels, and their character links remain available and readable.

### User Story 2 - Read both relationship areas clearly (Priority: P1)

A visitor sees the SFW and NSFW relationship areas one after the other, with large, readable character cards and relationship text that is not clipped or truncated.

**Why this priority**: A clear vertical layout and legible cards make the relationship information understandable without requiring visitors to pan around or guess at hidden text.

**Independent Test**: Open the relationships page at desktop and narrow phone widths; verify the SFW area precedes the NSFW area, cards and labels remain readable, and any horizontal scrolling is confined to a map frame.

**Acceptance Scenarios**:

1. **Given** both relationship areas are available, **When** the page is displayed at any viewport width, **Then** the complete SFW area appears above the complete NSFW area.
2. **Given** a map has many characters or long relationship text, **When** it is displayed, **Then** cards are large enough for readable faces, names, and relationship details, and text wraps instead of being clipped or replaced with an ellipsis.
3. **Given** a narrow phone viewport and a dense relationship map, **When** the page is displayed, **Then** both areas and their cards remain readable, any horizontal scrolling is confined to the map frame, and the page itself does not overflow horizontally.
4. **Given** maps with different amounts of content, **When** the page is displayed, **Then** each area can grow to fit its content without hiding cards, labels, or relationships.

### User Story 3 - Preserve keyboard navigation while honoring the movement restriction (Priority: P2)

A visitor who navigates by keyboard can still focus and activate character links, while the relationship positions cannot be changed by keyboard. The project records this deliberate exception to its general keyboard-operability principle before the feature is delivered.

**Why this priority**: Keyboard navigation to character pages should remain intact, and the explicit exception prevents this feature's movement restriction from being mistaken for an accidental accessibility regression.

**Independent Test**: Navigate through the relationship page with Tab and Enter, confirm character links work, confirm arrow keys do not move nodes, and verify the project constitution records this specific movement exception.

**Acceptance Scenarios**:

1. **Given** a visitor uses only a keyboard, **When** they tab through the relationship display and activate a character, **Then** focus and navigation continue to work.
2. **Given** a visitor focuses a character node, **When** they press arrow keys, **Then** the node does not move.
3. **Given** the feature is delivered, **When** the project constitution is reviewed, **Then** it explicitly documents the approved exception for keyboard-based repositioning and the retained keyboard navigation behavior.

### Edge Cases

- Releasing the pointer outside the character face or cancelling a touch gesture ends the drag cleanly without moving any other character.
- A drag that starts on the character's name does not reposition it; the name remains a working keyboard- and pointer-activatable link.
- A short press with no meaningful pointer movement remains a normal character-link activation.
- Long character names and relationship labels remain fully visible when cards grow or the layout narrows; on a narrow phone, a dense map may scroll horizontally inside its own frame.
- An empty SFW or NSFW area still occupies its expected position in the vertical order and communicates that it has no relationships.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A visitor MUST be able to reposition a character only by pressing and holding that character's face and dragging it.
- **FR-002**: Moving a character MUST move only that character; its connected relationship lines and labels MUST follow its position.
- **FR-003**: The relationship display MUST NOT support repositioning by dragging empty map space or by keyboard arrow keys.
- **FR-004**: A drag MUST NOT activate the character link; a click or tap without dragging MUST continue to open the character page.
- **FR-005**: Touch users MUST be able to move an individual character by dragging its face; gestures starting on empty space MUST NOT move the map or any character.
- **FR-006**: Character positions MUST remain temporary and return to their default arrangement after a page reload.
- **FR-007**: Keyboard users MUST retain the ability to focus character links and activate them using the keyboard, even though keyboard-based repositioning is not supported.
- **FR-008**: The SFW relationship area MUST appear above the NSFW relationship area; the areas MUST NOT be displayed side by side.
- **FR-009**: Character cards MUST be large enough for character faces, complete names, and relationship details to remain legible.
- **FR-010**: Character names and relationship text MUST be displayed in full without clipping or ellipses; long content MUST wrap and the relevant area MUST grow to fit it.
- **FR-011**: The relationship page MUST remain within the viewport width at narrow phone widths; if a dense map needs more room to preserve readable card and text sizes, horizontal scrolling MUST be confined to that map's frame.
- **FR-012**: The project constitution MUST document the approved exception to keyboard-based repositioning before delivery, while preserving keyboard focus and activation of character links.
- **FR-013**: Without JavaScript, the relationship areas, character links, and complete relationship text MUST remain available and readable.

### Key Entities

- **Relationship area**: One of the SFW or NSFW sections of the relationships page, each containing its own character map and relationship details.
- **Character card**: A character's face, name, and link within a relationship map; it is the sole pointer/touch target that initiates repositioning.
- **Relationship detail**: The complete text and visual connection between characters, which follows a moved character and remains readable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pointer/touch drag gestures that begin on a character move only that character; no gesture beginning on empty map space repositions the display.
- **SC-002**: 0 character positions change as a result of keyboard arrow-key input, while all character links remain reachable and activatable by keyboard.
- **SC-003**: The SFW area appears before the NSFW area in 100% of tested viewport widths.
- **SC-004**: 100% of character names and relationship text are displayed in full, with no clipping or ellipsis.
- **SC-005**: The page itself has no horizontal overflow at phone viewport widths; any required horizontal scrolling is confined to the dense map frame.
- **SC-006**: With JavaScript unavailable, both relationship areas and all their text and character links remain accessible.

## Assumptions

- The two areas refer to the existing SFW and NSFW relationship maps.
- Face dragging continues to work for mouse and touch; dragging on empty space does not prevent normal page scrolling on touch devices.
- A map frame may scroll horizontally on narrow screens to preserve card and text legibility; the page itself does not overflow horizontally.
- Tab remains the means to focus character links. Removing keyboard repositioning does not remove keyboard navigation or activation.
- Card sizing is content-driven and may vary with viewport and text length; the requirement is legibility and completeness, not a fixed pixel size.
- The referenced Connections tab is a visual and interaction reference only; this feature does not reproduce its branding or unrelated behavior.
- Relationship data, rating rules, directionality, and character-page relationship details are unchanged.
