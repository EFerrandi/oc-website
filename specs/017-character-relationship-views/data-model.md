# Data Model: Character Relationship Views

## Persistence

No schema, relationship record, or stored position changes are required. Both the global and profile diagrams are request-local projections of existing records. Hover and focus state exists only while the visitor interacts with the rendered page.

## Runtime View Models

### Relationship Display

| Property | Meaning | Invariant |
|---|---|---|
| Rating scope | SFW, NSFW, or the profile's current visible relationship scope | Rows are filtered by the server before view-model construction. |
| Nodes | Characters referenced by visible relationship rows; a profile display also includes its current character | A node is never added from a relationship excluded by the current content-rating setting. |
| Edges | Visible relationship records | One edge per record, including multiple records between the same pair; direction and labels are preserved. |
| Layout | Deterministic coordinates and measured bounds | Includes all avatar, name, edge, and label geometry; a profile layout has the selected character at its center. |

### Relationship Node

| Property | Meaning | Invariant |
|---|---|---|
| Character ID and profile URL | Stable identity and destination | Related profile nodes remain native keyboard-focusable links. |
| Name | Complete display name | Not truncated or omitted to reduce crossings. |
| Avatar preview and alt text | Effective current avatar or placeholder | Resolved through the shared avatar policy; uses the existing media preview route. |
| Position | Temporary coordinates for this diagram | Generated on the server, not persisted, and specific to the diagram input. |

### Relationship Edge

| Property | Meaning | Invariant |
|---|---|---|
| Relationship ID | Existing relationship identity | Distinct relationships remain distinct even when endpoints match. |
| From/to character IDs | Relationship endpoints and direction | Used for line routing and hover/focus incidence. |
| Label and direction mode | Existing text and one-sided/two-sided semantics | Complete and available in SVG text and accessible text. |
| Emphasis state | Normal, incident to active node, or non-incident while an active node is selected | Presentation-only; non-incident edges remain visible. |

## State and Validation

- The profile view model is built only from rating-filtered rows returned for the requested profile character.
- Related nodes are unique by character ID; edges remain unique by relationship ID.
- Each related node receives a safe profile URL and an avatar resolved by the existing effective-avatar helper.
- A profile with no visible relationship rows has an empty state and no misleading graph.
- The graph layout must attempt a crossing-free drawing when possible; a non-zero fallback must be deterministic and no worse than the original input-order baseline.
- Hover/focus state is ephemeral, does not alter graph data or links, and resets when neither hover nor focus remains active.
