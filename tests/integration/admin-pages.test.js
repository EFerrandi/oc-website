import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';
import { TAXONOMY_KINDS } from '../../src/services/taxonomy.js';

const ADMIN_PASSWORD = 'test-password';

function buildApp(t, hash) {
  const ctx = createTestApp({ adminPasswordHash: hash });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

async function signedInAgent(t) {
  const hash = await hashPassword(ADMIN_PASSWORD);
  const { app, db, ids } = buildApp(t, hash);

  const agent = request.agent(app);
  const page = await agent.get('/admin/login');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

  const res = await agent.post('/admin/login').type('form')
    .send({ _csrf: token, password: ADMIN_PASSWORD });

  assert.equal(res.status, 303, 'sign-in must succeed for this suite to mean anything');
  return { agent, ids, db };
}

/**
 * Every admin screen must actually render. Posting to a route exercises the
 * service layer but never proves the form that feeds it can be displayed, so
 * a broken template stays invisible until someone opens the page by hand.
 */
test('every admin page renders for a signed-in admin', async (t) => {
  const { agent, ids } = await signedInAgent(t);

  const characterId = ids.aria;
  const imageId = ids.imageSfwA;
  const storyId = ids.storySfw;

  const paths = [
    '/admin',
    '/admin/characters',
    '/admin/characters/new',
    `/admin/characters/${characterId}/edit`,
    '/admin/images',
    '/admin/images/new',
    `/admin/images/${imageId}/edit`,
    '/admin/stories',
    '/admin/stories/new',
    `/admin/stories/${storyId}/edit`,
    '/admin/relationships',
    ...TAXONOMY_KINDS.map((kind) => `/admin/${kind}`),
  ];

  for (const path of paths) {
    const res = await agent.get(path);
    assert.equal(res.status, 200, `GET ${path} should render, got ${res.status}`);
    assert.match(res.headers['content-type'], /text\/html/, `${path} returns HTML`);
    assert.ok(res.text.includes('name="_csrf"') || res.text.includes('</html>'), `${path} produced a real page`);
  }
});

test('admin pages carry a CSRF token wherever they offer an action', async (t) => {
  const { agent, ids } = await signedInAgent(t);

  const formPages = [
    '/admin/characters/new',
    `/admin/characters/${ids.aria}/edit`,
    '/admin/images/new',
    '/admin/stories/new',
    '/admin/relationships',
    ...TAXONOMY_KINDS.map((kind) => `/admin/${kind}`),
  ];

  for (const path of formPages) {
    const res = await agent.get(path);
    assert.ok(
      /name="_csrf" value="[^"]+"/.test(res.text),
      `${path} must embed a CSRF token or its forms cannot be submitted`,
    );
  }
});

test('the character form repopulates job titles after a validation failure', async (t) => {
  const { agent } = await signedInAgent(t);

  const form = await agent.get('/admin/characters/new');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];

  // Deliberately incomplete: no image, no tag. The point is the re-render.
  const res = await agent.post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Rejected Draft')
    .field('job_title', 'Sailor')
    .field('job_title', 'Poet')
    .field('short_description', 'A draft that should come back intact.');

  assert.equal(res.status, 422, 'incomplete character is rejected');
  assert.ok(res.text.includes('Rejected Draft'), 'the typed name survives');
  assert.ok(res.text.includes('value="Sailor"'), 'first job title survives');
  assert.ok(res.text.includes('value="Poet"'), 'second job title survives');
});

test('a single job title re-renders without crashing', async (t) => {
  const { agent } = await signedInAgent(t);

  const form = await agent.get('/admin/characters/new');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];

  // One value arrives as a bare string rather than an array — the case that
  // previously crashed the template.
  const res = await agent.post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Solo Title')
    .field('job_title', 'Baker');

  assert.equal(res.status, 422);
  assert.ok(res.text.includes('value="Baker"'), 'the lone job title survives');
});

test('all admin pages stay unreachable when signed out', async (t) => {
  const hash = await hashPassword(ADMIN_PASSWORD);
  const { app, ids } = buildApp(t, hash);

  const paths = [
    '/admin',
    '/admin/characters/new',
    `/admin/characters/${ids.aria}/edit`,
    '/admin/images/new',
    '/admin/stories/new',
    '/admin/relationships',
    ...TAXONOMY_KINDS.map((kind) => `/admin/${kind}`),
  ];

  for (const path of paths) {
    const res = await request(app).get(path);
    assert.equal(res.status, 303, `GET ${path} must redirect to the login screen`);
    assert.match(res.headers.location, /^\/admin\/login/, `${path} redirects to login`);
  }
});
