# Research: Character Relationship Views

## R-001 - Keep diagrams server-rendered

**Decision**: Continue generating SVG nodes, relationships, labels, links, and text equivalents on the server. Client-side code only enhances visual emphasis for hover and focus.

**Rationale**: The current profile route and global relationship route already render complete page data from rating-filtered repository results. This preserves the no-JavaScript reading path and keeps the server as the authority for NSFW visibility.

**Alternatives considered**:
- Build diagrams after page load: rejected because relationship names and details would be unavailable without JavaScript and could bypass server-side rating filtering.
- Add a client-side graph framework: rejected because existing SVG rendering and event handling are sufficient.

## R-002 - Profile diagram is a filtered star around the current character

**Decision**: Build the profile diagram from the profile's already-filtered direct relationship rows. Render the current character at the center and one linked node per unique directly connected character around it; retain one edge for every relationship row.

**Rationale**: Existing `listRelationshipsForCharacter` returns all directions and preserves distinct relationship records. A star arrangement gives every neighbor a visible avatar/name and keeps each relationship connected to the profile character. The existing profile relationship list remains a full text fallback.

**Alternatives considered**:
- Include every character in the global relationship network on each profile: rejected because it adds unrelated nodes and content to a character-focused view.
- Show only the current textual list: rejected because the request specifically calls for centered avatars and names.

## R-003 - Preserve content-rating and avatar invariants

**Decision**: Create profile diagram nodes only from the rows returned by `listRelationshipsForCharacter(..., { showNsfw })`; resolve each endpoint avatar using the existing effective-avatar helper and crop metadata.

**Rationale**: The existing repository filters NSFW relationships before the profile template is rendered. The current global maps also resolve previews through the shared helper rather than reading raw upload paths.

**Alternatives considered**:
- Query all relationships and hide excluded rows in the template or script: rejected because adult names, labels, and links would already be delivered.
- Link directly to upload files: rejected because media must continue through its existing gated route.

## R-004 - Crossing reduction and comparison baseline

**Decision**: Use TopoLoom's planarity test and `planarizationLayout(..., { mode: 'straight' })` for planar simple graphs. Accept its coordinates only when the reported drawing has zero crossings; otherwise use the deterministic bounded candidate search and retain the input-order arrangement as a guaranteed no-worse fallback. Preserve isolated characters by placing them outside the connected drawing, and keep parallel relationship records as distinct offset paths while deduplicating only their topology input.

**Rationale**: The accepted clarification requires zero crossings whenever possible and otherwise the best found without exceeding the existing comparison baseline. The current layout's circular-order scoring is deterministic and bounded but can miss zero-crossing drawings when a planar graph is not outerplanar. General crossing minimization for non-planar graphs is computationally hard, so a baseline-inclusive bounded search provides a practical and testable fallback.

**Alternatives considered**:
- Require the absolute minimum crossing count for all non-planar graphs: rejected by the user's clarification and impractical for dense maps.
- Use only the existing circular candidate orders: rejected because it cannot find every crossing-free planar embedding.
- Use unbounded exhaustive search: rejected because it does not preserve the current 100-node/300-edge layout performance budget.

**Implementation gate**: TopoLoom is ESM-compatible with Node.js 22+, documents Node.js 20+, and has no runtime dependencies. It is a young package (0.4.0 published October 2026) with limited adoption, so verify crossing-free coordinates on nontrivial planar graphs, disconnected graphs, and repeated relationships before integration. Verify final routed paths and labels, not only abstract topology, and meet the existing 150 ms graph-layout budget for 100 characters and 300 relationships. If the package fails these checks, implement or select another reliable planar embedding/drawing solution; do not silently fall back to circle-only ordering for planar inputs.

**Sources**:
- [TopoLoom quick start](https://github.com/khalidsaidi/topoloom/blob/ab91636618491c29040e1d056428a56f60f9f67b/README.md#L12-L27)
- [TopoLoom planarity API](https://github.com/khalidsaidi/topoloom/blob/ab91636618491c29040e1d056428a56f60f9f67b/packages/topoloom/src/planarity/index.ts#L55-L96)
- [TopoLoom straight-line layout implementation](https://github.com/khalidsaidi/topoloom/blob/ab91636618491c29040e1d056428a56f60f9f67b/packages/topoloom/src/layout/index.ts#L157-L172)
- [TopoLoom layout tests](https://github.com/khalidsaidi/topoloom/blob/ab91636618491c29040e1d056428a56f60f9f67b/packages/topoloom/test/layout.test.ts#L10-L37)
- [TopoLoom package metadata](https://registry.npmjs.org/@khalidsaidi%2ftopoloom/0.4.0)

## R-005 - Shared hover and focus relationship emphasis

**Decision**: Reuse the shared SVG node and edge identifiers. On pointer hover or keyboard focus of a character link, identify incident edges by `data-from` and `data-to`, visually emphasize those edge paths and labels, and subdue—but do not hide—other edges.

**Rationale**: The SVG contract already records each edge's endpoints and each node's identity. This supports one enhancement across both global maps and profile diagrams while keeping normal anchors and visible keyboard focus.

**Alternatives considered**:
- Hide unrelated edges: rejected because visitors should retain context and the spec requires other relationships remain visible.
- Use pointer-only hover: rejected because keyboard users must receive equivalent emphasis.

## R-006 - Use additional diagram space rather than shrinking content

**Decision**: Preserve readable avatar and text sizes and grow the computed viewBox in either dimension when needed. Continue to confine narrow-screen horizontal overflow to each map frame.

**Rationale**: The feature request explicitly permits additional space. Existing SVG sizing and frame scrolling already support large drawings without widening the document.

**Alternatives considered**:
- Shrink the drawing to fit the viewport: rejected because it makes faces and relationship text harder to read.
- Clip or omit nodes, edges, or labels: rejected because it loses relationship information.
