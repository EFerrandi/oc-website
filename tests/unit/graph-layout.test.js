import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { compactPositions } from '../../src/lib/compact-layout.js';
import { countCrossings, layoutGraph, LINE_HEIGHT } from '../../src/lib/graph-layout.js';
import { findPlanarPositions } from '../../src/lib/planar-layout.js';
import { makeEdges, makeNodes, sparseNetwork } from '../helpers/layout-metrics.js';

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

test('layoutGraph keeps wrapped labels clear of the avatars on a two-node map', () => {
  const longLabel = 'childhood friends who grew up together';
  const result = layoutGraph(nodes('Aria', 'Brann'), [{ id: 1, fromId: 1, toId: 2, label: longLabel }]);
  const [a, b] = result.nodes;
  const edge = result.edges[0];
  const widest = Math.max(...edge.labelLines.map((l) => l.length)) * 7.5;
  const rimGap = Math.hypot(a.x - b.x, a.y - b.y) - 2 * a.r;
  assert.ok(rimGap >= widest, `rim gap ${rimGap} must fit label width ${widest}`);
});

test('relationship avatars use the enlarged radius and geometry includes their full bounds', () => {
  const result = layoutGraph(nodes('Aria', 'Brann'), edges([1, 2]));
  const [a, b] = result.nodes;
  const [edge] = result.edges;

  assert.equal(a.r, 48, 'face diameter must be 96 layout units');
  for (const node of result.nodes) {
    assert.ok(node.x - node.r >= 0 && node.x + node.r <= result.width, 'avatar must fit horizontally');
    assert.ok(node.y - node.r >= 0 && node.y + node.r <= result.height, 'avatar must fit vertically');
  }
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 2 * a.r, 'two avatars must not overlap');
  assert.ok(edge.labelLines.join(' ').includes(edge.label), 'wrapping must preserve the complete relationship label');
});

test('variable avatar radii are respected by bounds, spacing, and one-sided arrow endpoints', () => {
  const inputNodes = nodes('Aria', 'Brann');
  inputNodes[0].r = 54;
  inputNodes[1].r = 72;
  const inputEdges = [{ id: 1, fromId: 1, toId: 2, label: 'friends', isOneSided: true }];

  const result = layoutGraph(inputNodes, inputEdges);
  const [a, b] = result.nodes;
  const [edge] = result.edges;

  assert.equal(a.r, 54);
  assert.equal(b.r, 72);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r, 'avatar faces must not overlap');
  for (const node of result.nodes) {
    assert.ok(node.x - node.r >= 0 && node.x + node.r <= result.width);
    assert.ok(node.y - node.r >= 0 && node.y + node.r <= result.height);
    assert.equal(node.imageWidth, 2 * node.r);
    assert.equal(node.imageHeight, 2 * node.r);
  }
  assert.ok(Math.abs(Math.hypot(b.x - edge.pathEndX, b.y - edge.pathEndY) - 75) < 1e-8,
    'one-sided arrow ends at the target radius plus its three-unit gap');
});

test('layoutGraph reproduces the gallery cover + object-position + zoom geometry', () => {
  const wide = [{ ...nodes('Aria')[0], imageWidth: 200, imageHeight: 100, cropX: 50, cropY: 50, cropZoom: 1 }];
  const [n] = layoutGraph(wide, []).nodes;
  assert.equal(n.imageWidth, 192);
  assert.equal(n.imageHeight, 96);
  assert.equal(n.imageX, -48 + (96 - 192) * 0.5);
  assert.equal(n.imageY, -48);
});

