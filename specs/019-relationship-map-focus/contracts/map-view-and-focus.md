# Contract: Map View and Focus

Extends `specs/018-relationship-map-redesign/contracts/relationship-map.md`; everything there still holds.

## Markup (server)

- The `<svg class="relationship-map">` has no fixed pixel `width`/`height` attributes. It keeps its `viewBox` equal to the layout box.
- It carries an inline style with `max-width` equal to the layout width in pixels and an `aspect-ratio` equal to layout width / height.
- Node, edge, and relationship-detail markup, `data-*` attributes, and ordering are unchanged.

## CSS classes (client)

| Class | On | Meaning |
|---|---|---|
| `has-focus` | `svg.relationship-map` | A character is focused |
| `is-focus` | `.map-node`, `.map-edge` | Part of the focus set |
| `is-dimmed` | `.map-node`, `.map-edge` | Outside the focus set; grayed |

Dimmed items remain visible at reduced opacity and in grayscale. While `has-focus` is set and labels are off, `is-focus` nodes and edges still show their names and labels.

## Behavior

- **First display**: the view is centered on the content at `initialScale`; no content is hidden when `fitScale >= MIN_READABLE_SCALE`.
- **Zoom**: controls step the scale by a fixed factor around the view center; Ctrl/⌘+wheel and pinch zoom around the pointer. Scale is always within `[minScale, 3]`.
- **Pan**: dragging empty map space moves the view; the center stays inside the content bounds. Dragging an avatar still moves the avatar only.
- **Reset**: restores the initial view in one action.
- **Resize / fullscreen**: the fit is recomputed from the rendered box.
- **Focus**: mouse or pen hover and keyboard focus apply it; touch input does not (a tap follows the profile link). It clears on pointer leave or blur.

## Exported pure helpers (browser module)

`fitView`, `clampView`, `zoomAt`, and `focusSet` take plain numbers and edge lists, with no DOM, so they can be tested in Node.
