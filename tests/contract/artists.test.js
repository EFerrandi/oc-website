import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function withApp(t) {
  const ctx = createTestApp();
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return ctx;
}

test('Artists lists design-only artists and groups each canonical artist once', async (t) => {
  const { app } = withApp(t);
  const response = await request(app).get('/artists');

  assert.equal(response.status, 200);
  for (const artist of ['Dara Designs', 'Anon Designer', 'Aster Art', 'Brin Brush']) {
    const matches = [...response.text.matchAll(new RegExp(`>${artist}<`, 'g'))];
    assert.equal(matches.length, 1, `${artist} has one canonical artist section`);
  }
  assert.match(response.text, /Anon Designer[\s\S]*?0 images/);
  assert.ok(!response.text.includes('Aria, explicit pose'), 'NSFW artwork is hidden before opt-in');
});

test('artist artwork follows the NSFW preference', async (t) => {
  const { app } = withApp(t);
  const response = await request(app).get('/artists').set('Cookie', NSFW_ON);

  assert.equal(response.status, 200);
  assert.ok(response.text.includes('Aria, explicit pose'));
  assert.ok(response.text.includes('Shadow, explicit pose'));
});
