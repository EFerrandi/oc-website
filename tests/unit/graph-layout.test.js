import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { countCrossings, layoutGraph } from '../../src/lib/graph-layout.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = path.resolve(here, '../../src/lib/graph-layout.js');

/** Build a node list with stable, predictable names. */
function nodes(...names) {
  return names.map((name, i) => ({
    id: i + 1,
    name,
    slug: name.toLowerCase(),
    avatarUrl: `/media/${i + 1}`,
    avatarAlt: name,
  }));
}

/** Build edges from [fromId, toId] pairs. */
function edges(...pairs) {
  return pairs.map(([fromId, toId], i) => ({
    id: i + 1,
    fromId,
    toId,
    label: `rel-${i + 1}`,
  }));
}

test('layoutGraph is deterministic: identical input yields identical output', () => {
  const input = {
    nodes: nodes('Aria', 'Brann', 'Cass', 'Dove'),
    edges: edges([1, 2], [2, 3], [3, 4], [4, 1]),
  };

  const first = layoutGraph(input.nodes, input.edges);

  for (let i = 0; i < 10; i += 1) {
    const again = layoutGraph(input.nodes, input.edges);
    assert.deepEqual(
      again, first,
      'the same input must produce byte-identical output on every call (I-M3, FR-013, SC-004)',
    );
  }
});

test('layoutGraph does not mutate its arguments', () => {
  const n = nodes('Aria', 'Brann');
  const e = edges([1, 2]);
  const nBefore = JSON.parse(JSON.stringify(n));
  const eBefore = JSON.parse(JSON.stringify(e));

  layoutGraph(n, e);

  assert.deepEqual(n, nBefore, 'input nodes must not be mutated');
  assert.deepEqual(e, eBefore, 'input edges must not be mutated');
});

test('layoutGraph imports nothing — no clock, randomness, or I/O', () => {
  const source = fs.readFileSync(sourceFile, 'utf8');

  assert.ok(
    !/^\s*import\s/m.test(source),
    'graph-layout.js must import nothing; purity is what makes the layout deterministic (I-M3)',
  );

  for (const forbidden of ['Math.random', 'Date.now', 'new Date', 'process.', 'require(']) {
    assert.ok(
      !source.includes(forbidden),
      `graph-layout.js must not reference ${forbidden} — it would break determinism (I-M3)`,
    );
  }
});

test('empty input produces an empty but valid layout', () => {
  const result = layoutGraph([], []);

  assert.deepEqual(result.nodes, []);
  assert.deepEqual(result.edges, []);
  assert.equal(result.crossings, 0);
  assert.ok(result.width > 0, 'width must still be a usable viewBox extent');
  assert.ok(result.height > 0, 'height must still be a usable viewBox extent');
});

test('a single character with no relationships still lays out', () => {
  const result = layoutGraph(nodes('Aria'), []);

  assert.equal(result.nodes.length, 1);
  assert.equal(result.crossings, 0);
  assert.ok(Number.isFinite(result.nodes[0].x) && Number.isFinite(result.nodes[0].y));
});

test('every node carries finite coordinates and keeps its identity fields', () => {
  const input = nodes('Aria', 'Brann', 'Cass');
  const result = layoutGraph(input, edges([1, 2], [2, 3]));

  assert.equal(result.nodes.length, 3);

  for (const node of result.nodes) {
    assert.ok(Number.isFinite(node.x), `${node.name} has a finite x`);
    assert.ok(Number.isFinite(node.y), `${node.name} has a finite y`);
    assert.ok(node.slug, 'slug survives the layout');
    assert.ok(node.avatarUrl, 'avatarUrl survives the layout');
  }
});

test('crossings are counted exactly on a circular arrangement', () => {
  // countCrossings is tested directly rather than through layoutGraph: the
  // layout now actively reorders nodes to remove crossings, so asserting a
  // non-zero count through it would be asserting that the optimiser FAILED.
  // The ranking below is an explicit ring order 1,2,3,4.
  const ring = new Map([[1, 0], [2, 1], [3, 2], [4, 3]]);

  // The chords 1-3 and 2-4 are the two diagonals of a quadrilateral.
  assert.equal(countCrossings(edges([1, 3], [2, 4]), ring), 1, 'the two diagonals of a 4-cycle cross once');

  // Adjacent chords share the rim and cannot cross.
  assert.equal(countCrossings(edges([1, 2], [3, 4]), ring), 0, 'disjoint adjacent chords do not cross');

  // Chords sharing an endpoint never cross.
  assert.equal(countCrossings(edges([1, 2], [1, 3], [1, 4]), ring), 0, 'chords sharing an endpoint do not cross');

  // An endpoint outside the ranking belongs to another component.
  assert.equal(countCrossings(edges([1, 3], [2, 9]), ring), 0, 'an edge leaving the ring is not counted');
});

