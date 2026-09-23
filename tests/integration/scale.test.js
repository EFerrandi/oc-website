import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { transaction } from '../../src/db/index.js';
import { nowIso } from '../../src/lib/dates.js';

const CHARACTERS = 100;
const IMAGES = 1000;

/**
 * SC-003 and SC-004 are about the site staying usable once it holds a real
 * collection, not a handful of fixtures. Timings on CI hardware are noisy, so
 * the budgets below are deliberately generous — they are there to catch an
 * accidental N+1 query or a missing index, which cost orders of magnitude,
 * not a few milliseconds.
 */
function seedAtScale(db) {
  // One transaction: a thousand individual commits would dominate the very
  // timings this test exists to measure.
  return transaction(db, () => seedRows(db));
}

function seedRows(db) {
  const at = nowIso();
  const insert = (sql, ...params) => Number(db.prepare(sql).run(...params).lastInsertRowid);

  const genders = ['Female', 'Male', 'Nonbinary'].map(
    (name) => insert('INSERT INTO gender (name, created_at) VALUES (?, ?)', name, at),
  );

  const designer = insert(
    'INSERT INTO designer (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'Bulk Designer', 'https://example.com/d', at, at,
  );

  const artists = Array.from({ length: 20 }, (unused, i) => insert(
    'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    `Artist ${i}`, 'https://example.com/a', at, at,
  ));

  const tags = Array.from({ length: 30 }, (unused, i) => insert(
    'INSERT INTO tag (name, created_at) VALUES (?, ?)', `tag-${i}`, at,
  ));

  const images = Array.from({ length: IMAGES }, (unused, i) => insert(`
    INSERT INTO image
      (file_name, preview_file_name, mime_type, byte_size, width, height,
       alt_text, artist_id, is_nsfw, created_at, updated_at)
    VALUES (?, ?, 'image/png', 1024, 100, 100, ?, ?, ?, ?, ?)
  `, `bulk-${i}.png`, `bulk-${i}.webp`, `Bulk image ${i}`, artists[i % artists.length], i % 4 === 0 ? 1 : 0, at, at));

  for (let i = 0; i < CHARACTERS; i += 1) {
    // Every character's first image is SFW, so none fall back to a placeholder.
    const own = images[(i * 7) % IMAGES];
    const sfwOwn = i % 4 === 0 ? images[1] : own;

    const id = insert(`
      INSERT INTO character
        (name, slug, gender_id, short_description, terms_of_use,
         can_regift, can_retrade, can_resell, designer_id, avatar_image_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?, ?)
    `, `Character ${i}`, `character-${i}`, genders[i % genders.length],
    `Description ${i}`, 'Ask first.', designer, sfwOwn, at, at);

    db.prepare('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)')
      .run(id, `Job ${i % 12}`);

    // Two tags each, so AND-filtering has something real to do.
    db.prepare('INSERT INTO character_tag VALUES (?, ?)').run(id, tags[i % tags.length]);
    db.prepare('INSERT OR IGNORE INTO character_tag VALUES (?, ?)').run(id, tags[(i + 1) % tags.length]);

    db.prepare('INSERT OR IGNORE INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)')
      .run(id, sfwOwn);

    // Spread the remaining images across characters.
    for (let k = 1; k <= 9; k += 1) {
      db.prepare('INSERT OR IGNORE INTO character_image (character_id, image_id, position) VALUES (?, ?, ?)')
        .run(id, images[(i * 10 + k) % IMAGES], k);
    }
  }

  return { tags };
}

async function timed(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  return { result, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

test('the gallery, filters and detail pages stay fast with 100 characters and 1,000 images', async (t) => {
  const ctx = createTestApp();
  t.after(() => ctx.cleanup());

  const { tags } = seedAtScale(ctx.db);

  assert.equal(ctx.db.prepare('SELECT COUNT(*) n FROM character').get().n, CHARACTERS);
  assert.equal(ctx.db.prepare('SELECT COUNT(*) n FROM image').get().n, IMAGES);

  const budgetMs = 3000;

  const gallery = await timed(() => request(ctx.app).get('/'));
  assert.equal(gallery.result.status, 200);
  assert.ok(gallery.ms < budgetMs, `gallery took ${gallery.ms.toFixed(0)}ms (budget ${budgetMs}ms)`);

  const filtered = await timed(() => request(ctx.app).get(`/?tag=tag-0&tag=tag-1`));
  assert.equal(filtered.result.status, 200);
  assert.ok(filtered.ms < budgetMs, `filtering took ${filtered.ms.toFixed(0)}ms (budget ${budgetMs}ms)`);

  const detail = await timed(() => request(ctx.app).get('/characters/character-7'));
  assert.equal(detail.result.status, 200);
  assert.ok(detail.ms < budgetMs, `detail took ${detail.ms.toFixed(0)}ms (budget ${budgetMs}ms)`);

  const artists = await timed(() => request(ctx.app).get('/artists').set('Cookie', NSFW_ON));
  assert.equal(artists.result.status, 200);
  assert.ok(artists.ms < budgetMs, `artists took ${artists.ms.toFixed(0)}ms (budget ${budgetMs}ms)`);

  assert.ok(tags.length > 0);
});

test('filtering narrows results rather than merely reordering them', async (t) => {
  const ctx = createTestApp();
  t.after(() => ctx.cleanup());

  seedAtScale(ctx.db);

  const all = await request(ctx.app).get('/');
  const one = await request(ctx.app).get('/?tag=tag-0');
  const two = await request(ctx.app).get('/?tag=tag-0&tag=tag-1');

  const count = (body) => (body.match(/class="card"/g) ?? []).length;

  assert.ok(count(all.text) > count(one.text), 'one tag narrows the list');
  assert.ok(
    count(two.text) <= count(one.text),
    'adding a second tag narrows further — filters combine with AND, not OR',
  );
  assert.ok(count(two.text) > 0, 'the AND combination still matches something');
});

test('opting in adds content rather than replacing it', async (t) => {
  const ctx = createTestApp();
  t.after(() => ctx.cleanup());

  seedAtScale(ctx.db);

  const closed = await request(ctx.app).get('/characters/character-3');
  const open = await request(ctx.app).get('/characters/character-3').set('Cookie', NSFW_ON);

  const previews = (body) => (body.match(/\/media\/\d+/g) ?? []).length;

  assert.ok(
    previews(open.text) > previews(closed.text),
    'a visitor who opts in sees strictly more images, never fewer',
  );
});
