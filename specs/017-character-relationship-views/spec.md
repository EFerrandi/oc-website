# Feature Specification: Character Relationship Views

**Feature Branch**: `017-character-relationship-views`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "/skill:speckit-specify for the relation ship display : 1. In the character sheep, add a section shere we can see avatars and names centered around the current character 2. For all relationship displays, always be sure to have the least amount of lignes crossing together. Use as many space as you need to ensure that 3. When the mouse is over a character, highlight only their relations to help the reading"

## Clarifications

### Session 2026-11-14

- Q: How should the diagrams define the fewest crossing lines when a relationship set cannot be drawn with zero crossings? → A: Guarantee zero crossings whenever possible; otherwise use the best arrangement found within the existing comparison baseline.
- Q: Should the related characters’ avatars and names in a character profile diagram open those characters’ profiles when selected? → A: Yes; each related character’s avatar and name links to that character’s profile.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a character's connections from their profile (Priority: P1)

When a visitor opens a character sheet, they can see a relationship diagram centered on that character. The directly connected characters appear around it with their avatars and names, making that character's connections easy to understand without leaving the profile.

**Why this priority**: Visitors need to understand a character's relationships in the context of that character's own profile.

**Independent Test**: Open a character sheet with multiple relationships and verify that the character is centered, each directly connected character has an avatar and name, and the visible relationship labels and links correspond to the current content setting.

**Acceptance Scenarios**:

1. **Given** a character has visible relationships, **When** a visitor opens its profile, **Then** a relationship section shows the current character in the center and each directly connected character around it with an avatar and name.
2. **Given** a character has multiple relationships to another character, **When** the profile diagram is shown, **Then** each relationship remains represented and associated with the correct characters.
3. **Given** a visitor selects a related character's avatar or name, **When** the link is activated, **Then** that character's profile opens.
4. **Given** the visitor has not opted into NSFW content, **When** the profile diagram is shown, **Then** it contains only relationships and characters visible under the existing rating rules.
5. **Given** a character has no relationships visible at the current content setting, **When** its profile is opened, **Then** the relationship section communicates that no relationships are available at that setting.
6. **Given** JavaScript is unavailable, **When** a visitor opens the profile, **Then** the relationship diagram's characters, names, and relationship details remain available.

### User Story 2 - Read relationship diagrams with fewer crossing lines (Priority: P1)

Visitors can read connections in every relationship diagram, including the global SFW and NSFW displays and profile diagrams. Each display arranges its characters to minimize crossing relationship lines, using additional space when useful while keeping every character and relationship detail visible.

**Why this priority**: Crossed lines make it difficult to tell which characters are connected, especially in dense maps.

**Independent Test**: Render relationship sets with known low-crossing or crossing-free arrangements in each display, compare the rendered crossings against the existing baseline, and verify that nodes, names, and labels remain complete.

**Acceptance Scenarios**:

1. **Given** a relationship set that can be displayed without crossings, **When** any relationship diagram is rendered, **Then** it uses a zero-crossing arrangement.
2. **Given** a relationship set for which crossings cannot be avoided, **When** any relationship diagram is rendered, **Then** its arrangement has no more crossings than the existing arrangement for the same relationship set.
3. **Given** reducing crossings requires a wider or taller drawing, **When** the diagram is rendered, **Then** it may use additional space while keeping its characters, names, and relationship labels complete and readable.
4. **Given** multiple relationships connect the same characters, **When** the diagram is rendered, **Then** the lines and their details remain distinguishable and are included when minimizing crossings.

### User Story 3 - Trace one character's relationships at a glance (Priority: P2)

A visitor can point to or keyboard-focus a character in any relationship diagram to emphasize that character's relationships. Unrelated relationship lines and labels become visually subdued, while the characters and the rest of the diagram remain visible.

**Why this priority**: Emphasizing one character's connections helps visitors follow them through a dense map without removing the surrounding context.

**Independent Test**: Hover over, then keyboard-focus, a character with both related and unrelated connections. Verify only its incident relationships are emphasized, unrelated relationships are subdued, and no diagram content disappears.

**Acceptance Scenarios**:

1. **Given** a character has relationships in a diagram, **When** a visitor hovers over that character, **Then** only the lines and labels for relationships involving that character are highlighted.
2. **Given** a character has relationships in a diagram, **When** its link receives keyboard focus, **Then** the same relationship emphasis is available without changing or disabling link navigation.
3. **Given** a relationship is unrelated to the hovered or focused character, **When** emphasis is active, **Then** that relationship is visually subdued but remains visible and readable.
4. **Given** the pointer leaves a character and its link is no longer focused, **When** the emphasis ends, **Then** all relationships return to their normal appearance.
5. **Given** a character has no incident relationship in a displayed map, **When** it is hovered or focused, **Then** no unrelated relationship is highlighted.

