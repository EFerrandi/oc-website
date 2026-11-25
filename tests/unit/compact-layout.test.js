import assert from 'node:assert/strict';
import test from 'node:test';

import { layoutGraph } from '../../src/lib/graph-layout.js';
import { findPlanarPositions } from '../../src/lib/planar-layout.js';
import { compactPositions, MIN_CLEARANCE } from '../../src/lib/compact-layout.js';
import {
  averageLinkLength,
  baselineLayout,
  countStraightCrossings,
  denseNetwork,
  linkOverUnrelatedAvatar,
  makeEdges,
  makeNodes,
  onSingleCircle,
  smallestClearance,
  sparseNetwork,
} from '../helpers/layout-metrics.js';

/** A 10 character cluster: a hub with four spokes, a chain, and a short tail. */
function clusterPairs(offset) {
  const id = (n) => offset + n;
  return [
    [id(1), id(2)], [id(1), id(3)], [id(1), id(4)], [id(1), id(5)],
    [id(5), id(6)], [id(6), id(7)], [id(7), id(8)],
    [id(3), id(9)], [id(9), id(10)],
  ];
}

/** `clusters` clusters whose hubs are chained together: one tree of 10 * clusters characters. */
function clusterNetwork(clusters) {
  const pairs = [];
  for (let k = 0; k < clusters; k += 1) {
    pairs.push(...clusterPairs(10 * k));
    if (k > 0) pairs.push([10 * (k - 1) + 1, 10 * k + 1]);
  }
  return { nodes: makeNodes(10 * clusters), edges: makeEdges(pairs) };
}

function complete(count) {
  const pairs = [];
  for (let a = 1; a <= count; a += 1) for (let b = a + 1; b <= count; b += 1) pairs.push([a, b]);
  return { nodes: makeNodes(count), edges: makeEdges(pairs) };
}

function pathNetwork(count) {
  const pairs = [];
  for (let id = 1; id < count; id += 1) pairs.push([id, id + 1]);
  return { nodes: makeNodes(count), edges: makeEdges(pairs) };
}

function boxOf(ids, nodes, positions) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const id of ids) {
    const { x, y } = positions.get(id);
    const r = byId.get(id).r;
    box.minX = Math.min(box.minX, x - r);
    box.maxX = Math.max(box.maxX, x + r);
    box.minY = Math.min(box.minY, y - r);
    box.maxY = Math.max(box.maxY, y + r);
  }
  return box;
}

const area = (box) => (box.maxX - box.minX) * (box.maxY - box.minY);

test('compactPositions covers every node with finite, non-overlapping positions', () => {
  for (const { nodes, edges } of [clusterNetwork(1), clusterNetwork(2), clusterNetwork(3)]) {
    const positions = compactPositions(nodes, edges);

    assert.equal(positions.size, nodes.length);
    for (const node of nodes) {
      const point = positions.get(node.id);
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    }
    assert.ok(smallestClearance(nodes, positions) >= MIN_CLEARANCE - 0.5, 'avatars keep their clearance');
  }
  assert.equal(compactPositions([], []), null);
});

test('compactPositions shortens the average link by at least 40% on 10 to 30 character networks', () => {
  const networks = [
    clusterNetwork(1),
    clusterNetwork(2),
    clusterNetwork(3),
    sparseNetwork(15, 22),
  ];

  for (const { nodes, edges } of networks) {
    const before = averageLinkLength(edges, baselineLayout(nodes, edges).positions);
    const after = averageLinkLength(edges, compactPositions(nodes, edges));

    assert.ok(after <= 0.6 * before, `${nodes.length} nodes: ${after.toFixed(0)} is not 40% below ${before.toFixed(0)}`);
  }
});

test('compactPositions never lengthens links on a dense network', () => {
  const { nodes, edges } = sparseNetwork(24, 34);
  const before = averageLinkLength(edges, baselineLayout(nodes, edges).positions);
  assert.ok(averageLinkLength(edges, compactPositions(nodes, edges)) <= before);
});

test('compactPositions keeps a character with one link next to its neighbour', () => {
  const { nodes, edges } = clusterNetwork(2);
  const positions = compactPositions(nodes, edges);

  // Characters 2, 4, 8 and 10 each have a single link.
  for (const [leaf, neighbour] of [[2, 1], [4, 1], [8, 7], [10, 9]]) {
    const a = positions.get(leaf);
    const b = positions.get(neighbour);
    const gap = Math.hypot(a.x - b.x, a.y - b.y) - 2 * 48;
    assert.ok(gap <= 200, `character ${leaf} is ${gap.toFixed(0)}px from its neighbour's rim`);
  }
});

