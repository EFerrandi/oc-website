# Contract: Relationship Map Redesign

## Global page: `GET /relationships`

- Renders separately rating-filtered SFW and NSFW maps; excluded characters, edges, details, and size contributions are absent before opt-in.
- Uses the shared map appearance and controls for each non-empty map.
- Keeps disconnected character groups visually separate and retains every visible relationship.

## Profile page: `GET /characters/:slug`

- Renders only visible direct relationships for the profile character.
- Keeps the profile character at the center and uses the same appearance and controls as the global map.
- Shows the existing clear empty state if no relationship is visible.
- Retains native profile links and the existing textual relationship list.

## Shared map markup

- Character nodes have a stable character ID, safe avatar preview or placeholder, complete accessible name, visible-count-derived radius, and normal profile link.
- Relationship paths have stable relationship IDs, endpoint IDs, complete direction semantics, visible focus, and a native anchor to the corresponding relationship details.
- A visible server-rendered relationship details listing is available independently of JavaScript.
- The SVG is complete in the HTML response; maps do not depend on client-side graph construction.

## Controls

- “Labels” toggles only the visual display of character names; it does not remove identity from the accessibility tree, profile links, or details.
- Zoom controls update the displayed scale without recomputing or dropping map data.
- Full-screen mode applies to the map frame containing both the SVG controls and the server-rendered relationship details. Selecting a relationship keeps those details available in fullscreen. Unsupported/rejected fullscreen requests leave the map usable normally.
- Enhancement controls are keyboard-operable, named, and visibly focused.

## Visual and layout behavior

- The map frame uses the agreed dark blue/teal surface, curved muted-gold paths and arrows, circular avatars, and lower-right control panel.
- Avatar radii increase monotonically with the number of distinct other characters connected by rating-visible relationships, within a bounded range. Multiple records between the same pair count once, and self-relationships do not increase the count.
- Parallel relationships remain individually visible; final path crossings are evaluated after curve routing.
- Narrow-screen overflow remains confined to the map frame, not the page.

## Progressive enhancement and safety

- Without JavaScript, the visitor can read every visible character name and relationship detail and follow every profile link.
- Hover/focus highlighting is superseded by `specs/019-relationship-map-focus/contracts/map-view-and-focus.md`: unrelated items are grayed, never hidden.
- All view-model rows, labels, avatar URLs, relationship details, and derived node sizes use the server-filtered rating scope.

> **Layout update (020)**: global-map node placement now comes from src/lib/compact-layout.js; see specs/020-relationship-map-compact-layout/contracts/compact-layout.md. Profile maps are unchanged.
