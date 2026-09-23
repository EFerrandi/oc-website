import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

const PASSWORD = 'correct-horse-battery-staple';

async function withApp(t) {
  const hash = await hashPassword(PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

/** Every state-changing admin action, as method + path. */
function adminActions(ids) {
  return [
    ['post', '/admin/characters'],
    ['post', `/admin/characters/${ids.aria}`],
    ['post', `/admin/characters/${ids.aria}/delete`],
    ['post', '/admin/images'],
    ['post', `/admin/images/${ids.imageSfwA}`],
    ['post', `/admin/images/${ids.imageSfwA}/delete`],
    ['post', '/admin/stories'],
    ['post', `/admin/stories/${ids.storySfw}`],
    ['post', `/admin/stories/${ids.storySfw}/delete`],
    ['post', '/admin/relationships'],
    ['post', '/admin/tags'],
    ['post', `/admin/tags/${ids.tagCute}/delete`],
    ['post', '/admin/traits'],
    ['post', '/admin/genders'],
    ['post', '/admin/artists'],
    ['post', '/admin/designers'],
  ];
}

test('no admin action can be performed without a session', async (t) => {
  const { app, db, ids } = await withApp(t);

  const before = {
    characters: db.prepare('SELECT COUNT(*) n FROM character').get().n,
    images: db.prepare('SELECT COUNT(*) n FROM image').get().n,
    stories: db.prepare('SELECT COUNT(*) n FROM story').get().n,
    tags: db.prepare('SELECT COUNT(*) n FROM tag').get().n,
  };

  for (const [method, path] of adminActions(ids)) {
    const res = await request(app)[method](path).type('form').send({ name: 'intruder' });

    assert.ok(
      res.status === 303 || res.status === 403,
      `${method.toUpperCase()} ${path} must be refused, got ${res.status}`,
    );
  }

  // The decisive check: nothing actually changed.
  assert.deepEqual({
    characters: db.prepare('SELECT COUNT(*) n FROM character').get().n,
    images: db.prepare('SELECT COUNT(*) n FROM image').get().n,
    stories: db.prepare('SELECT COUNT(*) n FROM story').get().n,
    tags: db.prepare('SELECT COUNT(*) n FROM tag').get().n,
  }, before, 'an unauthenticated caller must not change any data');
});

test('the sign-in redirect preserves where the admin was heading', async (t) => {
  const { app } = await withApp(t);

  const res = await request(app).get('/admin/characters/new');
  assert.equal(res.status, 303);
  assert.match(res.headers.location, /^\/admin\/login\?return_to=/);
  assert.ok(
    decodeURIComponent(res.headers.location).includes('/admin/characters/new'),
    'the original destination is carried through',
  );
});

test('sign-in cannot be turned into an open redirect', async (t) => {
  const { app } = await withApp(t);

  for (const evil of ['https://evil.example/', '//evil.example/', 'http://evil.example']) {
    const page = await request(app).get('/admin/login');
    const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
    const cookies = page.headers['set-cookie'];

    const res = await request(app).post('/admin/login')
      .set('Cookie', cookies)
      .type('form')
      .send({ _csrf: token, password: PASSWORD, return_to: evil });

    assert.equal(res.status, 303);
    assert.equal(res.headers.location, '/admin', `must not redirect off-site for ${evil}`);
  }
});

test('repeated failed sign-ins are throttled', async (t) => {
  const { app } = await withApp(t);

  const agent = request.agent(app);
  const page = await agent.get('/admin/login');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

  const statuses = [];
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const res = await agent.post('/admin/login').type('form')
      .send({ _csrf: token, password: 'wrong-guess' });
    statuses.push(res.status);
  }

  assert.ok(statuses.includes(429), `throttling must kick in, saw ${[...new Set(statuses)].join(', ')}`);
  assert.equal(statuses[0], 401, 'the first wrong guess is a plain rejection, not a throttle');
  assert.equal(statuses.at(-1), 429, 'once throttled, it stays throttled within the window');
});

test('the session id changes on sign-in, so a pre-login id can never become an admin id', async (t) => {
  const { app } = await withApp(t);

  const agent = request.agent(app);
  const page = await agent.get('/admin/login');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

  const before = (page.headers['set-cookie'] ?? []).find((c) => c.startsWith('sid='));

  const res = await agent.post('/admin/login').type('form')
    .send({ _csrf: token, password: PASSWORD });

  assert.equal(res.status, 303);

  const after = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('sid='));
  assert.ok(after, 'a new session cookie is issued on sign-in');

  if (before) {
    assert.notEqual(
      before.split(';')[0], after.split(';')[0],
      'the session id must be regenerated (session fixation defence)',
    );
  }
});

test('signing out immediately invalidates the session cookie', async (t) => {
  const { app } = await withApp(t);

  const agent = request.agent(app);
  const page = await agent.get('/admin/login');
  const loginToken = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
  await agent.post('/admin/login').type('form').send({ _csrf: loginToken, password: PASSWORD });

  const dashboard = await agent.get('/admin');
  assert.equal(dashboard.status, 200);

  const token = dashboard.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const stolenCookies = dashboard.headers['set-cookie'];

  await agent.post('/admin/logout').type('form').send({ _csrf: token });

  assert.equal((await agent.get('/admin')).status, 303, 'the agent is signed out');

  if (stolenCookies) {
    const replay = await request(app).get('/admin').set('Cookie', stolenCookies);
    assert.equal(replay.status, 303, 'replaying the old cookie must not work either');
  }
});

test('the admin sign-in entry point sits next to the NSFW toggle', async (t) => {
  const { app } = await withApp(t);

  const res = await request(app).get('/');
  assert.equal(res.status, 200);

  const nsfwAt = res.text.indexOf('name="nsfw"');
  const adminAt = res.text.indexOf('/admin/login');

  assert.ok(nsfwAt > -1, 'the NSFW toggle is present');
  assert.ok(adminAt > -1, 'the admin sign-in link is present');
  assert.ok(adminAt > nsfwAt, 'sign-in appears after (to the right of) the NSFW toggle');
});
