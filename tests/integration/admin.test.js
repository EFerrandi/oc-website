import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';
import sharp from 'sharp';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

const PASSWORD = 'correct-horse-battery-staple';

async function pngBuffer(size = 64) {
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r: 200, g: 60, b: 120 } },
  }).png().toBuffer();
}

async function withApp(t) {
  const hash = await hashPassword(PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

/** Sign in and return an agent whose cookie jar holds the admin session. */
async function signIn(app) {
  const agent = request.agent(app);

  const form = await agent.get('/admin/login');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];

  const res = await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });
  assert.equal(res.status, 303, 'sign-in should succeed');

  return agent;
}

async function tokenFrom(agent, path) {
  const page = await agent.get(path);
  const match = page.text.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, `no CSRF token found on ${path}`);
  return match[1];
}

test('admin screens are unreachable without signing in', async (t) => {
  const { app } = await withApp(t);

  for (const path of ['/admin', '/admin/characters', '/admin/images', '/admin/tags']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 303, `${path} should redirect`);
    assert.ok(res.headers.location.startsWith('/admin/login'), 'redirects to sign-in');
  }
});

test('a wrong password is rejected generically', async (t) => {
  const { app } = await withApp(t);
  const agent = request.agent(app);

  const token = await tokenFrom(agent, '/admin/login');
  const res = await agent.post('/admin/login').type('form').send({ _csrf: token, password: 'wrong' });

  assert.equal(res.status, 401);
  assert.ok(res.text.includes('Invalid credentials'), 'message must not say which part failed');
});

test('signing in then out closes access immediately', async (t) => {
  const { app } = await withApp(t);
  const agent = await signIn(app);

  assert.equal((await agent.get('/admin')).status, 200);

  const token = await tokenFrom(agent, '/admin');
  await agent.post('/admin/logout').type('form').send({ _csrf: token });

  const after = await agent.get('/admin');
  assert.equal(after.status, 303, 'admin must be inaccessible straight after signing out');
});

test('a state-changing request without a CSRF token is refused', async (t) => {
  const { app } = await withApp(t);
  const agent = await signIn(app);

  const res = await agent.post('/admin/tags').type('form').send({ name: 'no-token-tag' });
  assert.equal(res.status, 403);
});

test('creating a character with its first image works end to end', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/characters/new');
  const png = await pngBuffer();

  const res = await agent
    .post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Nimbus')
    .field('gender_id', String(ids.genderFemale))
    .field('short_description', 'A cloud spirit.')
    .field('job_title', 'Weather warden')
    .field('terms_of_use', 'Ask before using.')
    .field('can_regift', '1')
    .field('can_retrade', '0')
    .field('can_resell', '0')
    .field('designer_id', String(ids.designer))
    .field('tag_id', String(ids.tagCute))
    .field('image_alt_text', 'Nimbus drifting over a hill')
    .field('image_artist_id', String(ids.artistA))
    .attach('image', png, 'nimbus.png');

  assert.equal(res.status, 303, `expected redirect, got ${res.status}: ${res.text.slice(0, 400)}`);

  const created = db.prepare("SELECT id, slug, avatar_image_id AS avatar FROM character WHERE name = 'Nimbus'").get();
  assert.ok(created, 'character row created');
  assert.ok(created.avatar, 'avatar must be set before the creation transaction commits');

  const linkedImages = db.prepare('SELECT COUNT(*) n FROM character_image WHERE character_id = ?').get(created.id).n;
  assert.equal(linkedImages, 1, 'first image linked');

  // It must be live publicly at once.
  const publicPage = await request(app).get(`/characters/${created.slug}`);
  assert.equal(publicPage.status, 200);
  assert.ok(publicPage.text.includes('Nimbus'));
});

