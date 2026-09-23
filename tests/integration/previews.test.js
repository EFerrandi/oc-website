import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import request from 'supertest';
import sharp from 'sharp';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

async function withMedia(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());

  fs.mkdirSync(ctx.config.uploadDir, { recursive: true });
  fs.mkdirSync(ctx.config.previewDir, { recursive: true });

  const original = await sharp({
    create: { width: 2000, height: 1400, channels: 3, background: { r: 30, g: 30, b: 30 } },
  }).png().toBuffer();
  const preview = await sharp(original).resize({ width: 800 }).webp().toBuffer();

  for (const row of ctx.db.prepare('SELECT file_name AS f, preview_file_name AS p FROM image').all()) {
    fs.writeFileSync(path.join(ctx.config.uploadDir, row.f), original);
    fs.writeFileSync(path.join(ctx.config.previewDir, row.p), preview);
  }

  return { ...ctx, ids };
}

/**
 * The whole point of previews is that page weight does not grow with the size
 * of the originals. A single stray /media/:id/full in a listing page defeats
 * that, so this is asserted on every page that shows more than one image.
 */
test('no listing page ever requests a full-size original', async (t) => {
  const { app, ids } = await withMedia(t);

  const pages = ['/', '/?tag=cute', '/artists', '/characters/aria', '/relationships'];

  for (const page of pages) {
    for (const cookie of [null, NSFW_ON]) {
      const req = request(app).get(page);
      if (cookie) req.set('Cookie', cookie);
      const res = await req;

      assert.equal(res.status, 200, `${page} renders`);
      assert.ok(
        !/\/media\/\d+\/full/.test(res.text),
        `${page} must not embed a full-size original`,
      );
    }
  }

  // The standalone page is the one place the original is allowed.
  const standalone = await request(app).get(`/images/${ids.imageSfwA}`);
  assert.match(standalone.text, /\/media\/\d+\/full/, 'the standalone view does show the original');
});

test('every preview is a real link that works without JavaScript', async (t) => {
  const { app } = await withMedia(t);

  const res = await request(app).get('/characters/aria');
  const anchors = res.text.match(/<a[^>]*class="[^"]*preview-link[^"]*"[^>]*>/g) ?? [];

  assert.ok(anchors.length > 0, 'the character page renders preview links');

  for (const anchor of anchors) {
    const href = anchor.match(/href="([^"]+)"/);
    assert.ok(href, `preview anchor must have an href: ${anchor}`);
    assert.match(href[1], /^\/images\/\d+$/, 'the href is a real page, not "#" or javascript:');
  }
});

test('every rendered image carries non-empty alt text', async (t) => {
  const { app } = await withMedia(t);

  for (const page of ['/', '/artists', '/characters/aria']) {
    const res = await request(app).get(page).set('Cookie', NSFW_ON);
    const images = res.text.match(/<img[^>]*>/g) ?? [];

    assert.ok(images.length > 0, `${page} renders at least one image`);

    for (const img of images) {
      const alt = img.match(/\salt="([^"]*)"/);
      assert.ok(alt, `image on ${page} is missing an alt attribute: ${img}`);
      assert.ok(alt[1].trim().length > 0, `image on ${page} has empty alt text: ${img}`);
    }
  }
});

test('the standalone image page is reachable and rating-gated like everything else', async (t) => {
  const { app, ids } = await withMedia(t);

  assert.equal((await request(app).get(`/images/${ids.imageSfwA}`)).status, 200);
  assert.equal(
    (await request(app).get(`/images/${ids.imageNsfwA}`)).status, 404,
    'an NSFW image page is a 404, never a 403 — the two must be indistinguishable',
  );
  assert.equal(
    (await request(app).get(`/images/${ids.imageNsfwA}`).set('Cookie', NSFW_ON)).status, 200,
  );
  assert.equal((await request(app).get('/images/999999')).status, 404);
});

test('the lightbox is an enhancement, never a requirement', async (t) => {
  const { app } = await withMedia(t);

  const script = await request(app).get('/js/lightbox.js');
  assert.equal(script.status, 200);

  const source = script.text;

  // Keyboard operability (SC-014): escape closes, focus is returned.
  assert.ok(source.includes("'Escape'"), 'Escape closes the overlay');
  assert.ok(source.includes('lastFocused'), 'focus is returned to the opening preview');
  assert.ok(source.includes("'Tab'"), 'Tab is kept inside the dialog');
  assert.ok(source.includes("setAttribute('role', 'dialog')"), 'the overlay is announced as a dialog');
  assert.ok(source.includes("'aria-modal'"), 'the overlay is modal to assistive technology');

  // Modified clicks must stay native, or "open in new tab" silently breaks.
  assert.ok(source.includes('metaKey') && source.includes('ctrlKey'), 'modified clicks stay native');

  // The page must not depend on the script being loaded.
  const page = await request(app).get('/characters/aria');
  assert.ok(
    !/<noscript/.test(page.text),
    'no noscript fallback is needed, because the markup already works without JS',
  );
  assert.match(page.text, /<script[^>]+lightbox\.js"[^>]*defer/, 'the script is deferred, not blocking');
});

test('preview and original differ in bytes, not just in URL', async (t) => {
  const { app, ids } = await withMedia(t);

  const preview = await request(app).get(`/media/${ids.imageSfwA}`);
  const full = await request(app).get(`/media/${ids.imageSfwA}/full`);

  assert.equal(preview.status, 200);
  assert.equal(full.status, 200);
  assert.ok(
    preview.body.length * 2 < full.body.length,
    `the preview should be substantially smaller (${preview.body.length} vs ${full.body.length})`,
  );
});
