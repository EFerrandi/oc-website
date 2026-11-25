import { layoutGraph } from '../../src/lib/graph-layout.js';
import { findPlanarPositions } from '../../src/lib/planar-layout.js';

const DEFAULT_RADIUS = 48;

const radiusOf = (node) => node.r ?? DEFAULT_RADIUS;

/** Build a node list with stable, predictable names. */
export function makeNodes(count, nameOf = (i) => `Character ${i}`) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: nameOf(index + 1),
    slug: `character-${index + 1}`,
    avatarUrl: `/media/${index + 1}`,
    avatarAlt: nameOf(index + 1),
    r: DEFAULT_RADIUS,
  }));
}

/** Build edges from [fromId, toId] pairs with short labels. */
export function makeEdges(pairs, label = 'friend') {
  return pairs.map(([fromId, toId], index) => ({
    id: index + 1,
    fromId,
    toId,
    label: typeof label === 'function' ? label(index) : label,
  }));
}

/** Positions of the previous global layout (planar drawing or ring), as a Map. */
export function baselineLayout(nodes, edges) {
  const planarPositions = findPlanarPositions(nodes, edges);
  const result = layoutGraph(nodes, edges, { planarPositions });
  return {
    crossings: result.crossings,
    positions: new Map(result.nodes.map((node) => [node.id, { x: node.x, y: node.y }])),
  };
}

function uniqueLinks(edges) {
  const seen = new Set();
  return edges.filter((edge) => {
    if (edge.fromId === edge.toId) return false;
    const key = edge.fromId < edge.toId ? `${edge.fromId}:${edge.toId}` : `${edge.toId}:${edge.fromId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function averageLinkLength(edges, positions) {
  const links = uniqueLinks(edges);
  const total = links.reduce((sum, edge) => {
    const a = positions.get(edge.fromId);
    const b = positions.get(edge.toId);
    return sum + Math.hypot(a.x - b.x, a.y - b.y);
  }, 0);
  return total / links.length;
}

function orientation(p, q, r) {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

function segmentsCross(a, b, c, d) {
  return orientation(a, b, c) * orientation(a, b, d) < 0
    && orientation(c, d, a) * orientation(c, d, b) < 0;
}

export function countStraightCrossings(edges, positions) {
  const links = uniqueLinks(edges);
  let crossings = 0;
  for (let i = 0; i < links.length; i += 1) {
    for (let j = i + 1; j < links.length; j += 1) {
      const a = links[i];
      const b = links[j];
      if ([a.fromId, a.toId].some((id) => id === b.fromId || id === b.toId)) continue;
      if (segmentsCross(positions.get(a.fromId), positions.get(a.toId), positions.get(b.fromId), positions.get(b.toId))) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/** Number of (link, unrelated avatar) pairs where the link crosses the avatar disc. */
export function linkOverUnrelatedAvatar(nodes, edges, positions) {
  let count = 0;
  for (const edge of uniqueLinks(edges)) {
    for (const node of nodes) {
      if (node.id === edge.fromId || node.id === edge.toId) continue;
      const distance = distanceToSegment(positions.get(node.id), positions.get(edge.fromId), positions.get(edge.toId));
      if (distance < radiusOf(node)) count += 1;
    }
  }
  return count;
}

/** True when every node lies within `tolerance` (relative) of one circle around the centroid. */
export function onSingleCircle(nodes, positions, tolerance = 0.12) {
  if (nodes.length < 4) return false;
  const points = nodes.map((node) => positions.get(node.id));
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const radii = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const mean = radii.reduce((sum, r) => sum + r, 0) / radii.length;
  return radii.every((r) => Math.abs(r - mean) <= tolerance * mean);
}

/** Smallest centre distance minus the two radii over all node pairs. */
export function smallestClearance(nodes, positions) {
  let smallest = Infinity;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = positions.get(nodes[i].id);
      const b = positions.get(nodes[j].id);
      smallest = Math.min(smallest, Math.hypot(a.x - b.x, a.y - b.y) - radiusOf(nodes[i]) - radiusOf(nodes[j]));
    }
  }
  return smallest;
}

/** Deterministic pseudo-random sparse network used for scale checks. */
export function sparseNetwork(count, edgeCount) {
  const nodes = makeNodes(count);
  const pairs = [];
  for (let id = 2; id <= count; id += 1) pairs.push([id, ((id * 7) % (id - 1)) + 1]);
  for (let i = 0; pairs.length < edgeCount; i += 1) {
    const a = ((i * 37) % count) + 1;
    const b = ((i * 53 + 11) % count) + 1;
    if (a !== b) pairs.push([a, b]);
  }
  return { nodes, edges: makeEdges(pairs) };
}
/** Topology of the reported SFW map (anonymised): 35 characters, two hubs, not planar, long labels. */
export function denseNetwork() {
  const pairs = [[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[9,10],[9,11],[9,12],[9,13],[9,14],[15,16],[15,12],[15,17],[15,18],[15,19],[10,12],[10,20],[10,21],[22,20],[22,23],[2,7],[2,21],[24,25],[24,21],[24,26],[27,20],[27,28],[27,23],[11,13],[29,20],[30,12],[30,31],[32,33],[4,1],[4,2],[4,6],[4,26],[16,12],[12,15],[12,11],[12,30],[12,17],[12,18],[13,9],[20,10],[20,11],[20,29],[6,2],[6,16],[6,28],[6,26],[7,3],[31,34],[18,12],[25,1],[25,2],[25,4],[25,6],[25,26],[23,29],[35,21],[21,10],[21,35],[19,15],[14,9],[26,2]];
  const nodes = makeNodes(35);
  for (const node of nodes) node.r = 70;
  return { nodes, edges: makeEdges(pairs, 'Friends with Benefits') };
}