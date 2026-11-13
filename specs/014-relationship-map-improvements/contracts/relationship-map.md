# Contract: Relationship Map and Admin UI

## GET /relationships (public)

Server-rendered SVG per rating card, unchanged shape plus:

- `.map-edge` gets `data-one-sided="1"` for one-sided relationships (absent or `0` otherwise).
- A one-sided `.map-edge-line` carries `marker-end="url(#<mapId>-arrow)"`; `<defs>` contains the marker. Two-sided lines carry none.
- `.map-edge-label` and `.map-node-name` contain one `<tspan>` per wrapped line; no ellipsis is ever emitted; the concatenated text equals the full label or name.
- The viewBox height grows with the number of wrapped lines so no text leaves the drawing.
- The hidden text equivalent lists `A — label — B` for two-sided and `A → label → B` (with "one-sided" wording for assistive technology) for one-sided relationships, with full text.
- The node avatar `<image>` uses the character's designated avatar through `/media/:id` (gated) and applies the saved crop; the placeholder is used when none is visible.
- Rating rules are unchanged: no node or edge appears for a relationship hidden at the current setting.

## Client behavior (enhancement only)

| Gesture | Result |
|---|---|
| Mouse press-drag on a node | Node follows the pointer; edges and labels follow; no navigation after a drag. |
| Click without movement | Navigates to the character page. |
| Mouse press-drag on empty space | The view pans (viewBox origin changes). |
| Touch drag on a node | Node moves. |
| Touch drag on empty space | Page scrolls. |
| Reload | Default arrangement; nothing is stored. |

## Admin: /admin/relationships

- The create form has a "Two-sided (default) / One-sided" choice (`is_one_sided` = `1` for one-sided). For one-sided, the "From" character is the source of the direction.
- Relationships are editable (including sidedness and swapping the two characters); the list shows each relationship's sidedness.
- Validation errors name the field, as today; duplicates follow the data-model rules.

## Character page

Each relationship states whether it is one-sided (with direction) or two-sided.
