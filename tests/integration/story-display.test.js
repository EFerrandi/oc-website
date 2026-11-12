import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function withApp(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

test('standalone stories preserve mixed line endings and escape authored markup', async (t) => {
  const { app, db, ids } = withApp(t);
  db.prepare('UPDATE story SET body = ? WHERE id = ?')
    .run('First line.\r\nSecond <script>alert(1)</script>.\n\nThird line.\rFourth line.', ids.storySfw);

  const response = await request(app).get('/stories/a-quiet-morning');
  assert.equal(response.status, 200);
  assert.match(response.text, /<p>First line\.<br>Second &lt;script&gt;alert\(1\)&lt;\/script&gt;\.<\/p>\s*<p>Third line\.<br>Fourth line\.<\/p>/);
});

test('standalone stories treat whitespace-only lines as paragraph separators', async (t) => {
  const { app, db, ids } = withApp(t);
  db.prepare('UPDATE story SET body = ? WHERE id = ?')
    .run('First paragraph.\n \t \nSecond paragraph.', ids.storySfw);

  const response = await request(app).get('/stories/a-quiet-morning');
  assert.equal(response.status, 200);
  assert.match(response.text, /<p>First paragraph\.<\/p>\s*<p>Second paragraph\.<\/p>/);
});

test('standalone NSFW stories remain hidden until the visitor opts in', async (t) => {
  const { app } = withApp(t);

  const hidden = await request(app).get('/stories/after-hours');
  assert.equal(hidden.status, 404);
  assert.doesNotMatch(hidden.text, /Explicit story body for gating tests/);

  const visible = await request(app).get('/stories/after-hours').set('Cookie', NSFW_ON);
  assert.equal(visible.status, 200);
  assert.match(visible.text, /Explicit story body for gating tests/);
});
