# Data Model: Relationship Map Focus and Sizing

No persisted data, schema, or server view-model changes. All state below is transient, per page view, and held in the browser module.

## Content Bounds

The server-provided drawing box `{minX, minY, width, height}`. Never modified by zoom or pan.

## View State

| Field | Meaning | Invariant |
|---|---|---|
| `centerX`, `centerY` | Content point at the middle of the visible area | Always inside the content bounds |
| `scale` | Rendered pixels per drawing unit | `minScale <= scale <= 3` |

Derived: `viewBox = (centerX - boxW / (2·scale), centerY - boxH / (2·scale), boxW / scale, boxH / scale)` where `boxW`/`boxH` are the rendered box size, so the viewBox always has the box's aspect ratio.

- `fitScale = min(boxW / contentW, boxH / contentH)`
- `initialScale = clamp(fitScale, MIN_READABLE_SCALE, 1)`
- `minScale = min(fitScale, initialScale)`
- `MIN_READABLE_SCALE ≈ 0.34`

**Transitions**: initial → zoom/pan → reset (back to initial) → refit on box resize (re-clamped).

## Focus Set

Derived from the visible edge list for one character `c`:

- `nodes = {c} ∪ {other endpoint of every edge touching c}`
- `edges = every edge with c as either endpoint` (including self-relationships and all parallel records)

Everything outside the set is dimmed. Empty when no character is hovered or keyboard-focused.
