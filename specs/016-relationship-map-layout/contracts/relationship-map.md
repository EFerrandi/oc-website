# Contract: Relationship Map Interaction and Layout

## Public page: `GET /relationships`

- Renders the SFW relationship area before the NSFW relationship area in a single vertical sequence.
- Each area remains independently labeled and has a readable empty state.
- Relationship filtering, the NSFW opt-in behavior, avatar resolution, relationship direction, and the accessible text equivalent are unchanged.
- Character face, complete name, relationship labels, and all visible relationships remain in the server response; JavaScript is not required to read or navigate the map.
- The outer page does not overflow horizontally. A dense map may scroll horizontally within its own frame to preserve readable face and text dimensions; the rendered SVG width follows its computed layout width rather than shrinking below its readable user-unit size.

## SVG node contract

- `.map-node` remains a keyboard-focusable link to the character page.
- The avatar face has a distinct pointer/touch hit area that can initiate dragging. Starting on the name or map background does not reposition a node.
- A successful drag updates only the selected node and its connected `.map-edge` paths and labels.
- A drag suppresses the subsequent navigation click only after the existing movement threshold is crossed. A click/tap without movement navigates normally.
- Arrow keys do not reposition a node; Enter continues to activate a focused character link.
- No coordinate is persisted. Reloading returns the default server-generated layout.

## Map layout and responsive behavior

- The two map regions are vertically stacked at all viewport widths.
- Avatar diameter and map typography are increased from the current baseline; spacing and viewBox bounds grow to prevent card, name, or label collisions.
- A frame may provide horizontal scrolling on a narrow screen, but the document and surrounding controls remain within the viewport.

## Removed interaction contracts

- Dragging empty map space never pans the view.
- Arrow keys and Shift+arrow keys never move characters.
- The existing mouse/touch drag of a character remains available only from its face hit area.
