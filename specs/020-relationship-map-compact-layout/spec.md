# Feature Specification: Compact, Readable Relationship Map Layout

**Feature Branch**: `020-relationship-map-compact-layout`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "all characters on the global relationship diagram are too espaced and displays as a circle. Please fix this so the graph could be nice and easely readable"

## Clarifications

### Session 2026-11-25

- Q: When a compact layout and zero link crossings cannot both be achieved, which wins? → A: Balanced: keep zero crossings when the network is planar, otherwise compact first (never more crossings than the previous layout).
- Q: Should the profile relationship maps get the new layout too? → A: No, global map only; profile maps stay unchanged.
- Q: Should separate groups be packed to a target shape? → A: No, any compact shape; no aspect-ratio target.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Related characters sit close together (Priority: P1)

As a visitor, I want characters who are related to each other to be placed near one another, with no large empty gaps, so the global relationship map reads as a compact, connected picture instead of a sparse scatter.

**Why this priority**: Excessive spacing makes links very long and the map tiny once fitted to the screen, so avatars and names become hard to read. It is the main complaint.

**Independent Test**: Open the global relationship page with a network of at least 10 characters and compare the average link length and the empty space around the characters before and after; related characters must be visibly close and the fitted map must show larger avatars.

**Acceptance Scenarios**:

1. **Given** a network of related characters, **When** the global map is displayed, **Then** the distance between two linked characters is only as large as needed to keep avatars, names and link labels from overlapping, with no large unused areas inside the map.
2. **Given** several separate groups of characters (no links between them), **When** the map is displayed, **Then** each group is laid out compactly and the groups are arranged side by side or stacked to fill the map area, rather than spread far apart.
3. **Given** the same network is displayed on a narrow phone screen and on a wide desktop screen, **When** the map is fitted, **Then** avatars are larger than before this change at the same screen size, for networks that previously fitted below the readable size.
4. **Given** a character with only one link, **When** the map is displayed, **Then** it sits next to its single neighbour instead of being pushed to the outer edge.

---

### User Story 2 - The map shows its structure, not a ring (Priority: P1)

As a visitor, I want the layout to reflect who is connected to whom, so I can see clusters, hubs and chains at a glance instead of every character being placed around one big circle.

**Why this priority**: A ring hides the structure of the relationships and makes every link cross the middle, which defeats the purpose of the map.

**Independent Test**: Open the global map for a network with a clear hub, a chain and a separate pair; verify the hub has its neighbours around it, the chain reads as a chain, the pair is separate, and characters are not all placed on a common circle.

**Acceptance Scenarios**:

1. **Given** a character linked to many others, **When** the map is displayed, **Then** it is placed near the centre of its own cluster with its neighbours around it.
2. **Given** a chain of characters, **When** the map is displayed, **Then** the chain reads as a connected path rather than being folded onto a circle.
3. **Given** a network of any size, **When** the map is displayed, **Then** characters are not all positioned on a single circle or ring.
4. **Given** the same relationships, **When** the page is reloaded or another visitor opens it, **Then** the same arrangement is shown (the layout is stable and repeatable).

---

### User Story 3 - Clear, uncluttered links and labels (Priority: P2)

As a visitor, I want links to cross each other as little as possible and avoid passing over other characters, so relationships and their labels are easy to follow.

**Why this priority**: A compact layout must not trade spacing for clutter; readability is the goal.

**Independent Test**: Open the global map for a network with a few dozen characters and count link crossings and links passing over an unrelated avatar; both should be at or below the levels of the previous layout.

**Acceptance Scenarios**:

1. **Given** a network that can be drawn without link crossings, **When** the map is displayed, **Then** no links cross.
2. **Given** a network that cannot avoid all crossings, **When** the map is displayed, **Then** crossings are kept to a minimum and no link passes over the avatar of an unrelated character.
3. **Given** relationship labels, **When** the map is displayed, **Then** labels do not overlap avatars, names or other labels.

---

### Edge Cases

- A network with a single relationship (two characters) is shown compactly and is not stretched.
- Characters with no visible relationships are not shown on the map (unchanged).
- A very large network (100+ characters) stays compact per group, and groups are arranged to use the map area; the existing readable-size and pan/zoom behaviour still applies.
- Multiple relationships between the same two characters, and a character related to itself, remain distinguishable.
- With NSFW hidden, the layout is computed only from the visible relationships, so hidden relationships never influence positions.
- A character dragged by the visitor keeps working; the layout change only affects the starting arrangement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The global relationship map MUST place linked characters close to each other, using only the spacing needed to keep avatars, names and labels from overlapping.
- **FR-002**: The layout MUST NOT leave large empty areas inside the map, and MUST NOT spread characters over a single ring or circle.
- **FR-003**: Separate groups of characters (not linked to each other) MUST each be laid out compactly and be arranged together to make good use of the map area, in any compact shape (no aspect-ratio target).
- **FR-004**: The layout MUST reflect the structure of the relationships: a highly connected character near the centre of its neighbours, chains as paths, and clusters grouped.
- **FR-005**: The layout MUST be deterministic: the same visible relationships produce the same arrangement on every load.
- **FR-006**: The layout MUST have zero link crossings when the network can be drawn without any (planar), otherwise MUST favour compactness while never exceeding the previous layout's crossing count, MUST NOT route a link over an unrelated avatar, and MUST NOT let labels overlap avatars, names or other labels.
- **FR-007**: The layout MUST be computed from the relationships visible under the current rating setting only.
- **FR-008**: The improved arrangement MUST apply to the global relationship map only; the profile relationship maps MUST stay unchanged.
- **FR-009**: Existing behaviour MUST be preserved: avatar sizing, direction arrows, relationship labels, details list, dragging avatars, fit, zoom, pan, hover focus, keyboard access and the content available without JavaScript.
- **FR-010**: The map MUST remain fast to display: a network of 100+ characters must still be shown without a noticeable delay for the visitor.

### Key Entities *(include if feature involves data)*

- **Relationship Group**: A set of characters connected to each other through visible relationships; separate groups have no link between them.
- **Starting Arrangement**: The position of every character on first display, before the visitor drags anything.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a typical network of 10 to 30 characters, the average distance between linked characters is at least 40% shorter than before, and the fitted avatars are visibly larger at the same screen size.
- **SC-002**: In 100% of tested networks, characters are not all placed on one circle, and a character with a single link sits next to its neighbour.
- **SC-003**: Link crossings are at or below the previous layout in 100% of tested networks, and no link passes over an unrelated avatar in networks where that is avoidable.
- **SC-004**: The arrangement is identical across at least 5 consecutive loads of the same data.
- **SC-005**: A network of 100+ characters is displayed in under 1 second on a typical computer.
- **SC-006**: Visitors can identify the connections of a chosen character at a glance in a 30-character map without zooming (reviewer check).
- **SC-007**: All previously available map features continue to work in the automated and manual checks.

## Assumptions

- This change affects the starting arrangement only; the map's fitting, zoom, pan and hover focus from the previous feature stay as they are.
- "Compact" means small gaps, not overlapping: avatar and name sizes are unchanged and still must not collide.
- Groups with no links between them are shown on the same map, as today.
- No new settings are added; the improved arrangement simply replaces the current one.
- The existing minimum readable avatar size and zoom limits are unchanged.
