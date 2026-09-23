import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures, NSFW_MARKERS } from '../helpers/fixtures.js';

/**
 * Shadow's only image is NSFW. She must still be browsable by a visitor who
 * has not opted in — hiding the character entirely would be a different
 * product, and a missing card is indistinguishable from a bug.
 */
function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

test('a character whose only images are NSFW still appears, with a placeholder', async (t) => {
  const { app } = setup(t);

  const res = await request(app).get('/');
  assert.equal(res.status, 200);

  assert.ok(res.text.includes('Shadow'), 'the character is still listed');
  assert.ok(res.text.includes('placeholder-avatar.svg'), 'a placeholder stands in for the avatar');

  // The placeholder must not be a bare decorative image.
  assert.match(res.text, /placeholder-avatar\.svg" alt="[^"]+"/, 'the placeholder carries alt text');
});

test('the placeholder is replaced by the real avatar once opted in', async (t) => {
  const { app, ids } = setup(t);

  const res = await request(app).get('/').set('Cookie', NSFW_ON);
  assert.equal(res.status, 200);

  assert.ok(
    res.text.includes(`/media/${ids.imageNsfwShadow}`),
    'the real avatar is shown to a visitor who opted in',
  );
});

test('the detail page of an NSFW-only character leaks nothing', async (t) => {
  const { app, ids } = setup(t);

  const res = await request(app).get('/characters/shadow');
  assert.equal(res.status, 200, 'the character page itself is public');

  assert.ok(res.text.includes('Shadow'), 'the name is shown');
  assert.ok(
    res.text.includes('No images to show at the current content setting.'),
    'an explicit empty state explains the absence rather than showing a broken gap',
  );

  assert.ok(
    !res.text.includes(`/media/${ids.imageNsfwShadow}`),
    'no NSFW media URL appears in the markup',
  );

  for (const marker of NSFW_MARKERS) {
    assert.ok(
      !res.text.includes(marker),
      `the NSFW marker "${marker}" must not appear before opting in`,
    );
  }
});

test('the placeholder image itself is a real, servable asset', async (t) => {
  const { app } = setup(t);

  const res = await request(app).get('/img/placeholder-avatar.svg');
  assert.equal(res.status, 200, 'the placeholder must not be a broken image');
  assert.match(res.headers['content-type'], /svg/);
});

test('an NSFW-only character is not silently dropped from filter results', async (t) => {
  const { app } = setup(t);

  // Shadow carries the "cute" tag alongside Aria.
  const res = await request(app).get('/?tag=cute');
  assert.equal(res.status, 200);

  assert.ok(res.text.includes('Aria'), 'the SFW match is listed');
  assert.ok(res.text.includes('Shadow'), 'the NSFW-only match is still listed, with a placeholder');
});
