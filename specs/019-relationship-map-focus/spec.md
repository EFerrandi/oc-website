# Feature Specification: Relationship Map Focus and Sizing

**Feature Branch**: `019-relationship-map-focus`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "the relation diagrams are way too big and zooming or unzoom make all disapear. Also if the mouse is over a person, highlight only the links and the character on the other side. All characters and links not related must be grayed"

## Clarifications

### Session 2026-11-24

- Q: For very large networks, should the initial view always fit everything, or stop shrinking at a readable avatar size and let the visitor pan? → A: Fit down to a minimum readable avatar size, then stop shrinking; the visitor pans, and can zoom out to the full fitted view.
- Q: When names are off, should hover focus show names of the highlighted characters? → A: Yes, show names only for the highlighted characters during focus, and hide them again afterwards.
- Q: On a touch screen, what should tapping a character do? → A: Tap always opens the profile; touch users get no focus.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the whole map at a comfortable size (Priority: P1)

As a visitor, I want the relationship maps (global page and profile diagrams) to open at a reasonable size, with the whole network visible without excessive scrolling or panning, so I can read it at a glance.

**Why this priority**: A map that is far too big is unusable on every screen, and it blocks every other interaction.

**Independent Test**: Open the global relationship page and a profile with relationships on desktop and phone widths; verify the full network is visible in the initial view without manual zoom or panning.

**Acceptance Scenarios**:

1. **Given** visible relationships exist, **When** a visitor opens either relationship view, **Then** the whole network fits within the map area on first display, centered, with all characters and links visible, as long as avatars stay at or above the minimum readable size.
2. **Given** a network so large that fitting it would shrink avatars below the minimum readable size, **When** it is displayed, **Then** the initial view stops shrinking at that size, is centered on the network, and the visitor can pan to the rest or zoom out to see the whole network; names are available via the labels control.
3. **Given** a small network (one or two characters), **When** it is displayed, **Then** it is not enlarged beyond a natural size and remains well proportioned in the map area.
4. **Given** the visitor resizes the window or rotates the device, **When** the map area changes size, **Then** the map is refitted so it stays fully visible.

---

### User Story 2 - Zoom in and out without losing the map (Priority: P1)

As a visitor, I want zooming in and out to keep the map visible and under control, so I never end up looking at an empty canvas.

**Why this priority**: Currently zooming or un-zooming makes everything disappear, which breaks the core exploration tool.

**Independent Test**: Use each zoom control, the reset control, scroll/pinch, and full-screen at every zoom level, including the extremes; verify the map content is always at least partly visible.

**Acceptance Scenarios**:

1. **Given** the map is displayed, **When** the visitor zooms in or out repeatedly with the controls, **Then** the map stays visible at every step and zoom stops at defined minimum and maximum levels.
2. **Given** the visitor has zoomed or panned, **When** they use the reset/fit control, **Then** the map returns to the initial fitted view.
3. **Given** the visitor zooms, **When** the zoom changes, **Then** it centers on the middle of the visible area (or the pointer/pinch point), not on the map's corner.
4. **Given** the visitor pans, **When** they drag, **Then** the map cannot be moved entirely out of the visible area.
5. **Given** full-screen is entered or exited, **When** the area size changes, **Then** the map is refitted and visible.

---

### User Story 3 - Focus on one character's relationships on hover (Priority: P1)

As a visitor, I want hovering over a character to highlight only that character, the links attached to them, and the characters on the other side of those links, with everything else grayed out, so I can see one character's connections instantly.

**Why this priority**: This is the main way to read a dense network.

**Independent Test**: Hover over (and keyboard-focus) a character in a map with several clusters; verify that only the character, its links, and its direct neighbors stay in full color and all other characters and links are grayed; move the pointer away and verify the normal appearance returns.

**Acceptance Scenarios**:

1. **Given** a map is displayed, **When** the pointer is over a character, **Then** that character, every link attached to it, and every character at the other end of those links remain highlighted.
2. **Given** a character is hovered, **When** the map is shown, **Then** all unrelated characters and links (including links between two unrelated characters, and links between two neighbors of the hovered one) are visibly grayed out.
3. **Given** the pointer leaves the character, **When** no other character is hovered, **Then** all characters and links return to their normal appearance.
4. **Given** a keyboard user focuses a character, **When** focus lands on it, **Then** the same highlight and graying apply, and they clear on blur.
5. **Given** a character has no relationships, **When** it is hovered, **Then** only that character is highlighted and everything else is grayed.
6. **Given** the map is used on a touch device without hover, **When** a character is tapped, **Then** it opens that character's profile as usual; touch users do not get the focus highlight.
7. **Given** a focus is active, **When** names are turned off with the Labels control, **Then** the names of the highlighted characters are shown for the duration of the focus and hidden again afterwards; grayed items stay perceivable but clearly de-emphasized and their names stay hidden.

