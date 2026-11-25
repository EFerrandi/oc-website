# Feature Specification: Relationship Map Redesign

**Feature Branch**: `018-relationship-map-redesign`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "/skill:speckit-specify pour les relations, je veux quelque chose identique à la photo" (the supplied relationship-map screenshot)

## Clarifications

### Session 2026-11-23

- Q: Which relationship views should use the pictured design? → A: Both the global relationships page and profile relationship diagrams.
- Q: What should the “Labels” control show? → A: Character names on the map; relationship details remain available by selecting a relationship.
- Q: How should avatar sizes differ? → A: Characters with more visible relationships have larger avatars.
- Q: Should avatar size reflect the number of distinct connected characters, or count every visible relationship record, including multiple records between the same pair? → A: The number of distinct other characters connected.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the relationship network at a glance (Priority: P1)

As a visitor, I want the relationship maps to resemble the supplied image so I can understand connected characters and their relationship directions in one spacious visual network.

**Why this priority**: The image is the requested visual target for both relationship views.

**Independent Test**: Open the global relationship page and a profile with visible relationships. Compare the maps to the reference and verify their avatars, network connections, direction markers, spacing, and available character names and relationship details.

**Acceptance Scenarios**:

1. **Given** visible relationships exist, **When** a visitor opens either relationship view, **Then** characters appear as circular avatar nodes connected by curved, muted-gold relationship paths on a spacious dark-blue/teal canvas, with ample space between separate clusters.
2. **Given** the relationship data indicates direction, **When** a relationship is drawn, **Then** its direction is clear from arrow markers; a mutual relationship communicates both directions.
3. **Given** a character has more visible relationships than another, **When** both appear on the map, **Then** the more connected character has a larger avatar node.
4. **Given** a map has multiple connected groups, **When** it is displayed, **Then** each group is visually distinct and every visible character and relationship remains represented.
5. **Given** a relationship set can be drawn without crossings, **When** its map is displayed, **Then** paths do not cross; otherwise the map does not exceed the established input-order crossing baseline.

### User Story 2 - Control labels and explore the map (Priority: P1)

As a visitor, I want to show character names when I need them, zoom the map, use it in full-screen, and inspect a relationship without losing the overall network.

**Why this priority**: The pictured map uses a compact control strip to keep the graph clear while allowing visitors to inspect details.

**Independent Test**: Use the map controls with pointer and keyboard, toggle character names, zoom in and out, enter and exit full-screen, and select relationships to inspect their complete details.

**Acceptance Scenarios**:

1. **Given** character-name labels are hidden, **When** a visitor enables “Labels”, **Then** character names appear beside their corresponding avatars; disabling it hides those names without removing characters or relationship information.
2. **Given** a relationship is visible, **When** a visitor selects its path, **Then** the complete relationship details are presented and associated with its endpoints.
3. **Given** a visitor uses zoom controls, **When** they zoom in or out, **Then** the map scales without losing its nodes or relationships.
4. **Given** full-screen mode is available, **When** a visitor enters or exits it, **Then** the map remains usable and its controls remain available.
5. **Given** a map is displayed, **When** a visitor looks for map actions, **Then** the label toggle, zoom controls, and full-screen control appear together in a compact panel at the lower-right of the map.
6. **Given** the visitor uses a keyboard or assistive technology, **When** they operate map controls or inspect relationships, **Then** controls have accessible names, visible focus, and keyboard-operable behavior.

### User Story 3 - Explore a character-centered map (Priority: P2)

As a visitor, I want the relationship diagram on a character profile to retain that character as its visual center while using the same visual language and controls as the global map.

**Why this priority**: A consistent map helps visitors transfer what they learn on the global page to an individual character's profile.

**Independent Test**: Open profiles with visible and no currently visible relationships, confirm the profile character remains centered, and compare the diagram’s visual treatment and controls to the global map.

**Acceptance Scenarios**:

1. **Given** a profile has visible relationships, **When** its map is displayed, **Then** the profile character is central and every directly related visible character and relationship is shown using the shared map appearance.
2. **Given** the current rating setting excludes a relationship, **When** a profile map is displayed, **Then** the excluded character, relationship, and associated details are absent.
3. **Given** no relationships are visible, **When** the profile is opened, **Then** it shows a clear empty state rather than a misleading map.

### Edge Cases