test('parallel relationships between the same pair are separated', () => {
  const result = layoutGraph(
    nodes('Aria', 'Brann'),
    [
      { id: 1, fromId: 1, toId: 2, label: 'rival' },
      { id: 2, fromId: 1, toId: 2, label: 'sibling' },
      { id: 3, fromId: 2, toId: 1, label: 'mentor' },
    ],
  );

  const offsets = result.edges.map((e) => e.curveOffset);
  assert.equal(offsets[0], 0, 'the first edge of a pair is a straight line');
  assert.equal(new Set(offsets).size, 3, 'each parallel edge gets a distinct offset (FR-006)');

  // Distinct offsets are only useful if they move the labels apart.
  const anchors = result.edges.map((e) => `${e.labelX.toFixed(3)},${e.labelY.toFixed(3)}`);
  assert.equal(new Set(anchors).size, 3, 'each parallel edge gets its own label anchor (FR-003)');
});

test('a straight edge anchors its label at the midpoint of the two nodes', () => {
  const result = layoutGraph(nodes('Aria', 'Brann'), edges([1, 2]));

  const [a, b] = result.nodes;
  const edge = result.edges[0];

  assert.equal(edge.curveOffset, 0);
  assert.ok(
    Math.abs(edge.labelX - (a.x + b.x) / 2) < 0.001,
    'label sits at the midpoint in x (FR-003)',
  );
  assert.ok(
    Math.abs(edge.labelY - (a.y + b.y) / 2) < 0.001,
    'label sits at the midpoint in y (FR-003)',
  );
});

test('an edge naming an unknown node is dropped rather than throwing', () => {
  const result = layoutGraph(nodes('Aria'), edges([1, 99]));
  assert.deepEqual(result.edges, [], 'a dangling edge cannot be drawn and must not crash the page');
});

/* ------------------------------------------------------------------ *
 * US4 � the default arrangement is the readable one.
 * ------------------------------------------------------------------ */

/**
 * Crossings of the naive arrangement: nodes in the order they were given,
 * which is name order coming out of the repository. This is the baseline
 * FR-012 is measured against.
 */
function naiveCrossings(nodeList, edgeList) {
  const rank = new Map(nodeList.map((n, i) => [n.id, i]));
  return countCrossings(edgeList, rank);
}

