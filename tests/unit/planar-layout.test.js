import assert from 'node:assert/strict';
import test from 'node:test';

import { embedding, graph, layout, planarity } from '@khalidsaidi/topoloom';
import { findPlanarPositions } from '../../src/lib/planar-layout.js';

function planarLayout(vertexIds, edgePairs) {
  const builder = new graph.GraphBuilder();
  const vertices = new Map(vertexIds.map((id) => [id, builder.addVertex(String(id))]));
  const seen = new Set();

  for (const [fromId, toId] of edgePairs) {
    const key = fromId < toId ? `${fromId}:${toId}` : `${toId}:${fromId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    builder.addEdge(vertices.get(fromId), vertices.get(toId));
  }

  const graphValue = builder.build();
  const result = planarity.testPlanarity(graphValue);
  if (!result.planar) return { planar: false, graph: graphValue };

  const mesh = embedding.buildHalfEdgeMesh(graphValue, result.embedding);
  return {
    planar: true,
    graph: graphValue,
    layout: layout.planarStraightLine(mesh),
  };
}

test('TopoLoom produces a deterministic zero-crossing drawing for K4', () => {
  const ids = [1, 2, 3, 4];
  const edges = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
  const first = planarLayout(ids, edges);
  const second = planarLayout(ids, edges);

  assert.equal(first.planar, true);
  assert.equal(first.layout.stats.crossings, 0);
  assert.equal(first.layout.positions.size, ids.length);
  assert.deepEqual([...second.layout.positions], [...first.layout.positions]);
  assert.deepEqual(second.layout.edges, first.layout.edges);
});

test('TopoLoom lays out disconnected planar components and deduplicated parallel edges', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7];
  const edges = [
    [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
    [5, 6], [6, 7], [7, 5], [1, 2],
  ];
  const result = planarLayout(ids, edges);

  assert.equal(result.planar, true);
  assert.equal(result.layout.stats.crossings, 0);
  assert.equal(result.layout.positions.size, ids.length);
  assert.equal(result.graph.edgeCount(), 9, 'the simple graph has one edge per endpoint pair');
});

test('TopoLoom rejects a non-planar K3,3 instead of returning a planar embedding', () => {
  const edges = [
    [1, 4], [1, 5], [1, 6],
    [2, 4], [2, 5], [2, 6],
    [3, 4], [3, 5], [3, 6],
  ];
  const result = planarLayout([1, 2, 3, 4, 5, 6], edges);

  assert.equal(result.planar, false);
});

test('findPlanarPositions preserves application IDs and scales non-overlapping nodes', () => {
  const nodes = [101, 305, 907, 1201].map((id) => ({ id, name: `N${id}` }));
  const edges = [
    [101, 305], [101, 907], [101, 1201],
    [305, 907], [305, 1201], [907, 1201],
  ].map(([fromId, toId], index) => ({ id: index + 1, fromId, toId }));

  const positions = findPlanarPositions(nodes, edges);

  assert.deepEqual([...positions.keys()], nodes.map((node) => node.id));
  assert.ok([...positions.values()].every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = positions.get(nodes[i].id);
      const b = positions.get(nodes[j].id);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 132);
    }
  }
});

test('findPlanarPositions returns null for a non-planar graph', () => {
  const nodes = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: `N${index}` }));
  const edges = [
    [1, 4], [1, 5], [1, 6],
    [2, 4], [2, 5], [2, 6],
    [3, 4], [3, 5], [3, 6],
  ].map(([fromId, toId], index) => ({ id: index + 1, fromId, toId }));

  assert.equal(findPlanarPositions(nodes, edges), null);
});

test('findPlanarPositions keeps isolated vertices in the planar drawing', () => {
  const nodes = [1, 2, 3, 4].map((id) => ({ id, name: `N${id}` }));
  const edges = [[1, 2], [2, 3], [3, 1]]
    .map(([fromId, toId], index) => ({ id: index + 1, fromId, toId }));

  const positions = findPlanarPositions(nodes, edges);

  assert.deepEqual([...positions.keys()], nodes.map((node) => node.id));
  assert.ok([...positions.values()].every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  const isolated = positions.get(4);
  for (const id of [1, 2, 3]) {
    const point = positions.get(id);
    assert.ok(Math.hypot(isolated.x - point.x, isolated.y - point.y) >= 336);
  }
});

test('findPlanarPositions rejects coordinates whose straight edges still cross', () => {
  const nodes = Array.from({ length: 100 }, (_, index) => ({ id: index + 1, name: `N${index}` }));
  const edges = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    fromId: index + 1,
    toId: ((index * 7) + 13) % 100 + 1,
    label: `r${index}`,
  })).filter((edge) => edge.fromId !== edge.toId);

  assert.equal(findPlanarPositions(nodes, edges), null, 'the crossing drawing must use the crossing-aware fallback');
});

test('TopoLoom lays out a 100-node, 300-edge planar fixture under the render budget', () => {
  const edges = [[0, 1], [1, 2], [2, 0]];
  const faces = [[0, 1, 2]];
  for (let vertex = 3; vertex < 100; vertex += 1) {
    const [a, b, c] = faces.shift();
    edges.push([vertex, a], [vertex, b], [vertex, c]);
    faces.push([vertex, a, b], [vertex, b, c], [vertex, c, a]);
  }
  for (let index = 0; index < 6; index += 1) edges.push(edges[index]);

  const start = process.hrtime.bigint();
  const result = planarLayout(Array.from({ length: 100 }, (_, index) => index), edges);
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

  assert.equal(result.planar, true);
  assert.equal(result.graph.edgeCount(), 294);
  assert.equal(result.layout.positions.size, 100);
  assert.equal(result.layout.stats.crossings, 0);
  assert.ok(elapsedMs < 150, `planar layout took ${elapsedMs.toFixed(1)}ms, over the 150ms budget`);
});
