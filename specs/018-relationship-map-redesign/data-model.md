# Data Model: Relationship Map Redesign

## Persistence

No persisted data changes. Node sizes, coordinates, control state, and selected relationship state are computed per request or held temporarily in the visitor's page.

## Runtime View Models

### Relationship Map

| Property | Meaning | Invariant |
|---|---|---|
| Rating scope | Global SFW, global NSFW, or the current profile's visible scope | Input rows are filtered on the server before building the map. |
| Nodes | Unique characters represented by the visible rows; profile map also includes its current character | A hidden relationship never contributes a node or affects its size. |
| Edges | Visible relationship records | One edge per record, retaining relationship identity, endpoints, label, and direction. |
| Geometry | Per-node radius, coordinates, route, label positions, and bounds | All visible nodes, paths, names, and relationship details fit the map bounds. |

### Character Node

| Property | Meaning | Invariant |
|---|---|---|
| Character ID and profile URL | Stable identity and normal profile destination | Nodes remain native, keyboard-focusable profile links. |
| Name | Complete display name | Present in the server response; the map control may toggle only its visual display. |
| Avatar preview and alt text | Effective avatar or placeholder | Uses the existing shared avatar policy and gated preview route. |
| Visible neighbor count | Number of distinct other characters connected by visible relationship records | Derived only from the rows used to build this map; parallel and reverse-direction records count once per other character, and self-relationships do not increase the count. |
| Radius | Temporary avatar drawing radius | Monotonically increases with visible neighbor count within a bounded readable range. |
| Position | Temporary map coordinate | Computed server-side; global maps keep disconnected groups visually separate and profile maps keep the profile character centered. |

### Relationship Path

| Property | Meaning | Invariant |
|---|---|---|
| Relationship ID | Existing relationship identity | Stable anchor to its complete server-rendered details. |
| From/to IDs and names | Relationship endpoints and identities | Must refer to visible nodes in this map. |
| Label and direction mode | Existing relationship description and one-sided/two-sided semantics | Complete detail remains available without JavaScript; path arrowheads reflect direction. |
| Route | Straight or curved visible path | Parallel relationship records remain distinguishable; final routes are checked for crossings. |

### Map Interaction State

| Property | Meaning | Invariant |
|---|---|---|
| Names visible | Whether names appear beside avatar nodes | Defaults to visible in the static response. |
| Zoom | Current map viewBox scale | Changes presentation only; does not omit graph data or alter the saved map layout. |
| Selected relationship | Relationship currently inspected | Maps to one visible relationship ID and its endpoint characters. |
| Fullscreen | Whether the map frame is in browser fullscreen | Temporary, browser-controlled, and not required for baseline usability. |
| Emphasis | Active hovered or focused character and incident edges | Presentation only; unrelated paths remain visible. |

## State and Validation

- Both global map row sets and profile map rows are filtered by the server before view-model creation.
- A relationship contributes its other endpoint to each endpoint character’s visible neighbor set; repeated endpoints count once, and a self-relationship contributes no other character.
- Radius values are monotonic and bounded, with a nonzero minimum for every rendered node.
- Character details, all names, profile links, and relationship details remain in server-rendered markup independent of interaction state.
- User-controlled visual changes are ephemeral and do not change relationship records, rating visibility, or URLs.
- Fullscreen denial or lack of browser support leaves the regular frame and controls usable.
