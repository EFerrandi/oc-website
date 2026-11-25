# Contract: `compactPositions` (amendments for feature 021)

Signature unchanged: `compactPositions(nodes, edges) -> Map<id,{x,y}> | null`.

## Guarantees (changed from 020)

- Never returns the enlarged old ring for a non-planar component when any clean compact drawing exists.
- Result has no link over an unrelated avatar when one can be reached by the repair step; otherwise the candidate with the fewest such links.
- Crossings may exceed zero for non-planar components and for planar ones whose crossing-free drawing would need more than about 2x the compact area (FR-009).
- Area of a component stays within a fixed multiple of `nodes * 96 * 136` for up to 150 characters (FR-005); the test bound is 25x as in feature 020.
- Deterministic; under 1 s for 150 nodes.

## Unchanged

Avatar sizes, name and label clearance, group packing, `layoutGraph(..., { placed })` behaviour, profile maps and the client module.