- A large or dense relationship network remains navigable without dropping visible nodes or edges.
- A long relationship description remains complete and readable when selected.
- Character names that are disabled as labels remain available through an accessible interaction.
- A relationship whose endpoint is hidden by the current content-rating setting is not disclosed in paths, names, details, or accessible text.
- A profile character with no visible relationships still has a clear empty state.
- On narrow screens, map controls remain reachable and the page does not gain horizontal overflow.
- Full-screen mode is unavailable or fails: the map remains usable in its normal frame.
- Hover emphasis, where supported, emphasizes only the active character’s incident relationships and never becomes the sole way to obtain relationship information.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both the global relationship page and profile relationship diagrams MUST use a shared visual style based on the supplied reference: a spacious dark-blue/teal canvas, circular character avatars, curved muted-gold paths with direction markers, distinct connected clusters, and controls grouped at the lower-right.
- **FR-002**: Every visible character and relationship MUST remain represented in its applicable map.
- **FR-003**: Relationship direction MUST be shown with directional markers, and mutual relationships MUST communicate both directions.
- **FR-004**: A character connected to more distinct other characters by currently visible relationships MUST have a larger avatar node than a character connected to fewer distinct other characters; multiple relationship records between the same pair count as one connected character.
- **FR-005**: The global map MUST keep disconnected character groups visually distinct.
- **FR-006**: When a visible relationship set admits a crossing-free arrangement, its map MUST have no crossing paths; otherwise its crossing count MUST NOT exceed the established input-order arrangement for the same set.
- **FR-007**: Visitors MUST be able to toggle character-name labels without hiding characters, relationships, or relationship details.
- **FR-008**: Selecting a relationship MUST provide its complete details and clearly identify its endpoint characters.
- **FR-009**: Visitors MUST be able to zoom in and out and use full-screen mode where the browser supports it, with usable controls in both normal and full-screen views.
- **FR-010**: Map controls and relationship selection MUST be keyboard-operable, visibly focused, and accessible to assistive technology.
- **FR-011**: On a profile, the current character MUST remain the visual center and the map MUST contain only that character’s directly connected, currently visible relationships and characters.
- **FR-012**: The profile relationship section MUST show a clear empty state when no relationships are visible at the current rating setting.
- **FR-013**: Content-rating rules MUST be applied before map content is presented; excluded characters, relationships, and relationship details MUST NOT be disclosed through the diagram or its accessible content.
- **FR-014**: All map content and essential reading/navigation MUST remain available when JavaScript is unavailable; interactive enhancements MUST NOT be the only way to read character or relationship information.
- **FR-015**: The maps MUST remain usable on narrow screens without causing page-level horizontal overflow.
- **FR-016**: Hovering or keyboard-focusing a character MUST emphasize only its incident relationships while leaving unrelated relationships visible, and the emphasis MUST clear when the interaction ends.

### Key Entities

- **Relationship map**: A visual network of rating-visible characters and their relationship records.
- **Character node**: A circular avatar, its associated character identity, visible name label, and count of distinct other characters connected by visible relationships.
- **Relationship path**: A visible connection between two character nodes, including its direction and complete relationship details.
- **Map controls**: Visitor-operated controls for name labels, zoom, and full-screen display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In both global and profile views, 100% of rating-visible characters and relationships are present in the rendered map.
- **SC-002**: In tested crossing-free layouts, zero relationship paths cross; in tested layouts that require crossings, the final path arrangement does not exceed the input-order baseline.
- **SC-003**: When character-name labels are toggled, all character names can be shown and hidden without changing the map’s character or relationship counts.
- **SC-004**: Selecting any tested relationship makes its complete details and both endpoint identities available.
- **SC-005**: Every map control and relationship-selection action can be completed using a keyboard, with a visible focus indicator.
- **SC-006**: With NSFW opt-in disabled, no NSFW-only character, relationship, label, or detail appears in the global or profile map, including its accessible content.
- **SC-007**: Without JavaScript, the visitor can still access all rating-visible character names, relationship details, and profile navigation.
- **SC-008**: At narrow mobile widths, all map controls remain reachable and the surrounding page has no horizontal overflow.

## Assumptions

- The supplied image is the visual reference for both global and profile relationship diagrams, as confirmed by the user.
- “Labels” means character names displayed beside avatar nodes; relationship details are opened separately by selecting a relationship.
- Avatar size represents the number of distinct other characters connected to that character by visible relationships in the current map; multiple records between the same pair count once, self-relationships do not increase the count, and hidden relationships do not affect size.
- The existing server-side rating gate remains authoritative, and its SFW/NSFW map separation is retained.
- The existing profile diagram continues to show only direct relationships and keeps the profile character centered.
- Browser full-screen support may vary; maps remain fully usable when it is unavailable.
- All essential map content remains available without JavaScript; zoom, full-screen, and transient visual emphasis may be enhancements over the readable baseline.
