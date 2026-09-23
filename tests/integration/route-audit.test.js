import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures, NSFW_MARKERS } from '../helpers/fixtures.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicRoutesDir = path.resolve(here, '../../src/routes/public');

function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());

  // Real bytes on disk, so a 404 can only come from the rating gate rather
  // than from a missing file — otherwise this audit would pass vacuously.
  fs.mkdirSync(ctx.config.uploadDir, { recursive: true });
  fs.mkdirSync(ctx.config.previewDir, { recursive: true });

  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  for (const row of ctx.db.prepare('SELECT file_name AS f, preview_file_name AS p FROM image').all()) {
    fs.writeFileSync(path.join(ctx.config.uploadDir, row.f), bytes);
    fs.writeFileSync(path.join(ctx.config.previewDir, row.p), bytes);
  }

  return { ...ctx, ids };
}

/**
 * Constitution Principle I has to be re-verified whenever a route serving
 * stored content is added. A hand-kept list would drift, so the list is
 * derived from the source: every public GET route is discovered and then
 * driven with and without the opt-in.
 */
function discoverPublicGetRoutes() {
  const found = [];

  for (const file of fs.readdirSync(publicRoutesDir)) {
    if (!file.endsWith('.js')) continue;

    const source = fs.readFileSync(path.join(publicRoutesDir, file), 'utf8');
    for (const match of source.matchAll(/router\.get\(\s*'([^']+)'/g)) {
      found.push({ file, pattern: match[1] });
    }
  }

  return found;
}

test('the set of public GET routes is exactly what this audit covers', () => {
  const discovered = discoverPublicGetRoutes().map((r) => r.pattern).sort();

  const audited = [
    '/',
    '/artists',
    '/characters/:slug',
    '/images/:imageId',
    '/media/:imageId',
    '/media/:imageId/full',
    '/relationships',
    '/stories/:slug',
  ].sort();

  assert.deepEqual(
    discovered, audited,
    'a public route was added or renamed — extend this audit before shipping it (Constitution I)',
  );
});

test('no public page leaks an NSFW marker before opt-in', async (t) => {
  const { app } = setup(t);

  const pages = [
    '/',
    '/?tag=cute',
    '/?tag=cute&tag=feral',
    '/?gender=Female',
    '/artists',
    '/relationships',
    '/characters/aria',
    '/characters/brann',
    '/characters/shadow',
  ];

  for (const page of pages) {
    const res = await request(app).get(page);
    assert.equal(res.status, 200, `${page} renders`);

    for (const marker of NSFW_MARKERS) {
      assert.ok(
        !res.text.includes(marker),
        `${page} leaked the NSFW marker "${marker}" to a visitor who has not opted in`,
      );
    }
  }
});

test('every NSFW resource is a 404 before opt-in and a 200 after', async (t) => {
  const { app, ids } = setup(t);

  const resources = [
    `/media/${ids.imageNsfwA}`,
    `/media/${ids.imageNsfwA}/full`,
    `/media/${ids.imageNsfwShadow}`,
    `/media/${ids.imageNsfwShadow}/full`,
    `/images/${ids.imageNsfwA}`,
    '/stories/after-hours',
  ];

  for (const resource of resources) {
    const closed = await request(app).get(resource);
    assert.equal(closed.status, 404, `${resource} must be 404 before opt-in, got ${closed.status}`);

    // 404, never 403: a 403 would confirm the resource exists.
    assert.ok(
      !closed.text.includes('Forbidden') && !closed.text.includes('403'),
      `${resource} must not hint that it exists`,
    );

    const open = await request(app).get(resource).set('Cookie', NSFW_ON);
    assert.equal(open.status, 200, `${resource} must be reachable after opt-in`);
  }
});

test('a missing resource and a hidden resource are indistinguishable', async (t) => {
  const { app, ids } = setup(t);

  const hidden = await request(app).get(`/images/${ids.imageNsfwA}`);
  const missing = await request(app).get('/images/999999');

  assert.equal(hidden.status, missing.status, 'same status');

  // Two values legitimately differ and reveal nothing: the per-session CSRF
  // token, and the return-to path, which merely echoes the URL the caller
  // already typed. Everything else must match byte for byte.
  const normalise = (body) => body
    .replace(/name="_csrf" value="[^"]*"/g, 'name="_csrf" value="TOKEN"')
    .replace(/name="returnTo" value="[^"]*"/g, 'name="returnTo" value="PATH"');

  assert.equal(
    normalise(hidden.text), normalise(missing.text),
    'the response body must be identical, or the difference itself is the leak',
  );
});

test('gating is driven by the cookie only, never by a header or query parameter', async (t) => {
  const { app, ids } = setup(t);

  const attempts = [
    ['query parameter', (r) => r.query({ nsfw: '1' })],
    ['X-NSFW header', (r) => r.set('X-NSFW', '1')],
    ['forged referer', (r) => r.set('Referer', 'https://example.com/?nsfw=1')],
    ['wrong cookie name', (r) => r.set('Cookie', ['nsfw_ok=1'])],
    ['near-miss cookie value', (r) => r.set('Cookie', ['nsfw=true'])],
    ['numeric near-miss', (r) => r.set('Cookie', ['nsfw=01'])],
    ['encoded near-miss', (r) => r.set('Cookie', ['nsfw=%31'])],
  ];

  for (const [label, apply] of attempts) {
    const res = await apply(request(app).get(`/media/${ids.imageNsfwA}`));
    assert.equal(res.status, 404, `${label} must not unlock NSFW content`);
  }
});

test('every content response varies on the cookie, so no shared cache can cross the line', async (t) => {
  const { app } = setup(t);

  for (const page of ['/', '/artists', '/relationships', '/characters/aria']) {
    const res = await request(app).get(page);
    assert.match(
      res.headers.vary ?? '', /Cookie/i,
      `${page} must declare Vary: Cookie`,
    );
  }
});
