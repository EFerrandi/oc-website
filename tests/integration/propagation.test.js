import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
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

async function signIn(app) {
  const agent = request.agent(app);
  const form = await agent.get('/admin/login');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const res = await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });
  assert.equal(res.status, 303);
  return agent;
}

async function tokenFrom(agent, path) {
  const page = await agent.get(path);
  return page.text.match(/name="_csrf" value="([^"]+)"/)[1];
}

/**
 * Artists, designers and taxonomy names are stored once and referenced, never
 * copied. A rename must therefore be visible everywhere at once — if any page
 * shows the old name, something has duplicated the value.
 */
test('renaming an artist updates every credit that references it', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = await request(app).get('/artists');
  assert.ok(before.text.includes('Aster Art'), 'the original name is on the artists page');

  const token = await tokenFrom(agent, '/admin/artists');
  const res = await agent.post(`/admin/artists/${ids.artistA}`).type('form')
    .send({ _csrf: token, name: 'Renamed Studio', websiteUrl: 'https://example.com/renamed' });

  assert.equal(res.status, 303, `rename should redirect, got ${res.status}`);

  for (const path of ['/artists', '/characters/aria', `/images/${ids.imageSfwA}`]) {
    const page = await request(app).get(path);
    assert.equal(page.status, 200);
    assert.ok(page.text.includes('Renamed Studio'), `${path} shows the new name`);
    assert.ok(!page.text.includes('Aster Art'), `${path} no longer shows the old name`);
  }

  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM artist').get().n, 2,
    'renaming must not create a second artist row',
  );
});

test('renaming a designer updates every character that references it', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/designers');
  const res = await agent.post(`/admin/designers/${ids.designer}`).type('form')
    .send({ _csrf: token, name: 'New Designer Name', websiteUrl: 'https://example.com/designer' });

  assert.equal(res.status, 303);

  const page = await request(app).get('/characters/aria');
  assert.ok(page.text.includes('New Designer Name'), 'the character page shows the new name');
});

test('renaming a tag updates the filter controls and the character page together', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/tags');
  const res = await agent.post(`/admin/tags/${ids.tagCute}`).type('form')
    .send({ _csrf: token, name: 'adorable' });

  assert.equal(res.status, 303);

  const gallery = await request(app).get('/');
  assert.ok(gallery.text.includes('adorable'), 'the filter control shows the new name');
  assert.ok(!gallery.text.includes('>cute<'), 'the old name is gone from the controls');

  // The renamed tag must still actually filter.
  const filtered = await request(app).get('/?tag=adorable');
  assert.equal(filtered.status, 200);
  assert.ok(filtered.text.includes('Aria'), 'filtering by the new name still works');
});

test('renaming a sin or virtue updates every character carrying it', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/traits');
  const res = await agent.post(`/admin/traits/${ids.traitPatience}`).type('form')
    .send({ _csrf: token, name: 'Forbearance', traitKind: 'virtue' });

  assert.equal(res.status, 303);

  const page = await request(app).get('/characters/aria');
  assert.ok(page.text.includes('Forbearance'), 'the new name shows on the character');
  assert.ok(!page.text.includes('Patience'), 'the old name is gone');
});

test('a rename cannot collide with an existing name, whatever the spacing or case', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  for (const attempt of ['feral', 'FERAL', '  Feral  ']) {
    const token = await tokenFrom(agent, '/admin/tags');
    const res = await agent.post(`/admin/tags/${ids.tagCute}`).type('form')
      .send({ _csrf: token, name: attempt });

    // A duplicate name is a validation failure, not a dependency conflict:
    // 409 is reserved for "something else still depends on this".
    assert.equal(res.status, 422, `renaming "cute" to "${attempt}" must be refused`);
  }

  assert.equal(
    db.prepare('SELECT name FROM tag WHERE id = ?').get(ids.tagCute).name, 'cute',
    'the original name is untouched after a refused rename',
  );
});

test('changing an image rating moves it between the two audiences at once', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  // Brann's image starts SFW and visible to everyone.
  const openBefore = await request(app).get('/characters/brann');
  assert.ok(openBefore.text.includes(`/media/${ids.imageSfwB}`), 'visible before the change');

  const token = await tokenFrom(agent, `/admin/images/${ids.imageSfwB}/edit`);
  const res = await agent.post(`/admin/images/${ids.imageSfwB}`).type('form').send({
    _csrf: token,
    alt_text: 'A blacksmith at work',
    artist_id: ids.artistA,
    character_id: ids.brann,
    is_nsfw: '1',
  });

  assert.equal(res.status, 303, `rating change should redirect, got ${res.status}`);

  const openAfter = await request(app).get('/characters/brann');
  assert.ok(
    !openAfter.text.includes(`/media/${ids.imageSfwB}`),
    're-rating an image hides it immediately from visitors who have not opted in',
  );

  assert.equal(
    (await request(app).get(`/media/${ids.imageSfwB}`)).status, 404,
    'the media route follows the new rating too',
  );

  const optedIn = await request(app).get('/characters/brann').set('Cookie', NSFW_ON);
  assert.ok(optedIn.text.includes(`/media/${ids.imageSfwB}`), 'still visible once opted in');
});