test('compactPositions places a hub among its neighbours and keeps a chain straight', () => {
  const { nodes, edges } = clusterNetwork(1);
  const positions = compactPositions(nodes, edges);
  const hub = positions.get(1);
  const neighbours = [2, 3, 4, 5].map((id) => positions.get(id));
  const centroid = {
    x: neighbours.reduce((sum, p) => sum + p.x, 0) / neighbours.length,
    y: neighbours.reduce((sum, p) => sum + p.y, 0) / neighbours.length,
  };
  const meanDistance = neighbours.reduce((sum, p) => sum + Math.hypot(p.x - hub.x, p.y - hub.y), 0) / neighbours.length;

  assert.ok(Math.hypot(centroid.x - hub.x, centroid.y - hub.y) < meanDistance, 'neighbours surround the hub');

  const chain = pathNetwork(8);
  const line = compactPositions(chain.nodes, chain.edges);
  const length = chain.edges.reduce((sum, edge) => {
    const a = line.get(edge.fromId);
    const b = line.get(edge.toId);
    return sum + Math.hypot(a.x - b.x, a.y - b.y);
  }, 0);
  const ends = Math.hypot(line.get(1).x - line.get(8).x, line.get(1).y - line.get(8).y);

  assert.ok(ends >= 0.6 * length, 'the chain reads as a path, not folded onto a circle');
});

test('compactPositions never places a network with structure on one circle', () => {
  for (const { nodes, edges } of [clusterNetwork(1), clusterNetwork(2), clusterNetwork(3), sparseNetwork(15, 22)]) {
    assert.equal(onSingleCircle(nodes, compactPositions(nodes, edges)), false);
  }
  const star = { nodes: makeNodes(7), edges: makeEdges([[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]]) };
  assert.equal(onSingleCircle(star.nodes, compactPositions(star.nodes, star.edges)), false);
});

test('compactPositions is identical across repeated runs', () => {
  const { nodes, edges } = sparseNetwork(30, 45);
  const first = JSON.stringify([...compactPositions(nodes, edges)]);

  for (let run = 0; run < 5; run += 1) {
    assert.equal(JSON.stringify([...compactPositions(nodes, edges)]), first);
  }
});

test('compactPositions handles 150 characters and 300 relationships in under one second', () => {
  const { nodes, edges } = sparseNetwork(150, 300);
  const started = process.hrtime.bigint();
  const positions = compactPositions(nodes, edges);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  assert.equal(positions.size, 150);
  assert.ok(elapsedMs < 1000, `layout took ${elapsedMs.toFixed(0)}ms`);
});

test('compactPositions packs separate groups together without overlap or large gaps', () => {
  const big = clusterPairs(0);
  const mid = [[11, 12], [12, 13], [13, 14], [14, 15]];
  const pair = [[16, 17]];
  const nodes = makeNodes(17);
  const edges = makeEdges([...big, ...mid, ...pair]);
  const positions = compactPositions(nodes, edges);
  const groups = [
    Array.from({ length: 10 }, (_, i) => i + 1),
    [11, 12, 13, 14, 15],
    [16, 17],
  ];
  const boxes = groups.map((ids) => boxOf(ids, nodes, positions));

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY;
      assert.ok(apart, `groups ${i} and ${j} overlap`);
    }
  }

  const all = boxOf(nodes.map((node) => node.id), nodes, positions);
  const used = boxes.reduce((sum, box) => sum + area(box), 0);
  assert.ok(used / area(all) >= 0.4, `only ${(100 * used / area(all)).toFixed(0)}% of the map is used`);
});

test('compactPositions has no crossings on planar networks and never more than before otherwise', () => {
  const wheel = {
    nodes: makeNodes(7),
    edges: makeEdges([[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 2]]),
  };

  for (const { nodes, edges } of [clusterNetwork(1), clusterNetwork(3), wheel]) {
    assert.equal(countStraightCrossings(edges, compactPositions(nodes, edges)), 0);
  }

  for (const { nodes, edges } of [complete(5), complete(6), sparseNetwork(15, 25), sparseNetwork(24, 40)]) {
    const baseline = baselineLayout(nodes, edges);
    const positions = compactPositions(nodes, edges);

    assert.ok(countStraightCrossings(edges, positions) <= countStraightCrossings(edges, baseline.positions));
    assert.ok(
      linkOverUnrelatedAvatar(nodes, edges, positions) <= linkOverUnrelatedAvatar(nodes, edges, baseline.positions),
      'no more links over unrelated avatars than before',
    );
  }
});

test('compactPositions copes with self-links and parallel relationships', () => {
  const nodes = makeNodes(4);
  const edges = makeEdges([[1, 2], [1, 2], [2, 2], [2, 3], [3, 4]], (index) => `relationship number ${index}`);
  const positions = compactPositions(nodes, edges);

  assert.equal(positions.size, 4);
  assert.ok(smallestClearance(nodes, positions) >= MIN_CLEARANCE - 0.5);
});

