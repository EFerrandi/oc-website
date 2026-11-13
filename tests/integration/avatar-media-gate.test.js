import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures, NSFW_MARKERS } from '../helpers/fixtures.js';

function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  for (const name of ['imageNsfwShadow-preview.png', 'imageNsfwShadow.png', 'imageNsfwA-preview.png', 'imageNsfwA.png']) {
    fs.writeFileSync(path.join(name.includes('preview') ? ctx.config.previewDir : ctx.config.uploadDir, name), 'x');
  }
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

test('the preview of a current NSFW avatar is served with NSFW off, never cached publicly', async (t) => {
  const { app, ids } = setup(t);
  const res = await request(app).get(`/media/${ids.imageNsfwShadow}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers['cache-control'], 'private, no-store');
});

test('the full-size variant of an NSFW avatar is still hidden', async (t) => {
  const { app, ids } = setup(t);
  assert.equal((await request(app).get(`/media/${ids.imageNsfwShadow}/full`)).status, 404);
});

test('an NSFW image that is nobody\'s avatar stays hidden', async (t) => {
  const { app, ids } = setup(t);
  assert.equal((await request(app).get(`/media/${ids.imageNsfwA}`)).status, 404);
});

test('an image that stops being an avatar is hidden again', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('UPDATE character SET avatar_image_id = NULL WHERE id = ?').run(ids.shadow);
  db.prepare('DELETE FROM character_image WHERE image_id = ?').run(ids.imageNsfwShadow);
  assert.equal((await request(app).get(`/media/${ids.imageNsfwShadow}`)).status, 404);
});

test('an NSFW fallback image counts as the avatar when none is designated', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('UPDATE character SET avatar_image_id = NULL WHERE id = ?').run(ids.shadow);
  assert.equal((await request(app).get(`/media/${ids.imageNsfwShadow}`)).status, 200);
});

test('NSFW on still serves everything', async (t) => {
  const { app, ids } = setup(t);
  assert.equal((await request(app).get(`/media/${ids.imageNsfwA}`).set('Cookie', NSFW_ON)).status, 200);
});

test('the character page header shows the avatar but leaks no other NSFW content', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('UPDATE character SET avatar_image_id = ? WHERE id = ?').run(ids.imageNsfwA, ids.aria);

  const html = (await request(app).get('/characters/aria')).text;
  assert.ok(html.includes(`/media/${ids.imageNsfwA}`), 'avatar in the header');
  for (const marker of NSFW_MARKERS) assert.ok(!html.includes(marker), marker);
});

test('relationships and stories stay hidden with NSFW off', async (t) => {
  const { app } = setup(t);
  const html = (await request(app).get('/relationships')).text;
  assert.ok(!html.includes('lovers'));
  assert.ok(!(await request(app).get('/characters/aria')).text.includes('After Hours'));
});
