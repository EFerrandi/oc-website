import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

const PASSWORD = 'correct-horse-battery-staple';

function withApp(t) {
  const ctx = createTestApp();
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return ctx;
}

async function adminApp(t) {
  const hash = await hashPassword(PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  const agent = request.agent(ctx.app);
  const login = await agent.get('/admin/login');
  const token = login.text.match(/name="_csrf" value="([^"]+)"/)[1];
  await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });
  return { ...ctx, agent };
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
  assert.ok(res.text.includes('Patience'), 'former sins and virtues render as tags');
  assert.ok(!res.text.includes('Ownership'), 'ownership details are hidden from visitors');
  assert.ok(!res.text.includes('Do not resell without permission.'), 'terms are hidden from visitors');
  assert.match(res.text, /class="[^"]*\bprofile-tags\b/, 'tags use the profile tag area');
  assert.ok(res.text.indexOf('profile-relationships') < res.text.indexOf('profile-stories'),
    'relationships precede stories');
});

test('only admins see ownership and permissions at the end of the profile', async (t) => {
  const { app, agent } = await adminApp(t);
  const res = await agent.get('/characters/aria');

  assert.ok(res.text.includes('Ownership'));
  assert.ok(res.text.includes('Do not resell without permission.'));
  assert.ok(res.text.includes('Can be regifted'), 'regift permission labelled');
  assert.ok(res.text.includes('Can be retraded'), 'retrade permission labelled');
  assert.ok(res.text.includes('Can be resold'), 'resell permission labelled');
  assert.ok(res.text.includes('Allowed'), 'an allowed value renders as a word, not a blank');
  assert.ok(res.text.includes('Not allowed'), 'a denied value renders as a word, not a blank');
  assert.ok(res.text.indexOf('profile-relationships') < res.text.indexOf('profile-stories'));
  assert.ok(res.text.indexOf('ownership-block') > res.text.indexOf('profile-stories'));
});

test('artist design credit links out in a new tab for admins', async (t) => {
  const { agent } = await adminApp(t);
  const withSite = await agent.get('/characters/aria');
  assert.match(
    withSite.text,
    /<a href="https:\/\/dara\.example\/" target="_blank" rel="noopener noreferrer">Dara Designs<\/a>/,
  );

  const withoutSite = await agent.get('/characters/brann');
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
