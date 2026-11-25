import { graph, layout, planarity } from '@khalidsaidi/topoloom';

import { NODE_RADIUS } from './graph-layout.js';

const NODE_GAP = 240;

function pairKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function segmentsCross(a, b, c, d) {
  const orientation = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const scale = Math.max(1, ...[a, b, c, d].flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]));
  const epsilon = 1e-12 * scale ** 2;
  const sign = (value) => (value > epsilon ? 1 : value < -epsilon ? -1 : 0);
  const onSegment = (p, q, r) => q.x >= Math.min(p.x, r.x) - epsilon
    && q.x <= Math.max(p.x, r.x) + epsilon
    && q.y >= Math.min(p.y, r.y) - epsilon
    && q.y <= Math.max(p.y, r.y) + epsilon;
  const o1 = sign(orientation(a, b, c));
  const o2 = sign(orientation(a, b, d));
  const o3 = sign(orientation(c, d, a));
  const o4 = sign(orientation(c, d, b));

  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  return (o1 === 0 && onSegment(a, c, b))
    || (o2 === 0 && onSegment(a, d, b))
    || (o3 === 0 && onSegment(c, a, d))
    || (o4 === 0 && onSegment(c, b, d));
}

/**
 * Return deterministic planar coordinates, or null when no crossing-free
 * drawing is available so the caller can use its bounded fallback.
 */
export function findPlanarPositions(nodes, edges) {
  if (nodes.length < 2 || edges.length === 0) return null;

  const builder = new graph.GraphBuilder();
  const vertexByCharacter = new Map();
  const characterByVertex = new Map();

  for (const node of nodes) {
    const vertex = builder.addVertex(String(node.id));
    vertexByCharacter.set(node.id, vertex);
    characterByVertex.set(vertex, node.id);
  }

  const addedPairs = new Set();
  const topologyEdges = [];
  for (const edge of edges) {
    if (edge.fromId === edge.toId) continue;

    const key = pairKey(edge.fromId, edge.toId);
    if (addedPairs.has(key)) continue;
    addedPairs.add(key);
    topologyEdges.push([edge.fromId, edge.toId]);
    builder.addEdge(vertexByCharacter.get(edge.fromId), vertexByCharacter.get(edge.toId));
  }

  const inputGraph = builder.build();
  const planarResult = planarity.testPlanarity(inputGraph, {
    treatDirectedAsUndirected: true,
    allowSelfLoops: 'ignore',
  });
  if (!planarResult.planar) return null;

  const { layout: drawing } = layout.planarizationLayout(inputGraph, { mode: 'straight' });
  if (drawing.stats.crossings !== 0) return null;

  const rawPositions = new Map();
  for (const [vertex, point] of drawing.positions) {
    const characterId = characterByVertex.get(vertex);
    if (characterId === undefined) continue;
    rawPositions.set(characterId, point);
  }

  const positioned = nodes.filter((node) => rawPositions.has(node.id));
  for (const node of positioned) {
    const point = rawPositions.get(node.id);
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
      throw new Error(`Planar layout returned invalid coordinates for character ${node.id}.`);
    }
  }

  const maxRadius = Math.max(...nodes.map((node) => node.r ?? NODE_RADIUS));
  const spacing = 2 * maxRadius + NODE_GAP;
  const rightEdge = positioned.length
    ? Math.max(...positioned.map((node) => rawPositions.get(node.id).x + (node.r ?? NODE_RADIUS)))
    : 0;
  const topEdge = positioned.length
    ? Math.min(...positioned.map((node) => rawPositions.get(node.id).y))
    : 0;
  let isolatedIndex = 0;
  for (const node of nodes) {
    if (rawPositions.has(node.id)) continue;
    rawPositions.set(node.id, {
      x: rightEdge + spacing,
      y: topEdge + isolatedIndex * spacing,
    });
    isolatedIndex += 1;
  }

  for (let i = 0; i < topologyEdges.length; i += 1) {
    const [aId, bId] = topologyEdges[i];
    for (let j = i + 1; j < topologyEdges.length; j += 1) {
      const [cId, dId] = topologyEdges[j];
      if ([aId, bId].some((id) => id === cId || id === dId)) continue;
      if (segmentsCross(rawPositions.get(aId), rawPositions.get(bId), rawPositions.get(cId), rawPositions.get(dId))) {
        return null;
      }
    }
  }

  let scale = 1;
  for (let i = 0; i < nodes.length; i += 1) {
    const a = rawPositions.get(nodes[i].id);
    if (!Number.isFinite(a?.x) || !Number.isFinite(a?.y)) {
      throw new Error(`Planar layout returned invalid coordinates for character ${nodes[i].id}.`);
    }

    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = rawPositions.get(nodes[j].id);
      const minimumDistance = Math.hypot(a.x - b.x, a.y - b.y);
      if (minimumDistance <= 0) {
        throw new Error('Planar layout placed distinct characters at the same coordinates.');
      }
      const requiredDistance = (nodes[i].r ?? NODE_RADIUS) + (nodes[j].r ?? NODE_RADIUS) + NODE_GAP;
      scale = Math.max(scale, requiredDistance / minimumDistance);
    }
  }

  const centerX = nodes.reduce((sum, node) => sum + rawPositions.get(node.id).x, 0) / nodes.length;
  const centerY = nodes.reduce((sum, node) => sum + rawPositions.get(node.id).y, 0) / nodes.length;

  return new Map(nodes.map((node) => {
    const point = rawPositions.get(node.id);
    return [node.id, { x: (point.x - centerX) * scale, y: (point.y - centerY) * scale }];
  }));
}
