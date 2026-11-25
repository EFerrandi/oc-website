# Data Model: Compact Layout

No stored data, schema, or route parameter changes. The feature adds in-memory values only.

## Relationship Group

A connected component of the visible relationship graph (self-links ignored for connectivity).

| Field | Meaning |
|---|---|
| members | node ids in the group, sorted by id |
| baseline | starting positions: planar drawing or ordering ring |
| relaxed | positions after stress relaxation and overlap removal |
| bounds | width and height including avatar radius, name space, and edge labels |

## Starting Arrangement

`Map<characterId, {x, y}>` for every node on the map, produced once per request and map (SFW, NSFW) and passed to `layoutGraph` as `placed`.

Rules:

- Every coordinate is finite and no two avatars overlap (centre distance at least `r_i + r_j + gap`).
- Deterministic for the same nodes and edges in the same order.
- Built only from the nodes and edges of one rating-filtered map.
- Crossings never exceed the baseline; planar networks have zero.
