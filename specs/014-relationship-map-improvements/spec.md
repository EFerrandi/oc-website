# Feature Specification: Relationship Map Improvements

**Feature Branch**: `014-relationship-map-improvements`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "In the relationship tabs, make it so we can move while pressing a mouse click. Also make sure to always display the full text lengths. Allow relationships to be one sided or two sided. Use the avatar of the character in the display, not the first image."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Move things on the map by click-and-drag (Priority: P1)

A visitor on the relationships page presses and holds the mouse button on a character and drags it to a new position, so crowded maps can be untangled. Pressing and holding on an empty part of the map and dragging moves the whole map view, so large maps can be explored.

**Why this priority**: Moving around the map is the first thing the visitor asked for, and a crowded map is hard to read without it.

**Independent Test**: Open the relationships page, press on a character, drag, release: the character and its connecting lines follow the pointer and stay where released. Press on empty space and drag: the whole map shifts.

**Acceptance Scenarios**:

1. **Given** a map, **When** the visitor holds the mouse button on a character and moves the pointer, **Then** the character follows the pointer and its relationship lines and labels follow it.
2. **Given** a drag has just ended on a character, **When** the button is released, **Then** the character stays at the new position and the character page does not open.
3. **Given** a character, **When** the visitor clicks it without moving, **Then** the character page opens as before.
4. **Given** empty space on the map, **When** the visitor holds and drags, **Then** the whole map view moves with the pointer.
5. **Given** a touch screen, **When** the visitor drags a character with a finger, **Then** it moves like with the mouse, and dragging empty space still scrolls the page.
6. **Given** a reload, **When** the page loads, **Then** the default arrangement is shown (positions are not remembered).
7. **Given** moving is unavailable (no JavaScript), **When** the page loads, **Then** the map is still fully readable.

---

### User Story 2 - Always show full relationship text (Priority: P1)

A visitor reads every relationship label and character name in full, never cut off with an ellipsis.

**Why this priority**: Truncated labels hide meaning that the admin wrote on purpose.

**Independent Test**: Create a relationship with a very long label; the full label appears on the map, readable without hovering.

**Acceptance Scenarios**:

1. **Given** a relationship with a long label, **When** the map is displayed, **Then** the whole label is visible, wrapped over several lines if needed.
2. **Given** a long character name, **When** the map is displayed, **Then** the whole name is visible.
3. **Given** long labels, **When** the map is displayed, **Then** labels do not hide character avatars, and the map is still usable on a phone.
4. **Given** the text-only equivalent of the map, **When** it is read, **Then** it also contains the full text.

---

### User Story 3 - One-sided and two-sided relationships (Priority: P1)

The admin can mark a relationship as one-sided (A feels something about B, not necessarily the reverse) or two-sided (mutual). The map shows the difference.

**Why this priority**: It changes what the admin can express and what is stored for each relationship.

**Independent Test**: Create a one-sided and a two-sided relationship between the same two characters; the map shows an arrow in one direction for the first and a mutual line for the second.

**Acceptance Scenarios**:

1. **Given** the relationship form, **When** the admin creates or edits a relationship, **Then** they can choose "One-sided" or "Two-sided"; the default is two-sided.
2. **Given** a one-sided relationship, **When** the map is displayed, **Then** it shows a direction from the first character to the second, and the text equivalent states the direction.
3. **Given** a two-sided relationship, **When** the map is displayed, **Then** it shows no direction.
4. **Given** relationships created before this feature, **When** the map is displayed, **Then** they appear as two-sided, unchanged.
5. **Given** a one-sided relationship, **When** the admin edits it, **Then** they can switch direction (swap the two characters) or change it to two-sided.
6. **Given** the character details page, **When** it lists relationships, **Then** each states whether it is one-sided or two-sided.
7. **Given** the rating gate, **When** a relationship is NSFW, **Then** it remains hidden unless NSFW is enabled, whatever its sidedness.

---

### User Story 4 - Use each character's avatar (Priority: P2)

Everywhere on the relationship map, a character is shown with its designated avatar (with its crop), not with its first image.

