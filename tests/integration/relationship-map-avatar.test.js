import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

const sfw = (html) => html.slice(html.indexOf('data-map-region="sfw"'), html.indexOf('data-map-region="nsfw"'));

function nodeMarkup(html, id) {
  return html.match(new RegExp(`<a class="map-node"[^>]*data-node="${id}"[\\s\\S]*?</a>`))[0];
}

test('the map shows the designated avatar, not the first image', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 2)')
    .run(ids.brann, ids.imageSfwA);
  db.prepare('UPDATE character SET avatar_image_id = ? WHERE id = ?').run(ids.imageSfwA, ids.brann);

  const node = nodeMarkup(sfw((await request(app).get('/relationships')).text), ids.brann);
  assert.ok(node.includes(`/media/${ids.imageSfwA}"`));
  assert.ok(!node.includes(`/media/${ids.imageSfwB}"`));
});

test('the saved avatar crop is applied to the map avatar', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('UPDATE character SET avatar_crop_x = 20, avatar_crop_y = 80, avatar_crop_zoom = 2 WHERE id = ?')
    .run(ids.aria);

  const node = nodeMarkup(sfw((await request(app).get('/relationships')).text), ids.aria);
  assert.match(node, /data-crop-zoom="2"/);
  const image = node.match(/<image[^>]*>/)[0];
  const radius = Number(node.match(/class="map-node-face"[^>]*r="([\d.]+)"/)[1]);
  const width = Number(image.match(/ width="([\d.-]+)"/)[1]);
  assert.equal(width, radius * 4, 'zoom doubles the image dimensions for the avatar radius');
  const x = Number(image.match(/ x="([\d.-]+)"/)[1]);
  assert.ok(x > -2 * radius, 'a left-weighted crop shifts the image right of the default');
});

test('an uncropped avatar keeps the default geometry', async (t) => {
  const { app, ids } = setup(t);
  const node = nodeMarkup(sfw((await request(app).get('/relationships')).text), ids.aria);
  const image = node.match(/<image[^>]*>/)[0];
  const radius = Number(node.match(/class="map-node-face"[^>]*r="([\d.]+)"/)[1]);
  assert.equal(Number(image.match(/ x="([\d.-]+)"/)[1]), -radius);
  assert.equal(Number(image.match(/ width="([\d.-]+)"/)[1]), 2 * radius);
});

test('an NSFW avatar is shown on the map before opt-in, with neutral alt text', async (t) => {
  const { app, db, ids } = setup(t);
  db.prepare('UPDATE character SET avatar_image_id = ? WHERE id = ?').run(ids.imageNsfwA, ids.aria);

  const html = (await request(app).get('/relationships')).text;
  assert.ok(nodeMarkup(sfw(html), ids.aria).includes(`/media/${ids.imageNsfwA}"`));
  assert.ok(!html.includes('Aria, explicit pose'));
});
