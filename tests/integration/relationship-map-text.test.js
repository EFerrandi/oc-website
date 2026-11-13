import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { wrapText, layoutGraph } from '../../src/lib/graph-layout.js';
import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

const LONG = 'sworn rivals who secretly respect each other more than anyone else in the entire kingdom';

test('wrapText keeps every character, wraps words and breaks overlong words', () => {
  const lines = wrapText(LONG, 20);
  assert.ok(lines.length > 1);
  assert.ok(lines.every((line) => line.length <= 20));
  assert.equal(lines.join(' '), LONG);

  const broken = wrapText('Supercalifragilisticexpialidocious', 10);
  assert.ok(broken.length > 1);
  assert.ok(broken.every((line) => line.length <= 10));
  assert.equal(broken.join(''), 'Supercalifragilisticexpialidocious');

  assert.deepEqual(wrapText('short', 20), ['short']);
});

test('long text makes the drawing taller and stays inside the box', () => {
  const nodes = [
    { id: 1, name: 'A', slug: 'a', avatarUrl: '/a' },
    { id: 2, name: 'A very long character name indeed', slug: 'b', avatarUrl: '/b' },
  ];
  const short = layoutGraph(nodes, [{ id: 1, fromId: 1, toId: 2, label: 'pals' }]);
  const long = layoutGraph(nodes, [{ id: 1, fromId: 1, toId: 2, label: LONG }]);

  assert.ok(long.height > short.height, 'label lines add height');
  assert.ok(long.edges[0].labelLines.length > 1);
  assert.ok(long.nodes[1].nameLines.length > 1);
  assert.equal(long.nodes[1].nameLines.join(' '), 'A very long character name indeed');

  for (const node of long.nodes) {
    const bottom = node.y + node.r + 16 * node.nameLines.length;
    assert.ok(bottom <= long.height, 'every name line is inside the viewBox');
  }
  const edge = long.edges[0];
  assert.ok(edge.labelY + 8 * edge.labelLines.length <= long.height);
});

test('the page renders the full label and name with no ellipsis', async (t) => {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  ctx.db.prepare('UPDATE relationship SET label = ? WHERE from_character_id = ? AND to_character_id = ?')
    .run(LONG, ids.aria, ids.brann);

  const html = (await request(ctx.app).get('/relationships')).text;
  const label = html.match(/<text class="map-edge-label"[\s\S]*?<\/text>/)[0];
  const text = [...label.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]).join(' ');

  assert.equal(text, LONG);
  assert.ok(!label.includes('…'));
  assert.ok(html.includes(LONG), 'the text equivalent has the full label');
});
