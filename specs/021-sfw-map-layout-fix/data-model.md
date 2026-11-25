# Data Model: Readable SFW Relationship Map

No stored data, schema or route output changes.

## In-memory shapes (unchanged)

- **Node**: `{ id, name, radius, ... }` from `buildMapModel`.
- **Edge**: `{ fromId, toId, label, ... }`.
- **Positions**: `Map<id, {x, y}>` returned by `compactPositions`, passed to `layoutGraph(..., { placed })`.

## Candidate score (new, internal to `compact-layout.js`)

Used to pick the drawing for a component, compared in this order:

1. links over unrelated avatars (lower wins; 0 required when achievable)
2. crossings (lower wins)
3. bounding-box area (lower wins)

## Invariants

- Every node has finite coordinates; no two avatars or names overlap.
- A planar component keeps zero crossings unless its crossing-free drawing exceeds about 2x the compact candidate's area (FR-009).
- SFW and NSFW maps are computed from their own rows only.
