# Contract: Relationship Map

**Feature**: `002-modern-ui-relationship-map` | **Date**: 2026-10-01

## Route contract

| Property | Value |
|----------|-------|
| Method & path | `GET /relationships` — **unchanged, no new route** |
| Status | `200` always |
| Headers | `Vary: Cookie` (existing requirement, asserted by `route-audit.test.js`) |
| Rating input | `res.locals.showNsfw`, set by existing `src/middleware/nsfw.js` |

**No endpoint is added.** The derived route list in `tests/integration/route-audit.test.js` must remain exactly:

```text
/  /artists  /characters/:slug  /images/:imageId
/media/:imageId  /media/:imageId/full  /relationships  /stories/:slug
```

If implementation finds itself wanting a JSON data endpoint for the map, that is a signal the design drifted away from R-001 — the map data belongs in the rendered HTML, not in a second request.

## Pure function contract

```text
layoutGraph(nodes, edges) → { nodes, edges, width, height, crossings }
```

**Location**: `src/lib/graph-layout.js`

| Guarantee | Requirement |
|-----------|-------------|
| Imports nothing; no clock, randomness, I/O, or environment access | I-M3 |
| Identical input → byte-identical output | FR-013, SC-004 |
| `crossings` ≤ crossings of the name-ordered arrangement | FR-012, I-M4 |
| `crossings === 0` when the edge set forms a forest | SC-003 (achievable clause, R-011) |
| Connected components placed in disjoint regions | FR-014 |
| Every node and label inside `[0,width] × [0,height]` | FR-015, I-M5 |
| Empty input → `{ nodes: [], edges: [], crossings: 0 }` with a valid box | Empty-state edge case |
| 100 nodes / 300 edges completes well inside the page-render budget | SC-007 |

The function must not know about rating, HTTP, or the database. It receives plain objects.

## Rendered SVG contract

The drag script depends on this structure, so it is a contract rather than an implementation detail. Changing it without changing `relationship-map.js` breaks dragging silently.

```html
<svg class="relationship-map" viewBox="0 0 {width} {height}"
     role="group" aria-labelledby="{mapId}-title" data-map="sfw|nsfw">
  <title id="{mapId}-title">SFW relationships</title>

  <g class="map-edges">
    <g class="map-edge" data-edge="{id}" data-from="{fromId}" data-to="{toId}">
      <path class="map-edge-line" d="..."></path>
      <text class="map-edge-label" x="{labelX}" y="{labelY}">{label}</text>
    </g>
  </g>

  <g class="map-nodes">
    <a class="map-node" data-node="{id}" href="/characters/{slug}"
       transform="translate({x},{y})" tabindex="0"
       aria-label="{name}">
      <circle class="map-node-ring" r="{r}"></circle>
      <image class="map-node-avatar" href="{avatarUrl}"
             clip-path="url(#{mapId}-clip)" ... ></image>
      <text class="map-node-name">{name}</text>
    </a>
  </g>
</svg>
```

**Required invariants of the markup**:

- Edges are rendered **before** nodes so avatars paint above lines.
- `data-from` / `data-to` on each edge group are what the drag script uses to find edges attached to a moved node. Without them it would have to parse path data.
- Every node is an `<a>`, giving FR-005 and native keyboard focus together.
- `aria-label` on the node carries the character name, since the avatar `<image>` alone has no accessible name.
- Coordinates are **literal numbers in the delivered HTML**. A test asserts this directly — it is how FR-021 ("the map arrives already drawn") is verified.

### Accessible relationship list (FR-021a)

Immediately after each `<svg>`, a visually-hidden list conveys the same relationships as text:

```html
<ul class="visually-hidden map-text-equivalent">
  <li>{fromName} — {label} — {toName}</li>
</ul>
```

Assistive technology is never asked to infer meaning from geometry. `visually-hidden` must clip rather than use `display:none`, or screen readers skip it.

## Rating guarantees

These are the Principle I obligations in testable form.

| ID | Guarantee |
|----|-----------|
| G-1 | Before opt-in, the NSFW map's `nodes` and `edges` are empty **before the template renders** — not hidden by CSS or a template conditional. |
| G-2 | Before opt-in, no NSFW character's name, slug, avatar URL, image id, or coordinates appear anywhere in the response body. |
| G-3 | A character appearing only in NSFW relationships is absent from the SFW map entirely (I-M1). |
| G-4 | Avatar URLs are always `/media/:imageId` — never `/media/:imageId/full`, never a static upload path, never a data URI. |
| G-5 | The SFW map's node positions do not vary with NSFW data (I-M2) — the arrangement cannot become a side channel. |
| G-6 | The response declares `Vary: Cookie`. |

G-2 is verified using the existing `NSFW_MARKERS` list from `tests/helpers/fixtures.js`. The new test must be added to the `test:nsfw` script in `package.json` so the central promise stays runnable in isolation (Principle IV).

## Interaction contract

Behaviour added by `src/public/js/relationship-map.js`. **Everything below is enhancement; the map is complete and readable without it.**

| Interaction | Behaviour | Requirement |
|-------------|-----------|-------------|
| Pointer or touch drag on a node | Node follows the pointer; attached edges and their labels update continuously | FR-016, FR-017 |
| Drag release | Node stays where released, clamped inside the viewBox | FR-018 |
| Drag past the boundary | Position clamps; node never leaves the visible area | FR-018, I-M5 |
| Arrow keys on a focused node | Moves by a fixed step; Shift+Arrow by a larger step | FR-019 |
| Keys discoverable | Visible on-page help text near the map, not a tooltip | FR-019 |
| Click or Enter on a node without dragging | Navigates to the character page — a drag must not be mistaken for a click | FR-005 |
| Page reload | Default arrangement returns; nothing stored anywhere | FR-020 |

**Click-versus-drag**: navigation is suppressed only when the pointer moved beyond a small threshold. Suppressing it unconditionally on `pointerup` would break FR-005 for everyone; never suppressing it would navigate away at the end of every drag.

**No persistence**: the script must not write to `localStorage`, `sessionStorage`, cookies, the URL, or the server. FR-020 is a prohibition, and it is listed here because it is the kind of "helpful" addition that gets added later without reference to the spec.