test('compactPositions keeps large hubs and trees within a bounded area', () => {
  const star = { nodes: makeNodes(120), edges: makeEdges(Array.from({ length: 119 }, (_, i) => [1, i + 2])) };
  const tree = { nodes: makeNodes(120), edges: makeEdges(Array.from({ length: 119 }, (_, i) => [((i * 7) % (i + 1)) + 1, i + 2])) };

  for (const { nodes, edges } of [star, tree]) {
    const result = layoutGraph(nodes, edges, { placed: compactPositions(nodes, edges) });
    const cells = nodes.length * 96 * 136;
    assert.ok(result.width * result.height < 25 * cells, `${(result.width * result.height) / cells} times the avatar area`);
  }
});
test('compactPositions draws the reported dense SFW network compactly with no link over an avatar', () => {
  const { nodes, edges } = denseNetwork();
  const positions = compactPositions(nodes, edges);
  const result = layoutGraph(nodes, edges, { placed: positions });
  const cells = nodes.length * 96 * 136;

  assert.equal(positions.size, nodes.length);
  assert.ok(result.width * result.height < 25 * cells, `${(result.width * result.height) / cells} times the avatar area`);
  assert.ok(Math.max(result.width, result.height) < 4000, `${result.width} x ${result.height}`);
  assert.equal(linkOverUnrelatedAvatar(nodes, edges, positions), 0);
  assert.ok(smallestClearance(nodes, positions) >= MIN_CLEARANCE - 0.5);
});
test('compactPositions keeps varied dense networks compact and clear of avatar overlaps', () => {
  for (const [count, links] of [[35, 60], [60, 120], [120, 200]]) {
    const { nodes, edges } = sparseNetwork(count, links);
    const positions = compactPositions(nodes, edges);
    const result = layoutGraph(nodes, edges, { placed: positions });
    const cells = nodes.length * 96 * 136;

    assert.ok(result.width * result.height < 25 * cells, `${count}/${links}: ${(result.width * result.height) / cells} times the avatar area`);
    assert.ok(smallestClearance(nodes, positions) >= MIN_CLEARANCE - 0.5);
    // Dense random graphs cannot be fully clear; keep the count under one per link.
    assert.ok(linkOverUnrelatedAvatar(nodes, edges, positions) <= links, `${count}/${links}: too many links over avatars`);
  }
});

test('compactPositions is identical across runs on the dense network', () => {
  const { nodes, edges } = denseNetwork();
  const first = [...compactPositions(nodes, edges)];
  assert.deepEqual([...compactPositions(nodes, edges)], first);
});

test('compactPositions keeps zero crossings on planar networks even when they are large', () => {
  const tree = { nodes: makeNodes(60), edges: makeEdges(Array.from({ length: 59 }, (_, i) => [((i * 5) % (i + 1)) + 1, i + 2])) };
  const positions = compactPositions(tree.nodes, tree.edges);

  assert.equal(countStraightCrossings(tree.edges, positions), 0);
  assert.equal(linkOverUnrelatedAvatar(tree.nodes, tree.edges, positions), 0);
});

test('compactPositions allows crossings only when the crossing-free drawing is far larger', () => {
  const nestedTriangles = (levels) => {
    const pairs = [];
    for (let level = 0; level < levels; level += 1) {
      for (let corner = 0; corner < 3; corner += 1) {
        pairs.push([level * 3 + corner + 1, level * 3 + ((corner + 1) % 3) + 1]);
        if (level < levels - 1) pairs.push([level * 3 + corner + 1, (level + 1) * 3 + corner + 1]);
      }
    }
    return { nodes: makeNodes(levels * 3), edges: makeEdges(pairs) };
  };
  const areaOf = (nodes, edges, options) => {
    const result = layoutGraph(nodes, edges, options);
    return { crossings: result.crossings, area: result.width * result.height };
  };

  // Planar, but its crossing-free drawing needs far more than twice the compact area.
  const big = nestedTriangles(6);
  const planar = areaOf(big.nodes, big.edges, { planarPositions: findPlanarPositions(big.nodes, big.edges) });
  const compact = compactPositions(big.nodes, big.edges);
  const compactArea = areaOf(big.nodes, big.edges, { placed: compact }).area;
  assert.equal(planar.crossings, 0);
  assert.ok(planar.area > 2 * compactArea, 'crossing-free drawing is more than twice as large');
  assert.ok(countStraightCrossings(big.edges, compact) > 0, 'crossings are allowed past the threshold');

  // A planar network whose crossing-free drawing is compact stays crossing-free.
  const rungs = [];
  for (let i = 1; i <= 5; i += 1) {
    rungs.push([i, i + 5]);
    if (i < 5) rungs.push([i, i + 1], [i + 5, i + 6]);
  }
  const small = { nodes: makeNodes(10), edges: makeEdges(rungs) };
  assert.equal(countStraightCrossings(small.edges, compactPositions(small.nodes, small.edges)), 0);
});
