import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMapModel } from '../../src/lib/relationship-map-model.js';

const character = (id, name, extra = {}) => ({
  id,
  name,
  slug: name.toLowerCase(),
  avatar: { id: id + 100, altText: `${name} portrait`, width: 400, height: 300 },
  crop: { x: 25, y: 75, zoom: 1.5 },
  ...extra,
});

test('buildMapModel deduplicates relationship endpoints and preserves every edge', () => {
  const aria = character(1, 'Aria');
  const brann = character(2, 'Brann');
  const cass = character(3, 'Cass');
  const rows = [
    { id: 11, from: aria, to: brann, label: 'friends', isOneSided: false },
    { id: 12, from: brann, to: aria, label: 'colleagues', isOneSided: true },
    { id: 13, from: aria, to: cass, label: 'siblings', isOneSided: false },
  ];

  const result = buildMapModel(rows);

  assert.deepEqual(result.nodes.map(({ id }) => id), [1, 2, 3]);
  assert.deepEqual(result.edges.map(({ id, fromId, toId }) => ({ id, fromId, toId })), [
    { id: 11, fromId: 1, toId: 2 },
    { id: 12, fromId: 2, toId: 1 },
    { id: 13, fromId: 1, toId: 3 },
  ]);
  assert.equal(result.edges[1].isOneSided, true);
  assert.equal(result.nodes[0].avatarUrl, '/media/101');
  assert.equal(result.nodes[0].cropZoom, 1.5);
});

test('buildMapModel includes the optional profile character even without a relationship row', () => {
  const isolated = character(9, 'Isolated');

  const result = buildMapModel([], isolated);

  assert.deepEqual(result.nodes.map(({ id }) => id), [9]);
  assert.deepEqual(result.edges, []);
});

test('buildMapModel adds the profile character before its directly related nodes', () => {
  const aria = character(1, 'Aria');
  const brann = character(2, 'Brann');

  const result = buildMapModel([
    { id: 11, from: aria, to: brann, label: 'friends', isOneSided: false },
  ], aria);

  assert.deepEqual(result.nodes.map(({ id }) => id), [1, 2]);
  assert.equal(result.edges.length, 1);
});