---

### Edge Cases

- Network with 100+ characters: the initial view stops at the minimum readable avatar size, remains centered, can be panned, and hover focus stays responsive.
- Highlight while zoomed or full-screen: behaves identically.
- Characters with self-relationships: the self-link is highlighted with its character.
- Several relationship records between the same pair: all of those links are highlighted together.
- Content hidden by the rating setting is never revealed by focus or fitting; only visible relationships count.
- Users who prefer reduced motion get no animated transitions for fit/highlight changes.
- Without scripting, the map remains displayed at a fitted, readable size with its content and relationship details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display each relationship map (global and profile) centered on first display and scaled to fit the available map area, without shrinking avatars below a minimum readable size; when that minimum prevents a full fit, the visitor MUST be able to reach the remainder by panning and to see the whole network by zooming out.
- **FR-002**: The system MUST NOT enlarge small networks beyond a natural size, and MUST NOT make the map larger than its map area by default on any screen size.
- **FR-003**: The system MUST refit the map when the available area changes (window resize, orientation change, entering or leaving full-screen).
- **FR-004**: Zoom in, zoom out, scroll/pinch zoom MUST always keep the map visible, MUST be limited to a minimum and a maximum level, and MUST zoom around the center of the visible area or the pointer/pinch point.
- **FR-005**: Panning MUST NOT allow the map to leave the visible area entirely.
- **FR-006**: A reset control MUST return the map to its initial view, and the minimum zoom level MUST be low enough to show the whole network.
- **FR-007**: When a character is hovered or keyboard-focused, the system MUST keep highlighted only that character, the links attached to it, and the characters at the other end of those links. Tapping a character on a touch screen MUST open its profile and MUST NOT apply the focus.
- **FR-008**: Under that focus, all other characters and links MUST be visibly grayed out while remaining perceivable.
- **FR-009**: The focus MUST clear and the normal appearance MUST return when the pointer leaves or keyboard focus leaves the character.
- **FR-015**: While a focus is active and names are turned off, the system MUST show the names of the highlighted characters only, and MUST hide them again when the focus clears.
- **FR-010**: Focus MUST consider only relationships visible under the current rating setting.
- **FR-011**: Focus and fitting MUST work identically in full-screen and at every zoom level.
- **FR-012**: Existing behavior MUST be preserved: avatar sizing, direction arrows, labels control, relationship details, link navigation to profiles, keyboard access, and no-JavaScript content.
- **FR-013**: Highlight and gray states MUST be distinguishable without relying on color alone (e.g. through opacity or emphasis) and MUST meet readable contrast for highlighted items.
- **FR-014**: Visual transitions MUST be disabled for visitors preferring reduced motion.

### Key Entities *(include if feature involves data)*

- **Relationship Map**: A visual network of characters (nodes) and relationships (links) for the global page or a profile.
- **Focused Character**: The character currently hovered or keyboard-focused, defining which characters and links are highlighted versus grayed.
- **View State**: The current zoom level and pan position, constrained so the map stays visible and resettable to the fitted view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On first display, for networks whose fitted avatars stay at or above the minimum readable size, 100% of characters and links are visible without scrolling, zooming, or panning, on phone (320px wide) through large desktop screens; for larger networks, the whole network is visible after zooming out once to the minimum level.
- **SC-002**: At every zoom level from minimum to maximum, and after any pan, at least part of the map remains visible in 100% of tested cases.
- **SC-003**: Visitors can return to the full fitted view in a single action.
- **SC-004**: Hovering a character highlights exactly that character, its attached links, and its direct neighbors; 100% of other characters and links are grayed, in all tested networks.
- **SC-005**: Highlight appears and clears within 100 ms of pointer or focus changes, including in a 100-character network.
- **SC-006**: All previously available map features continue to work in the automated and manual checks.

## Assumptions

- Applies to both the global relationships page and profile relationship diagrams.
- "Too big" means the map exceeds the visible map area by default; the fit-to-area behavior is the fix, with no fixed pixel size specified.
- Focus highlights direct neighbors only (one hop), and treats link direction as irrelevant: incoming and outgoing links both highlight.
- Grayed items remain visible at reduced emphasis rather than hidden.
- The rating (SFW/NSFW) filter remains the existing mechanism and is unchanged.
