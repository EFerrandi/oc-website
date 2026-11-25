# Contract: Compact Layout

## `compactPositions(nodes, edges)` (`src/lib/compact-layout.js`)

- **Input**: nodes with `id` and `r`, edges with `fromId` and `toId`, from one rating-filtered map.
- **Output**: `Map<id, {x, y}>` covering every node, or `null` when there are no nodes.
- **Guarantees**:
  - Same input gives byte-identical output.
  - All coordinates finite; centre distance of any two nodes is at least `r_a + r_b + 56`.
  - Crossings of straight links are 0 for planar graphs, and otherwise not above the previous layout's count.
  - Not every node lies on one circle for graphs with a hub, chain, or branch.
  - Linked characters average at least 40% closer than the previous layout on 10 to 30 node networks.
  - 150 nodes and 300 edges complete in under 1 s.

## `layoutGraph(nodes, edges, { placed })` (`src/lib/graph-layout.js`)

- When `placed` is a Map covering every node, it replaces the ring and planar placement; curve offsets, labels, avatar geometry and `fitToBox` still apply.
- Without `placed`, behaviour is unchanged (profile maps use `centerId` as before).
- Result shape is unchanged: `{ nodes, edges, width, height, crossings }`.

## Route

`GET /relationships` builds each map with `compactPositions` then `layoutGraph(..., { placed })`. `GET /characters/:slug` is unchanged. The 019 client attributes and viewBox contract are unchanged.

## Follow-up tuning

- `MIN_CLEARANCE` is 36 and the gap between groups is 40.
- Avatar radii run from 64 to 104 (`relationship-map-model.js`).
- Networks over 40 characters keep the smallest clean drawing from a few tighter starting scales.
- If the stressed drawing cannot be accepted, a breadth-first radial seed is tried before falling back to the rescaled baseline. Hubs with many single links need this.

## Amendments

Feature 021 changes the acceptance guard for dense, non-planar networks: see [021 contract](../../021-sfw-map-layout-fix/contracts/compact-layout.md).
