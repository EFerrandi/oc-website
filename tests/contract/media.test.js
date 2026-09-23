import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import request from 'supertest';
import sharp from 'sharp';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

/**
 * Write real files for the fixture image rows, so these tests exercise the
 * actual file-serving path rather than only the missing-file branch.
 */
async function withMedia(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);

  fs.mkdirSync(ctx.config.uploadDir, { recursive: true });
  fs.mkdirSync(ctx.config.previewDir, { recursive: true });

  const original = await sharp({
    create: { width: 1600, height: 1600, channels: 3, background: { r: 10, g: 120, b: 90 } },
  }).png().toBuffer();

  const preview = await sharp(original).resize({ width: 800 }).webp().toBuffer();

  for (const row of ctx.db.prepare('SELECT file_name AS f, preview_file_name AS p FROM image').all()) {
    fs.writeFileSync(path.join(ctx.config.uploadDir, row.f), original);
    fs.writeFileSync(path.join(ctx.config.previewDir, row.p), preview);
  }

  t.after(() => ctx.cleanup());
  return { ...ctx, ids, originalSize: original.length, previewSize: preview.length };
}

function sfwId(db) {
  return db.prepare("SELECT id FROM image WHERE file_name = 'imageSfwA.png'").get().id;
}

function nsfwId(db) {
  return db.prepare("SELECT id FROM image WHERE file_name = 'imageNsfwA.png'").get().id;
}

test('the full status matrix for /media/:id and /media/:id/full', async (t) => {
  const { app, db } = await withMedia(t);

  const sfw = sfwId(db);
  const nsfw = nsfwId(db);

  const cases = [
    { label: 'SFW, not opted in', id: sfw, cookie: null, expected: 200 },
    { label: 'SFW, opted in', id: sfw, cookie: 'nsfw=1', expected: 200 },
    { label: 'NSFW, opted in', id: nsfw, cookie: 'nsfw=1', expected: 200 },
    { label: 'NSFW, not opted in', id: nsfw, cookie: null, expected: 404 },
    { label: 'unknown id', id: 999_999, cookie: 'nsfw=1', expected: 404 },
  ];

  for (const { label, id, cookie, expected } of cases) {
    for (const suffix of ['', '/full']) {
      const req = request(app).get(`/media/${id}${suffix}`);
      if (cookie) req.set('Cookie', [cookie]);

      const res = await req;
      assert.equal(res.status, expected, `${label} on /media/${id}${suffix}`);
    }
  }
});

test('the preview is a genuinely smaller file than the original', async (t) => {
  const { app, db, originalSize, previewSize } = await withMedia(t);
  const id = sfwId(db);

  assert.ok(previewSize < originalSize, 'fixture sanity: preview must be smaller');

  const preview = await request(app).get(`/media/${id}`);
  const full = await request(app).get(`/media/${id}/full`);

  assert.equal(preview.status, 200);
  assert.equal(full.status, 200);
  assert.ok(
    preview.body.length < full.body.length,
    'the preview route must serve fewer bytes than the full route, '
    + 'so page weight does not depend on the original size',
  );
  assert.equal(preview.headers['content-type'], 'image/webp');
});

test('NSFW images are never cached by a shared cache', async (t) => {
  const { app, db } = await withMedia(t);

  const nsfw = await request(app).get(`/media/${nsfwId(db)}`).set('Cookie', ['nsfw=1']);
  assert.equal(nsfw.status, 200);
  assert.equal(nsfw.headers['cache-control'], 'private, no-store');

  const sfw = await request(app).get(`/media/${sfwId(db)}`);
  assert.ok(!/no-store/.test(sfw.headers['cache-control'] ?? ''), 'SFW images may be cached');
});

test('uploads are not reachable as static files', async (t) => {
  const { app } = await withMedia(t);

  for (const path of [
    '/uploads/imageSfwA.png',
    '/data/uploads/imageSfwA.png',
    '/imageSfwA.png',
  ]) {
    const res = await request(app).get(path);
    assert.equal(res.status, 404, `${path} must not be served statically`);
  }
});

test('gallery and detail pages reference only preview URLs', async (t) => {
  const { app } = await withMedia(t);

  for (const page of ['/', '/characters/aria', '/artists']) {
    const res = await request(app).get(page);
    assert.equal(res.status, 200);

    const fullRefs = res.text.match(/src="\/media\/\d+\/full"/g);
    assert.equal(
      fullRefs, null,
      `${page} must not embed full-size originals; page weight must not depend on original size`,
    );
  }
});

test('a preview anchor points at a real page that works without JavaScript', async (t) => {
  const { app, db } = await withMedia(t);
  const id = sfwId(db);

  const detail = await request(app).get('/characters/aria');
  assert.ok(detail.text.includes(`href="/images/${id}"`), 'preview must be a real link');

  const standalone = await request(app).get(`/images/${id}`);
  assert.equal(standalone.status, 200);
  assert.ok(standalone.text.includes(`/media/${id}/full`), 'the standalone page shows the original');
  assert.ok(standalone.text.includes('Aster Art'), 'artist credit shown');
});

test('POST /preferences/nsfw sets a session cookie with no maxAge', async (t) => {
  const { app } = await withMedia(t);
  const agent = request.agent(app);

  const page = await agent.get('/');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

  const on = await agent.post('/preferences/nsfw').type('form')
    .send({ _csrf: token, nsfw: '1', returnTo: '/' });

  assert.equal(on.status, 303);

  const setCookie = on.headers['set-cookie'].find((c) => c.startsWith('nsfw='));
  assert.ok(setCookie, 'nsfw cookie set');
  assert.ok(setCookie.includes('nsfw=1'), 'value is exactly 1');
  assert.ok(!/Max-Age|Expires/i.test(setCookie), 'no maxAge — it must clear when the browser closes');
  assert.ok(/SameSite=Lax/i.test(setCookie), 'sameSite=lax');

  // Unticking clears it.
  const off = await agent.post('/preferences/nsfw').type('form')
    .send({ _csrf: token, returnTo: '/' });

  assert.equal(off.status, 303);
  const cleared = off.headers['set-cookie'].find((c) => c.startsWith('nsfw='));
  assert.ok(/Expires=Thu, 01 Jan 1970|Max-Age=0/i.test(cleared), 'cookie cleared');
});

test('the toggle cannot be used as an open redirect', async (t) => {
  const { app } = await withMedia(t);
  const agent = request.agent(app);

  const page = await agent.get('/');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

  for (const evil of ['https://evil.example/', '//evil.example/', 'javascript:alert(1)']) {
    const res = await agent.post('/preferences/nsfw').type('form')
      .send({ _csrf: token, nsfw: '1', returnTo: evil });

    assert.equal(res.headers.location, '/', `must not redirect to ${evil}`);
  }
});
