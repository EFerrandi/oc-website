import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function withApp(t) {
  const ctx = createTestApp();
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return ctx;
}

test('GET /characters/:slug renders every required section', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/characters/aria');

  assert.equal(res.status, 200);
  assert.ok(res.text.includes('Aria'), 'name');
  assert.ok(res.text.includes('Female'), 'gender');
  assert.ok(res.text.includes('Aria short description'), 'short description');
  assert.ok(res.text.includes('Cartographer'), 'job titles');
  assert.ok(res.text.includes('cute'), 'tags');
  assert.ok(res.text.includes('Virtues'), 'virtues heading');
  assert.ok(res.text.includes('Patience'), 'virtue value');
  assert.ok(res.text.includes('Do not resell without permission.'), 'terms of use');
  assert.ok(res.text.includes('Dara Designs'), 'designer credit');
});

test('permissions render explicitly as allowed or not allowed', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/characters/aria');

  assert.ok(res.text.includes('Can be regifted'), 'regift permission labelled');
  assert.ok(res.text.includes('Can be retraded'), 'retrade permission labelled');
  assert.ok(res.text.includes('Can be resold'), 'resell permission labelled');
  assert.ok(res.text.includes('Allowed'), 'an allowed value renders as a word, not a blank');
  assert.ok(res.text.includes('Not allowed'), 'a denied value renders as a word, not a blank');
});

test('a character with only virtues shows just that heading', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/characters/aria');

  assert.ok(res.text.includes('Virtues'), 'populated heading shown');
  assert.ok(!res.text.includes('<h3>Sins</h3>'), 'empty heading omitted');
});

test('designer with a website links out in a new tab; one without renders as text', async (t) => {
  const { app } = withApp(t);

  const withSite = await request(app).get('/characters/aria');
  assert.match(
    withSite.text,
    /<a href="https:\/\/dara\.example\/" target="_blank" rel="noopener noreferrer">Dara Designs<\/a>/,
  );

  const withoutSite = await request(app).get('/characters/brann');
  assert.ok(withoutSite.text.includes('Anon Designer'), 'name still shown');
  assert.ok(
    !withoutSite.text.includes('>Anon Designer</a>'),
    'a designer with no URL must not be rendered as a link',
  );
});

test('every rendered image carries a non-empty alt attribute', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/characters/aria');

  const imgTags = res.text.match(/<img[^>]*>/g) ?? [];
  assert.ok(imgTags.length > 0, 'page renders at least one image');

  for (const tag of imgTags) {
    const alt = tag.match(/alt="([^"]*)"/);
    assert.ok(alt, `image tag missing alt attribute: ${tag}`);
    assert.ok(alt[1].trim().length > 0, `image tag has empty alt: ${tag}`);
  }
});

test('the detail page stays reachable when all media is hidden by the rating', async (t) => {
  const { app } = withApp(t);

  // Shadow's only image is NSFW and it has no SFW stories.
  const res = await request(app).get('/characters/shadow');
  assert.equal(res.status, 200, 'page must not 404 merely because its media is hidden (FR-052)');
  assert.ok(res.text.includes('Shadow short description'), 'non-media information still renders');
  assert.ok(res.text.includes('No images to show'), 'explicit empty state for the hidden section');
});

test('GET /characters/:slug returns 404 for an unknown slug', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/characters/does-not-exist');
  assert.equal(res.status, 404);
});