// T032 � FR-012, invariant I-M4.
test('the chosen arrangement is never worse than the name-ordered one', () => {
  const cases = [
    // A 4-cycle written so that name order interleaves it: 1-3, 2-4 cross.
    { n: nodes('A', 'B', 'C', 'D'), e: edges([1, 3], [3, 2], [2, 4], [4, 1]) },
    // A star, which any ordering draws without crossings.
    { n: nodes('A', 'B', 'C', 'D', 'E'), e: edges([1, 2], [1, 3], [1, 4], [1, 5]) },
    // Two interleaved chains.
    { n: nodes('A', 'B', 'C', 'D', 'E', 'F'), e: edges([1, 4], [4, 2], [2, 5], [5, 3], [3, 6]) },
    // Dense: every pair among six characters.
    {
      n: nodes('A', 'B', 'C', 'D', 'E', 'F'),
      e: edges(
        [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
        [2, 3], [2, 4], [2, 5], [2, 6],
        [3, 4], [3, 5], [3, 6],
        [4, 5], [4, 6], [5, 6],
      ),
    },
  ];

  for (const { n, e } of cases) {
    const result = layoutGraph(n, e);
    const baseline = naiveCrossings(n, e);

    assert.ok(
      result.crossings <= baseline,
      `chosen arrangement had ${result.crossings} crossings vs ${baseline} for the naive order`,
    );
  }
});

// T033 � SC-003, achievable clause (research R-011).
test('a forest of relationships lays out with no crossings at all', () => {
  // A tree, deliberately written in an order that interleaves branches so the
  // naive arrangement does cross and a passing result means real work.
  const treeNodes = nodes('A', 'B', 'C', 'D', 'E', 'F', 'G');
  const treeEdges = edges([1, 4], [1, 6], [4, 2], [4, 7], [6, 3], [6, 5]);

  assert.ok(naiveCrossings(treeNodes, treeEdges) > 0, 'baseline must cross, or this proves nothing');
  assert.equal(layoutGraph(treeNodes, treeEdges).crossings, 0, 'a tree must be drawn without crossings');

  // A forest: the same tree plus a separate two-node component and an isolate.
  const forestNodes = nodes('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J');
  const forestEdges = edges([1, 4], [1, 6], [4, 2], [4, 7], [6, 3], [6, 5], [8, 9]);

  assert.equal(layoutGraph(forestNodes, forestEdges).crossings, 0, 'a forest must be drawn without crossings');
});

// T034 � FR-014: unrelated groups do not interleave.
test('two unconnected groups occupy disjoint bounding regions', () => {
  const groupNodes = nodes('A', 'B', 'C', 'D', 'E', 'F');
  // {A,B,C} and {D,E,F}, with no edge between the groups.
  const groupEdges = edges([1, 2], [2, 3], [3, 1], [4, 5], [5, 6], [6, 4]);

  const result = layoutGraph(groupNodes, groupEdges);
  const byId = new Map(result.nodes.map((n) => [n.id, n]));

  const box = (ids) => {
    const members = ids.map((id) => byId.get(id));
    return {
      minX: Math.min(...members.map((n) => n.x - n.r)),
      maxX: Math.max(...members.map((n) => n.x + n.r)),
      minY: Math.min(...members.map((n) => n.y - n.r)),
      maxY: Math.max(...members.map((n) => n.y + n.r)),
    };
  };

  const first = box([1, 2, 3]);
  const second = box([4, 5, 6]);

  const separated = first.maxX <= second.minX || second.maxX <= first.minX
    || first.maxY <= second.minY || second.maxY <= first.minY;

  assert.ok(separated, 'unrelated groups overlapped, so the map reads as one tangled cluster');
});

// T035 � FR-015, invariant I-M5: nothing escapes the frame.
test('every node and every label lies inside the reported bounding box', () => {
  const cases = [
    { n: nodes('A'), e: edges() },
    { n: nodes('A', 'B'), e: edges([1, 2], [1, 2], [2, 1]) },
    { n: nodes('A', 'B', 'C', 'D', 'E'), e: edges([1, 2], [2, 3], [3, 4], [4, 5], [5, 1], [1, 3]) },
    { n: nodes('A', 'B', 'C', 'D'), e: edges([1, 2], [3, 4]) },
  ];

  for (const { n, e } of cases) {
    const { nodes: placed, edges: drawn, width, height } = layoutGraph(n, e);

    for (const node of placed) {
      assert.ok(node.x - node.r >= 0 && node.x + node.r <= width, `node ${node.name} escapes horizontally`);
      assert.ok(node.y - node.r >= 0 && node.y + node.r <= height, `node ${node.name} escapes vertically`);
    }

    for (const edge of drawn) {
      assert.ok(edge.labelX >= 0 && edge.labelX <= width, `label ${edge.label} escapes horizontally`);
      assert.ok(edge.labelY >= 0 && edge.labelY <= height, `label ${edge.label} escapes vertically`);
    }
  }
});

// T036 � SC-007: comfortably inside a page-render budget.
test('a 100-node, 300-edge graph lays out quickly', () => {
  const big = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `C${String(i).padStart(3, '0')}`,
    slug: `c${i}`,
    avatarUrl: `/media/${i + 1}`,
    avatarAlt: `C${i}`,
  }));

  const bigEdges = Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    // Deterministic spread that produces a connected, tangled graph.
    fromId: (i % 100) + 1,
    toId: (((i * 7) + 13) % 100) + 1,
    label: `rel-${i}`,
  })).filter((e) => e.fromId !== e.toId);

  const started = process.hrtime.bigint();
  const result = layoutGraph(big, bigEdges);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  assert.equal(result.nodes.length, 100);
  assert.ok(elapsedMs < 150, `layout took ${elapsedMs.toFixed(1)}ms, over the 150ms budget`);
});
