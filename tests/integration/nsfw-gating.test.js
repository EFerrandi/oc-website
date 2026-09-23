import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { NSFW_MARKERS, seedFixtures } from '../helpers/fixtures.js';

/**
 * Constitution Principle I — Content Rating Safety (NON-NEGOTIABLE).
 *
 * The safe state is the default: anything other than an explicit `nsfw=1`
 * cookie means NSFW content is hidden. Leaking NSFW content to a visitor who
 * did not opt in is an unrecoverable failure, so this suite is written first
 * and must fail before the gating middleware exists.
 */

const PUBLIC_PAGES = ['/', '/relationships', '/artists', '/characters/aria'];

function withApp(t) {
  const ctx = createTestApp();
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return ctx;
}

test('with no nsfw cookie, no public page exposes NSFW content', async (t) => {
  const { app } = withApp(t);

  for (const page of PUBLIC_PAGES) {
    const res = await request(app).get(page);
    assert.equal(res.status, 200, `${page} should render`);

    for (const marker of NSFW_MARKERS) {
      assert.ok(
        !res.text.includes(marker),
        `${page} leaked NSFW content ${JSON.stringify(marker)} with no cookie set`,
      );
    }
  }
});

test('with nsfw=1, NSFW content becomes visible', async (t) => {
  const { app } = withApp(t);

  const character = await request(app).get('/characters/aria').set('Cookie', ['nsfw=1']);
  assert.equal(character.status, 200);
  assert.ok(character.text.includes('After Hours'), 'NSFW story should appear once opted in');

  const relationships = await request(app).get('/relationships').set('Cookie', ['nsfw=1']);
  assert.equal(relationships.status, 200);
  assert.ok(relationships.text.includes('lovers'), 'NSFW relationship should appear once opted in');
});

test('absent, empty, or malformed cookie values all resolve to OFF', async (t) => {
  const { app } = withApp(t);

  // Anything that is not exactly "1" must be treated as off — including values
  // that merely look truthy.
  const unsafeValues = ['', '0', 'true', 'yes', 'on', '2', '1 ', ' 1', 'null', 'undefined', '01', '%31'];

  for (const value of unsafeValues) {
    // A trailing sentinel cookie keeps the value away from the end of the
    // header: HTTP strips trailing whitespace from header values in transit,
    // so a trailing space would otherwise never reach the parser at all.
    const res = await request(app)
      .get('/characters/aria')
      .set('Cookie', [`nsfw=${value}`, 'sentinel=x']);

    assert.equal(res.status, 200);

    for (const marker of NSFW_MARKERS) {
      assert.ok(
        !res.text.includes(marker),
        `cookie value ${JSON.stringify(value)} was treated as opt-in and leaked ${JSON.stringify(marker)}`,
      );
    }
  }
});

test('the exact value "1" opts in, even alongside other cookies', async (t) => {
  const { app } = withApp(t);

  const res = await request(app)
    .get('/characters/aria')
    .set('Cookie', ['sentinel=x', 'nsfw=1', 'other=y']);

  assert.equal(res.status, 200);
  assert.ok(res.text.includes('After Hours'), 'opt-in must still work when other cookies are present');
});

test('a character whose only image is NSFW still lists, using the placeholder avatar', async (t) => {
  const { app } = withApp(t);

  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.ok(res.text.includes('Shadow'), 'character must remain listed (FR-014)');
  assert.ok(
    res.text.includes('placeholder-avatar.svg'),
    'must fall back to the placeholder rather than the NSFW image',
  );
});

test('NSFW media is hidden with 404, never 403', async (t) => {
  const { app, db } = withApp(t);
  const nsfwId = db.prepare("SELECT id FROM image WHERE file_name = 'imageNsfwA.png'").get().id;

  for (const path of [`/media/${nsfwId}`, `/media/${nsfwId}/full`, `/images/${nsfwId}`]) {
    const res = await request(app).get(path);
    assert.equal(
      res.status, 404,
      `${path} must answer 404 — a 403 confirms the resource exists and leaks its existence`,
    );
  }
});
