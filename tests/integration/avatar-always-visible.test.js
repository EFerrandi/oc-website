import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

const tile = (html, name) => html.match(new RegExp(`<li class="card character-tile">(?:(?!</li>)[\\s\\S])*?${name}[\\s\\S]*?</li>`))[0];

test('an NSFW designated avatar is shown in the gallery with NSFW off, same as on', async (t) => {
  const { app, ids } = setup(t);

  const off = tile((await request(app).get('/')).text, 'Shadow');
  const on = tile((await request(app).get('/').set('Cookie', NSFW_ON)).text, 'Shadow');

  assert.ok(off.includes(`/media/${ids.imageNsfwShadow}`));
  assert.ok(!off.includes('placeholder-avatar.svg'));
  assert.equal(off.match(/<img[^>]*>/)[0].replace(/alt="[^"]*"/, ''), on.match(/<img[^>]*>/)[0].replace(/alt="[^"]*"/, ''));
});

test('the avatar alt text never carries NSFW wording when NSFW is off', async (t) => {
  const { app } = setup(t);
  const html = (await request(app).get('/')).text;
  assert.ok(!html.includes('Shadow, explicit pose'));
  assert.match(tile(html, 'Shadow'), /alt="Shadow"/);
});

test('without a designated avatar the oldest image is used whatever its rating', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('UPDATE character SET avatar_image_id = NULL WHERE id = ?').run(ids.shadow);

  const html = (await request(app).get('/')).text;
  assert.ok(tile(html, 'Shadow').includes(`/media/${ids.imageNsfwShadow}`));
});

test('the placeholder is used only when a character has no usable image', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('DELETE FROM character_image WHERE character_id = ?').run(ids.shadow);
  db.prepare('UPDATE character SET avatar_image_id = NULL WHERE id = ?').run(ids.shadow);

  assert.ok(tile((await request(app).get('/')).text, 'Shadow').includes('placeholder-avatar.svg'));
});