test('a character submitted without a tag is rejected, naming the field', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = db.prepare('SELECT COUNT(*) n FROM character').get().n;
  const token = await tokenFrom(agent, '/admin/characters/new');
  const png = await pngBuffer();

  const res = await agent
    .post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Tagless')
    .field('gender_id', String(ids.genderFemale))
    .field('short_description', 'No tags given.')
    .field('job_title', 'Drifter')
    .field('terms_of_use', 'None.')
    .field('can_regift', '1')
    .field('can_retrade', '0')
    .field('can_resell', '0')
    .field('designer_id', String(ids.designer))
    .field('image_alt_text', 'A tagless figure')
    .field('image_artist_id', String(ids.artistA))
    .attach('image', png, 'tagless.png');

  assert.equal(res.status, 422);
  assert.ok(res.text.includes('at least one tag'), 'the offending field must be named');

  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM character').get().n, before,
    'a rejected submission must leave no partial character behind',
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM image WHERE alt_text = 'A tagless figure'").get().n, 0,
    'a rejected submission must leave no orphaned image row',
  );
});

test('an image must name an artist and link at least one character', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/images/new');
  const png = await pngBuffer();

  const noArtist = await agent
    .post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Missing artist')
    .field('character_id', String(ids.aria))
    .attach('image', png, 'x.png');

  assert.equal(noArtist.status, 422);
  assert.ok(noArtist.text.includes('artist'), 'must name the missing artist field');

  const noCharacter = await agent
    .post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Missing character link')
    .field('artist_id', String(ids.artistA))
    .attach('image', png, 'y.png');

  assert.equal(noCharacter.status, 422);
});

test('a relationship cannot point at itself or duplicate an existing pair', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/relationships');

  const selfRef = await agent.post('/admin/relationships').type('form').send({
    _csrf: token, from_character_id: ids.aria, to_character_id: ids.aria, label: 'self',
  });
  assert.equal(selfRef.status, 422);
  assert.ok(selfRef.text.includes('cannot be related to itself'));

  // The fixture already has Aria—Brann "childhood friends"; the reverse
  // direction with the same label must be refused too.
  const reverse = await agent.post('/admin/relationships').type('form').send({
    _csrf: token, from_character_id: ids.brann, to_character_id: ids.aria, label: 'Childhood Friends',
  });
  assert.equal(reverse.status, 422);
  assert.ok(reverse.text.includes('already have a relationship'));
});

test('an in-use tag cannot be deleted through the admin, but an in-use trait can', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const tagToken = await tokenFrom(agent, '/admin/tags');
  const tagRes = await agent.post(`/admin/tags/${ids.tagCute}/delete`).type('form')
    .send({ _csrf: tagToken, confirm: 'delete' });

  assert.equal(tagRes.status, 409, 'an in-use tag must be refused with 409');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(ids.tagCute).n, 1);

  const traitToken = await tokenFrom(agent, '/admin/traits');
  const traitRes = await agent.post(`/admin/traits/${ids.traitGreed}/delete`).type('form')
    .send({ _csrf: traitToken, confirm: 'delete' });

  assert.equal(traitRes.status, 303, 'an in-use trait deletes successfully and detaches');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM trait WHERE id = ?').get(ids.traitGreed).n, 0);
});

test('deleting a character keeps shared content and removes exclusive content', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, `/admin/characters/${ids.brann}/edit`);

  // The SFW story is shared with Aria; Brann's image is his alone.
  const res = await agent.post(`/admin/characters/${ids.brann}/delete`).type('form')
    .send({ _csrf: token, confirm_name: 'Brann' });

  assert.equal(res.status, 303, `expected redirect, got ${res.status}`);

  assert.equal(db.prepare('SELECT COUNT(*) n FROM character WHERE id = ?').get(ids.brann).n, 0);
  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM story WHERE id = ?').get(ids.storySfw).n, 1,
    'a story shared with another character must survive',
  );
  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM image WHERE id = ?').get(ids.imageSfwB).n, 0,
    'an image linked only to the deleted character must be removed',
  );
});

test('deletion requires the confirmation to match the name exactly', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, `/admin/characters/${ids.aria}/edit`);
  const res = await agent.post(`/admin/characters/${ids.aria}/delete`).type('form')
    .send({ _csrf: token, confirm_name: 'not the name' });

  assert.equal(res.status, 422);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM character WHERE id = ?').get(ids.aria).n, 1);
});
