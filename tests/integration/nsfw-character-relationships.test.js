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

test('profile diagrams omit NSFW relationship nodes, labels, and avatar URLs until opt-in', async (t) => {
  const { app, ids } = withApp(t);

  const hidden = await request(app).get('/characters/aria');
  assert.equal(hidden.status, 200);
  assert.ok(!hidden.text.includes('Shadow'), 'the excluded character name must not reach the response');
  assert.ok(!hidden.text.includes('lovers'), 'the excluded relationship label must not reach the response');
  assert.ok(!hidden.text.includes(`/characters/shadow`), 'the excluded profile link must not reach the response');
  assert.ok(!hidden.text.includes(`/media/${ids.imageNsfwShadow}`), 'the excluded avatar ID must not reach the response');
  assert.match(hidden.text, new RegExp(`data-node="${ids.aria}"\\s+data-neighbor-count="1"`),
    'Aria must be sized using only the visible SFW neighbor');

  const visible = await request(app).get('/characters/aria').set('Cookie', NSFW_ON);
  assert.equal(visible.status, 200);
  assert.ok(visible.text.includes('Shadow'), 'the relationship node appears after opt-in');
  assert.ok(visible.text.includes('lovers'), 'the relationship label appears after opt-in');
  assert.ok(visible.text.includes(`/characters/shadow`), 'the related-character profile link appears after opt-in');
  assert.ok(visible.text.includes(`/media/${ids.imageNsfwShadow}`), 'the avatar preview appears after opt-in');
  assert.match(visible.text, new RegExp(`data-node="${ids.aria}"\\s+data-neighbor-count="2"`),
    'Aria must include the newly visible NSFW neighbor after opt-in');
});
