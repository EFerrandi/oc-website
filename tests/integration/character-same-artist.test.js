import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import sharp from 'sharp';

import { csrfFrom, withAdminApp } from '../helpers/media.js';

const png = () => sharp({
  create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 120, b: 200 } },
}).png().toBuffer();

async function postNew({ agent, ids }, fields) {
  const token = await csrfFrom(agent, '/admin/characters/new');
  const req = agent.post('/admin/characters').field('_csrf', token);
  const base = {
    name: 'Nova', gender_id: String(ids.genderFemale), short_description: 'A star.',
    job_title: 'Navigator', terms_of_use: 'Ask first.', can_regift: '1', can_retrade: '0',
    can_resell: '0', tag_id: String(ids.tagCute), image_alt_text: 'Nova in orbit',
    ...fields,
  };
  for (const [k, v] of Object.entries(base)) req.field(k, v);
  return req.attach('image', await png(), 'nova.png');
}

const artists = (db) => db.prepare('SELECT COUNT(*) n FROM artist').get().n;
const uploads = (config) => (fs.existsSync(config.uploadDir) ? fs.readdirSync(config.uploadDir, { recursive: true }).length : 0);
const novaImageArtist = (db) => db.prepare(`
  SELECT i.artist_id AS imageArtist, c.artist_id AS designer
  FROM character c JOIN character_image ci ON ci.character_id = c.id JOIN image i ON i.id = ci.image_id
  WHERE c.name = 'Nova'`).get();

test('form shows the unchecked option and no HTML required on the image artist', async (t) => {
  const ctx = await withAdminApp(t);
  const html = (await ctx.agent.get('/admin/characters/new')).text;
  assert.match(html, /<input type="checkbox" name="image_artist_same_as_designer" value="1"\s*>/);
  assert.match(html, /<select id="image_artist_id" name="image_artist_id">/);
});

test('ticked with an existing designer uses the designer as image artist', async (t) => {
  const ctx = await withAdminApp(t);
  const res = await postNew(ctx, { artist_id: String(ctx.ids.designer), image_artist_same_as_designer: '1' });
  assert.equal(res.status, 303, res.text.slice(0, 300));
  const row = novaImageArtist(ctx.db);
  assert.equal(row.imageArtist, ctx.ids.designer);
});

test('ticked with a new designer creates exactly one artist', async (t) => {
  const ctx = await withAdminApp(t);
  const before = artists(ctx.db);
  const res = await postNew(ctx, {
    artist_id: 'new', new_designer_name: 'Zed Both', image_artist_same_as_designer: '1',
  });
  assert.equal(res.status, 303, res.text.slice(0, 300));
  assert.equal(artists(ctx.db), before + 1);
  const row = novaImageArtist(ctx.db);
  assert.equal(row.imageArtist, row.designer);
});

test('ticked ignores a conflicting image artist', async (t) => {
  const ctx = await withAdminApp(t);
  const before = artists(ctx.db);
  const res = await postNew(ctx, {
    artist_id: String(ctx.ids.designer), image_artist_same_as_designer: '1',
    image_artist_id: 'new', new_image_artist_name: 'Ignored Person',
  });
  assert.equal(res.status, 303);
  assert.equal(artists(ctx.db), before);
  assert.equal(novaImageArtist(ctx.db).imageArtist, ctx.ids.designer);
});

test('unticked without an image artist is still rejected', async (t) => {
  const ctx = await withAdminApp(t);
  const res = await postNew(ctx, { artist_id: String(ctx.ids.designer) });
  assert.equal(res.status, 422);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) n FROM character WHERE name = 'Nova'").get().n, 0);
});

test('ticked without a designer is rejected, saves nothing and keeps the box ticked', async (t) => {
  const ctx = await withAdminApp(t);
  const before = { artists: artists(ctx.db), files: uploads(ctx.config) };
  const res = await postNew(ctx, { image_artist_same_as_designer: '1' });
  assert.equal(res.status, 422);
  assert.match(res.text, /name="image_artist_same_as_designer" value="1"\s+checked/);
  assert.equal(artists(ctx.db), before.artists);
  assert.equal(uploads(ctx.config), before.files);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) n FROM character WHERE name = 'Nova'").get().n, 0);
});