**Why this priority**: It corrects a mismatch with the rest of the site; characters look different on the map than in the gallery.

**Independent Test**: Give a character an avatar that is not its first image; the relationship map shows that avatar.

**Acceptance Scenarios**:

1. **Given** a character whose avatar differs from its first image, **When** the map is displayed, **Then** the avatar is shown.
2. **Given** an avatar with a saved crop, **When** the map is displayed, **Then** the crop is applied as elsewhere on the site.
3. **Given** a character with no visible avatar at the current rating setting, **When** the map is displayed, **Then** the same placeholder as in the gallery is shown, and no hidden NSFW image leaks.

### Edge Cases

- Very long single words in a label (no spaces) must still be fully visible.
- Many long labels on the same pair of characters must not overlap unreadably.
- Dragging a character outside the visible area is not possible; it stays inside the map.
- A one-sided relationship and a two-sided one with the same label between the same pair: the pair counts as a duplicate. Two one-sided relationships in opposite directions with the same label are both allowed; the same direction and label is a duplicate.
- Switching a two-sided relationship to one-sided requires choosing a direction.

## Clarifications

### Session 2026-11-13

- Q: Can two characters have a one-sided relationship in each direction with the same label? → A: Yes, they are two separate one-sided relationships. The duplicate rule compares direction for one-sided relationships; two-sided relationships stay direction-independent.
- Q: How is a very long relationship label shown in full? → A: It wraps onto several lines and the map grows taller.
- Q: On touch screens, does dragging empty space pan the map? → A: No. Touch drags characters only; empty space still scrolls the page. Mouse dragging of empty space pans the view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A visitor MUST be able to move a character on the relationship map by pressing and holding the mouse button and dragging; its lines and labels MUST follow.
- **FR-002**: A drag MUST NOT open the character page; a click without movement MUST still open it.
- **FR-003**: A visitor using a mouse MUST be able to move the whole map view by dragging empty space; on touch screens empty space keeps scrolling the page.
- **FR-004**: Moving a character MUST work with touch as well as mouse, and MUST NOT be remembered across page loads.
- **FR-005**: The map MUST remain fully readable and usable without JavaScript.
- **FR-006**: Relationship labels and character names MUST always be displayed in full, with no truncation, on the map and in its text equivalent.
- **FR-007**: Long text MUST NOT cover avatars and MUST remain readable on small screens.
- **FR-008**: Each relationship MUST be either one-sided or two-sided; the admin MUST be able to set it on creation and change it on edit; the default is two-sided.
- **FR-009**: A one-sided relationship MUST have a direction (from one character to the other), shown on the map and stated in the text equivalent; a two-sided one MUST show no direction.
- **FR-010**: Existing relationships MUST become two-sided with no visible change.
- **FR-011**: The character details page MUST state each relationship's sidedness and direction.
- **FR-012**: The content-rating rules MUST apply identically to both kinds of relationship.
- **FR-013**: The relationship map MUST show each character's designated avatar with its crop, using the same rating-aware fallback and placeholder as the gallery.

### Key Entities

- **Relationship**: connects two characters with a label and a rating; now also has a sidedness (one-sided or two-sided). For one-sided relationships the order of the two characters gives the direction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can reposition any character and see the result immediately in a single press-drag-release gesture.
- **SC-002**: 100% of relationship labels and character names are shown in full on the map and its text equivalent.
- **SC-003**: Visitors can tell at a glance, without reading text, whether a relationship is one-sided or two-sided.
- **SC-004**: 100% of characters on the map show the same avatar as in the gallery.
- **SC-005**: Zero NSFW avatars or relationships are visible when NSFW is off.

## Assumptions

- "Relationship tabs" refers to the public relationships page with its SFW and NSFW maps.
- Dragging a character already exists in some form; this feature makes it work as a reliable press-drag-release with the mouse and adds moving the whole view. Positions are still not remembered, per the earlier decision.
- A one-sided relationship points from its first character to its second; the label describes the first's view of the second.
- Labels wrap over multiple lines and the map grows taller to fit (confirmed).
- Zooming is out of scope.