test('layoutGraph zooms about the crop focus point like transform-origin', () => {
  const zoomed = [{ ...nodes('Aria')[0], imageWidth: 100, imageHeight: 100, cropX: 0, cropY: 100, cropZoom: 2 }];
  const [n] = layoutGraph(zoomed, []).nodes;
  assert.equal(n.imageWidth, 192);
  assert.equal(n.imageX, -48, 'left focus keeps the left edge fixed');
  assert.equal(n.imageY, -48 + 96 - 192, 'bottom focus keeps the bottom edge fixed');
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

test('a profile layout centers its character and arranges every relationship around it', () => {
  const inputNodes = nodes('Aria', 'Brann', 'Cass');
  const inputEdges = [
    { id: 1, fromId: 1, toId: 2, label: 'childhood friends' },
    { id: 2, fromId: 1, toId: 2, label: 'colleagues' },
    { id: 3, fromId: 3, toId: 1, label: 'siblings', isOneSided: true },
  ];

  const result = layoutGraph(inputNodes, inputEdges, { centerId: 1 });
  const center = result.nodes.find((node) => node.id === 1);
  const others = result.nodes.filter((node) => node.id !== 1);

  assert.equal(center.x, result.width / 2);
  assert.equal(center.y, result.height / 2);
  assert.equal(others.length, 2);
  assert.ok(others.every((node) => Math.hypot(node.x - center.x, node.y - center.y) > 2 * center.r));
  assert.equal(result.edges.length, 3, 'parallel and one-sided relationships remain distinct');
  assert.equal(result.crossings, 0, 'all visible relationships share the profile character');
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

test('a planar K4 layout has zero crossings even though the graph is not outerplanar', () => {
  const graphNodes = nodes('A', 'B', 'C', 'D');
  const graphEdges = edges([1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]);
  const planarPositions = findPlanarPositions(graphNodes, graphEdges);

  assert.ok(planarPositions, 'K4 has a planar embedding');
  const result = layoutGraph(graphNodes, graphEdges, { planarPositions });
  assert.equal(result.crossings, 0);
  assert.equal(result.edges.length, graphEdges.length);
});

test('disconnected planar components with parallel relationships retain a zero-crossing layout', () => {
  const graphNodes = nodes('A', 'B', 'C', 'D', 'E', 'F', 'G');
  const graphEdges = edges(
    [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
    [5, 6], [6, 7], [7, 5], [1, 2],
  );
  const planarPositions = findPlanarPositions(graphNodes, graphEdges);

  assert.ok(planarPositions, 'both disconnected components are planar');
  const result = layoutGraph(graphNodes, graphEdges, { planarPositions });

  assert.equal(result.crossings, 0);
  assert.equal(result.edges.length, graphEdges.length, 'parallel relationship records are not dropped');
});

test('parallel routes do not cross unrelated edges in a planar drawing', () => {
  const graphNodes = nodes('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I');
  const graphEdges = edges(
    [1, 2], [2, 3], [3, 1],
    [4, 1], [4, 2], [4, 3],
    [5, 4], [5, 1], [5, 2],
    [6, 5], [6, 1], [6, 2],
    [7, 6], [7, 5], [7, 1],
    [8, 7], [8, 5], [8, 1],
    [9, 6], [9, 1], [9, 2],
    [5, 1], [5, 1], [7, 5], [8, 5], [8, 5],
  );
  const planarPositions = findPlanarPositions(graphNodes, graphEdges);
  assert.ok(planarPositions, 'the simple graph has a planar embedding');

  const result = layoutGraph(graphNodes, graphEdges, { planarPositions });
  const segments = result.edges.map((edge) => {
    const points = [];
    for (let index = 0; index <= 64; index += 1) {
      const t = index / 64;
      const inverse = 1 - t;
      points.push({
        x: inverse ** 2 * edge.pathStartX + 2 * inverse * t * edge.controlX + t ** 2 * edge.pathEndX,
        y: inverse ** 2 * edge.pathStartY + 2 * inverse * t * edge.controlY + t ** 2 * edge.pathEndY,
      });
    }
    return { edge, points };
  });
  const orientation = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const intersects = (a, b, c, d) => orientation(a, b, c) * orientation(a, b, d) < 0
    && orientation(c, d, a) * orientation(c, d, b) < 0;

  for (let first = 0; first < segments.length; first += 1) {
    for (let second = first + 1; second < segments.length; second += 1) {
      const a = segments[first];
      const b = segments[second];
      if ([a.edge.fromId, a.edge.toId].some((id) => id === b.edge.fromId || id === b.edge.toId)) continue;

      for (let aIndex = 0; aIndex < a.points.length - 1; aIndex += 1) {
        for (let bIndex = 0; bIndex < b.points.length - 1; bIndex += 1) {
          assert.equal(
            intersects(a.points[aIndex], a.points[aIndex + 1], b.points[bIndex], b.points[bIndex + 1]),
            false,
            `routed relationships ${a.edge.id} and ${b.edge.id} cross`,
          );
        }
      }
    }
  }

  assert.equal(result.crossings, 0);
  assert.deepEqual(result.edges.map((edge) => edge.labelLines.join(' ')), graphEdges.map((edge) => edge.label));
  assert.ok(result.edges.every((edge) => edge.labelX >= 0 && edge.labelX <= result.width
    && edge.labelY >= 0 && edge.labelY <= result.height), 'all complete relationship labels remain in bounds');

  const parallelEdges = new Map();
  for (const edge of result.edges) {
    const key = edge.fromId < edge.toId ? `${edge.fromId}:${edge.toId}` : `${edge.toId}:${edge.fromId}`;
    parallelEdges.set(key, [...(parallelEdges.get(key) ?? []), edge]);
  }
  for (const group of parallelEdges.values()) {
    for (let first = 0; first < group.length; first += 1) {
      for (let second = first + 1; second < group.length; second += 1) {
        const a = group[first];
        const b = group[second];
        const widthA = Math.max(...a.labelLines.map((line) => line.length)) * 9.2;
        const widthB = Math.max(...b.labelLines.map((line) => line.length)) * 9.2;
        const heightA = a.labelLines.length * 20;
        const heightB = b.labelLines.length * 20;
        assert.ok(
          Math.abs(a.labelX - b.labelX) >= (widthA + widthB) / 2
            || Math.abs(a.labelY - b.labelY) >= (heightA + heightB) / 2,
          `parallel labels ${a.label} and ${b.label} overlap`,
        );
      }
    }
  }
});

test('a non-planar K3,3 layout does not exceed its input-order baseline', () => {
  const graphNodes = nodes('A', 'B', 'C', 'D', 'E', 'F');
  const graphEdges = edges(
    [1, 4], [1, 5], [1, 6],
    [2, 4], [2, 5], [2, 6],
    [3, 4], [3, 5], [3, 6],
  );
  const inputOrder = new Map(graphNodes.map((node, index) => [node.id, index]));

  assert.ok(layoutGraph(graphNodes, graphEdges).crossings <= countCrossings(graphEdges, inputOrder));
});

test('a non-planar graph keeps the caller input ordering as a crossing baseline', () => {
  const graphNodes = nodes('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J');
  const graphEdges = edges(
    [1, 2], [1, 7], [1, 9], [1, 10],
    [2, 3], [2, 4], [2, 5], [2, 10],
    [3, 4], [3, 7], [3, 8], [3, 9],
    [4, 5], [4, 6], [4, 7], [4, 9],
    [5, 8], [6, 7], [6, 9], [8, 9],
  );
  const callerOrder = new Map(graphNodes.map((node, index) => [node.id, index]));

  assert.equal(findPlanarPositions(graphNodes, graphEdges), null, 'the fixture exercises non-planar fallback');
  assert.ok(
    layoutGraph(graphNodes, graphEdges).crossings <= countCrossings(graphEdges, callerOrder),
    'the selected fallback must never exceed the original caller-order crossing count',
  );
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

test('long parallel relationship labels stay on their routes and do not overlap', () => {
  const graphNodes = nodes('Aria', 'Brann');
  const labels = [
    'They have known each other since childhood and frequently travel together',
    'They become allies after a long and difficult journey across the country',
    'A trusted friendship built over years of sharing dangerous adventures',
  ];
  const result = layoutGraph(graphNodes, labels.map((label, index) => ({
    id: index + 1,
    fromId: 1,
    toId: 2,
    label,
  })));

  for (const edge of result.edges) {
    const inverse = 1 - edge.labelT;
    const point = {
      x: inverse ** 2 * edge.pathStartX + 2 * inverse * edge.labelT * edge.controlX
        + edge.labelT ** 2 * edge.pathEndX,
      y: inverse ** 2 * edge.pathStartY + 2 * inverse * edge.labelT * edge.controlY
        + edge.labelT ** 2 * edge.pathEndY,
    };
    assert.ok(Math.hypot(edge.labelX - point.x, edge.labelY - point.y) < 0.001, `${edge.label} label is on its curve`);
    assert.equal(edge.labelLines.join(' '), edge.label, 'label text remains complete');
  }

  for (let first = 0; first < result.edges.length; first += 1) {
    for (let second = first + 1; second < result.edges.length; second += 1) {
      const a = result.edges[first];
      const b = result.edges[second];
      const widthA = Math.max(...a.labelLines.map((line) => line.length)) * 9.2;
      const widthB = Math.max(...b.labelLines.map((line) => line.length)) * 9.2;
      const heightA = a.labelLines.length * 20;
      const heightB = b.labelLines.length * 20;
      assert.ok(
        Math.abs(a.labelX - b.labelX) >= (widthA + widthB) / 2
          || Math.abs(a.labelY - b.labelY) >= (heightA + heightB) / 2,
        `${a.label} and ${b.label} labels overlap`,
      );
    }
  }
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

test('layoutGraph uses supplied placed positions instead of the ring or planar placement', () => {
  const input = nodes('Aria', 'Brann', 'Cass');
  const links = edges([1, 2], [2, 3]);
  const placed = new Map([[1, { x: 0, y: 0 }], [2, { x: 300, y: 0 }], [3, { x: 600, y: 0 }]]);

  const result = layoutGraph(input, links, { placed });
  const [a, b, c] = result.nodes;

  assert.equal(b.x - a.x, 300);
  assert.equal(c.x - b.x, 300);
  assert.equal(a.y, b.y);
  assert.equal(result.crossings, 0);
  assert.deepEqual(Object.keys(result).sort(), ['crossings', 'edges', 'height', 'nodes', 'width']);
  for (const node of result.nodes) {
    assert.ok(node.x - node.r >= 0 && node.x + node.r <= result.width, 'avatar inside the box');
    assert.ok(node.nameLines.length >= 1 && Number.isFinite(node.imageX));
  }
  for (const edge of result.edges) {
    assert.ok(edge.labelX > 0 && edge.labelX < result.width, 'label inside the box');
  }
});

test('layoutGraph reports straight crossings for placed positions and ignores partial maps', () => {
  const input = nodes('Aria', 'Brann', 'Cass', 'Dove');
  const links = edges([1, 2], [3, 4]);
  const crossed = new Map([
    [1, { x: 0, y: 0 }], [2, { x: 400, y: 400 }], [3, { x: 400, y: 0 }], [4, { x: 0, y: 400 }],
  ]);

  assert.equal(layoutGraph(input, links, { placed: crossed }).crossings, 1);

  const partial = new Map([[1, { x: 0, y: 0 }]]);
  const fallback = layoutGraph(input, links, { placed: partial });
  assert.deepEqual(fallback, layoutGraph(input, links));
});

test('layoutGraph without placed keeps the profile centre layout', () => {
  const input = nodes('Aria', 'Brann', 'Cass');
  const links = edges([1, 2], [1, 3]);

  const result = layoutGraph(input, links, { centerId: 1 });
  const centre = result.nodes.find((node) => node.id === 1);

  assert.equal(centre.x, result.width / 2);
  assert.equal(centre.y, result.height / 2);
});

test('placed compact layouts keep labels clear of avatars, names and other labels', () => {
  const tree = {
    nodes: makeNodes(30),
    edges: makeEdges(
      Array.from({ length: 29 }, (_, i) => [((i * 5) % (i + 1)) + 1, i + 2]),
      (i) => ['friend', 'rival of the old guard', 'sworn sibling', 'mentor'][i % 4],
    ),
  };

  for (const { nodes, edges } of [tree, sparseNetwork(15, 22)]) {
    const result = layoutGraph(nodes, edges, { placed: compactPositions(nodes, edges) });
    const labels = result.edges.map((edge) => ({
      id: edge.id,
      left: edge.labelX - (Math.max(...edge.labelLines.map((l) => l.length)) * 9.2) / 2,
      right: edge.labelX + (Math.max(...edge.labelLines.map((l) => l.length)) * 9.2) / 2,
      top: edge.labelY - (edge.labelLines.length * LINE_HEIGHT) / 2,
      bottom: edge.labelY + (edge.labelLines.length * LINE_HEIGHT) / 2,
    }));

    for (const label of labels) {
      for (const node of result.nodes) {
        const nearestX = Math.max(label.left, Math.min(node.x, label.right));
        const nearestY = Math.max(label.top, Math.min(node.y, label.bottom));
        assert.ok(Math.hypot(nearestX - node.x, nearestY - node.y) >= node.r, `label ${label.id} covers avatar ${node.id}`);

        const halfName = (Math.max(...node.nameLines.map((l) => l.length)) * 9.2) / 2;
        const overlapsName = label.left < node.x + halfName && label.right > node.x - halfName
          && label.top < node.y + node.r + 8 + node.nameLines.length * LINE_HEIGHT && label.bottom > node.y + node.r;
        assert.ok(!overlapsName, `label ${label.id} covers the name of ${node.id}`);
      }
    }

    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        const a = labels[i];
        const b = labels[j];
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        assert.ok(apart, `labels ${a.id} and ${b.id} overlap`);
      }
    }
  }
});
