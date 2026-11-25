# Research: Compact Relationship Map Layout

## Decision 1: Stress majorization from the existing baseline

- **Decision**: Relax the starting drawing with stress majorization (target distance proportional to graph hops), a fixed iteration count, and node-id ordering.
- **Rationale**: Linked characters end up near each other, hubs central, chains as paths, and results are deterministic. It is about 60 lines of plain arithmetic and handles 150 nodes well under 1 s.
- **Alternatives considered**: Force-directed with random start (non-deterministic, rejected by FR-005); a new graph library (violates "boring by default"); keeping rings with smaller radii (still a ring, fails FR-002).

## Decision 2: Keep the planar guarantee, then compact it

- **Decision**: For planar networks keep topoloom's crossing-free drawing as the start, relax it, and accept the result only with zero crossings; otherwise keep the baseline drawing with a 56px gap instead of 240px.
- **Rationale**: Clarification: zero crossings win when the network is planar. The current inflation comes from a uniform scale driven by the closest pair and a 240px gap.
- **Alternatives considered**: Dropping planarity for pure compactness (breaks the clarified rule).

## Decision 3: Non-planar networks must not exceed the previous crossing count

- **Decision**: Compare crossings of the relaxed drawing with the old ring ordering's count and fall back to a scaled-down ring only if worse.
- **Rationale**: Clarified rule: compact first, never more crossings than before.

## Decision 4: Shelf packing of components

- **Decision**: Sort components by area, fill rows, and pick the row width that gives the smallest bounding box; no aspect-ratio target.
- **Rationale**: Clarification said any compact shape. Shelf packing is simple and deterministic.

## Decision 5: Global map only

- **Decision**: Add a `placed` option to `layoutGraph` used only by the global route; profile maps keep `placeAroundCenter`.
- **Rationale**: Clarification: profile maps stay unchanged.

## Decision 6: Measure against the old layout

- **Decision**: Tests build 10 to 30 node fixtures and compare average link length and crossings with the previous planar/ring result computed via the retained baseline path.
- **Rationale**: SC-001 and SC-003 are relative to the previous layout.

## Planar gap decision

The 240px gap in `planar-layout.js` stays. It only seeds the layout, and `compact-layout.js` relaxes and rescales every component, so lowering it would change nothing visible and would force baseline test edits.
