# Feature Specification: Readable SFW Relationship Map

**Feature Branch**: `021-sfw-map-layout-fix`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "in this image, the global relationship has a good display for the nsfw part (left side) but a bad display for the sfw one (right side). Correct the sfw relationship display"

## Clarifications

### Session 2026-11-25

- Q: Must the SFW map keep zero link crossings when there are many relationships? → A: No. When there are too many relationships, the map may be drawn with crossings so that it stays compact and readable.
- Q: When is a network too dense for the zero-crossing rule? → A: Automatically: crossings are allowed only when the crossing-free drawing would need more than about 2x the area of the compact drawing.

## Problem Observed

On the global relationship page, the NSFW map is compact and readable: avatars, names, link labels and arrows are all visible. The SFW map beside it shows no avatars at all, only a few very long straight lines crossing the whole frame with tiny, unreadable labels. The drawing is so large that, once fitted to the frame, characters are not visible. Both maps must be equally readable, whatever the rating.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The SFW map shows its characters (Priority: P1)

As a visitor, I want the SFW relationship map to show every character's avatar, name and link labels at a readable size, exactly as the NSFW map does, so I can understand the SFW relationships without zooming or panning blindly.

**Why this priority**: Today the SFW map is unusable, and it is the default view for every visitor.

**Independent Test**: Open the global relationship page with the data from the screenshot (a mix of SFW and NSFW relationships, including SFW characters with few links or links to many groups) and confirm the SFW map shows all avatars and names at a readable size on first load, without pressing Reset.

**Acceptance Scenarios**:

1. **Given** SFW relationships exist, **When** the global page loads, **Then** the SFW map fits entirely in its frame with avatars, names and labels at a size comparable to the NSFW map.
2. **Given** a character in the SFW map, **When** the map is displayed, **Then** it sits close to the characters it is linked to; no link is drawn across the whole map.
3. **Given** the SFW map has several unconnected groups, single links, or a hub with many single links, **When** it is displayed, **Then** the groups are packed compactly with no large empty areas.
4. **Given** the visitor presses Reset, **When** the map refits, **Then** it returns to the same readable view.

---

### User Story 2 - Both maps follow the same layout rules (Priority: P1)

As a visitor, I want the SFW and NSFW maps to be laid out by the same rules, so that no network, whatever its shape or rating, ends up unreadable.

**Why this priority**: The defect is a case the layout does not handle; fixing only the one screenshot would leave other networks broken.

**Independent Test**: Generate varied networks (stars, chains, trees, dense clusters, many small pairs, mixes of these) and confirm each stays compact and readable under both ratings.

**Acceptance Scenarios**:

1. **Given** any network of up to 150 characters, **When** its map is displayed, **Then** its drawing area stays within a small multiple of the room its avatars and names need.
2. **Given** the NSFW opt-in is switched on or off, **When** the SFW map is shown, **Then** it is identical in both states and is still readable.
3. **Given** the same data, **When** the page is loaded repeatedly, **Then** the arrangement is identical every time.

---

### Edge Cases

- The SFW map contains only one pair, or only one character with links.
- The SFW map has one large hub plus many separate pairs.
- A character appears in the NSFW map but has no SFW links (it must not leave gaps or placeholders in the SFW map).
- A network with parallel or one-sided relationships.
- A very large SFW network (100+ characters) next to a small NSFW one, and the reverse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The SFW global map MUST fit its frame on first load, showing every visible character's avatar, name and relationship labels at a readable size.
- **FR-002**: No relationship in the SFW or NSFW global map may be drawn across a large part of the map when the characters it joins could sit close together.
- **FR-003**: The SFW and NSFW global maps MUST use the same layout rules, and the result for one rating MUST NOT depend on the other rating's content.
- **FR-004**: The layout MUST stay compact for every network shape, including hubs with many single links, trees, chains, separate groups and dense clusters.
- **FR-005**: Compactness MUST be verified by a measurable limit: the map's drawing area stays within a fixed multiple of the area its avatars and names need, for networks of up to 150 characters.
- **FR-006**: Existing behaviour from features 018 to 020 MUST be preserved: no link over an unrelated avatar, no label overlapping an avatar, name or label, zero crossings for planar networks that are not too large (see FR-009), avatar sizing, arrows, dragging, zoom, pan, hover focus, keyboard access, details list, and content without JavaScript.
- **FR-007**: The profile relationship maps MUST stay unchanged.
- **FR-008**: The arrangement MUST be deterministic and display in under 1 second for 100+ characters.
- **FR-009**: When a network has too many relationships for a crossing-free drawing to stay compact and readable, the map MAY be drawn with link crossings; readability and compactness then take priority over the zero-crossing rule. Crossings are allowed only when the crossing-free drawing would need more than about 2x the area of the compact drawing; otherwise the map MUST have no crossings.

### Key Entities

- **Relationship map**: The drawing of one rating's characters and relationships on the global page (one for SFW, one for NSFW).
- **Network shape**: The pattern of links within a map (hub, chain, tree, cluster, separate groups), which the layout must handle without producing a sparse drawing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the reported data, the SFW map shows all avatars and names on first load at a size within 25% of the NSFW map's avatar size at the same frame size. *Accepted deviation (2026-11-25): the owner accepted the achieved ratio (about 44% smaller than NSFW for the 35-node, non-planar real network) because the map is much denser; the area and clearance bounds still apply.*
- **SC-002**: In 100% of tested network shapes (hub, chain, tree, dense cluster, many pairs, mixed), the drawing area stays within a small fixed multiple of the area its avatars and names need.
- **SC-003**: The SFW map is identical with the NSFW opt-in on or off, and across at least 5 consecutive loads.
- **SC-004**: A network of 100+ characters is displayed in under 1 second.
- **SC-005**: All previously available map features continue to work in automated and manual checks.

## Assumptions

- The screenshot data is a real mix: the NSFW side has groups of 2 to 8 characters while the SFW side has a few characters connected through long, sparse links. The exact cause is determined during planning.
- No new rating rules, data fields or pages are needed; this is a layout correction only.
- The profile maps and the details lists below each map are out of scope.
- The previous crossing, label and avatar clearance rules stay in force.