### Edge Cases

- An isolated profile character has a clear empty state and does not produce a misleading diagram.
- A relationship whose other character is excluded by the current NSFW setting is not disclosed in the profile diagram, labels, or accessible text.
- Multiple edges between the same pair of characters are all emphasized when either endpoint is hovered or focused.
- Dense diagrams may grow in either dimension; no node, name, relationship line, or label may be omitted or truncated to achieve fewer crossings.
- A character at the edge of a profile-centered diagram still has its avatar and name fully visible.
- Hover emphasis must not be the only way to determine a relationship; all relationship details remain available without a pointer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each character profile MUST include a relationship section that displays the current character and its directly related characters in a centered diagram.
- **FR-002**: Each character represented around the profile character MUST have a visible avatar and complete name; the avatar and name MUST link to that character's profile.
- **FR-003**: The profile diagram MUST represent all relationships for the current character that are visible under the visitor's current content-rating setting, including multiple relationships between the same pair.
- **FR-004**: A profile with no relationships visible at the current content setting MUST show a clear empty state in the relationship section.
- **FR-005**: The profile relationship diagram MUST remain readable and contain its character names and relationship information when JavaScript is unavailable.
- **FR-006**: Every relationship display MUST arrange its characters to minimize crossing relationship lines, including global SFW/NSFW displays and character-profile displays.
- **FR-007**: When a relationship set has a crossing-free arrangement, its diagram MUST use an arrangement with zero crossings.
- **FR-008**: When crossings cannot be eliminated, the diagram MUST have no more crossings than the existing arrangement for the same relationship set.
- **FR-009**: A diagram MAY use additional horizontal or vertical space to reduce crossings, but MUST NOT omit characters or relationships, clip names or labels, or make relationship details unreadable.
- **FR-010**: Hovering over a character in any relationship display MUST visually emphasize only that character's incident relationship lines and labels.
- **FR-011**: Keyboard focus on a character link MUST provide the same relationship emphasis as pointer hover, while preserving visible focus and normal link activation.
- **FR-012**: Relationships not incident to the hovered or focused character MUST remain present and visible, but visually subdued while emphasis is active.
- **FR-013**: When hover or focus ends, the relationship display MUST return to its normal appearance without changing relationship data or navigation.
- **FR-014**: All diagrams and accessible text MUST preserve existing server-side NSFW filtering; content excluded by the visitor's setting MUST NOT be disclosed by the new profile or highlighting views.
- **FR-015**: Related-character links MUST remain keyboard-focusable and visibly focused, and activating one MUST navigate normally to that character's profile.

### Key Entities

- **Profile relationship diagram**: A character-centered view of a profile character and its directly connected characters and visible relationships.
- **Relationship display**: Any diagram that displays character relationships, including the global rating-specific maps and profile diagrams.
- **Highlighted relationship**: A visible connection and its label incident to the currently hovered or keyboard-focused character.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every profile with at least one visible relationship displays the profile character at the center and displays all directly connected visible characters with an avatar and complete name.
- **SC-002**: Every tested relationship set with a known crossing-free arrangement is displayed with zero crossing lines in each applicable relationship display.
- **SC-003**: For tested relationship sets without a crossing-free arrangement, no display has more crossings than the existing arrangement for the same set.
- **SC-004**: 100% of rendered profile and global diagrams retain all rating-visible characters and relationships, with no clipped names or labels, after layout space is increased to reduce crossings.
- **SC-005**: Hovering or keyboard-focusing a character emphasizes all and only its incident relationship lines and labels; unrelated relationships remain visible.
- **SC-006**: With NSFW opt-in disabled, no NSFW-only character or relationship is exposed by the profile diagram, global diagrams, hover treatment, or accessible text.
- **SC-007**: With JavaScript unavailable, profile relationship diagrams and their names and relationship details remain available.

## Assumptions

- “Character sheep” means the existing character sheet/profile page.
- The new profile diagram supplements, rather than replaces, the existing relationship list and global SFW/NSFW relationship page.
- “Centered around the current character” means the profile character is visually central, with only characters directly related to it shown in that profile diagram.
- Relationship details and directed or undirected meaning follow the existing relationship records and presentation.
- Existing content-rating preferences determine which profile relationships are eligible to appear; the new display does not weaken the NSFW gate.
- “Minimum crossings” means zero when a tested relationship set admits a crossing-free arrangement; otherwise, the diagram must not increase crossings over the current arrangement for that same set.
- Pointer hover and keyboard focus receive equivalent visual emphasis so the behavior remains usable without a mouse.
- Additional diagram space is preferable to shrinking faces and text or hiding relationship information.
