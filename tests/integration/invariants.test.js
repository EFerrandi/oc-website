import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';
import sharp from 'sharp';

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

async function signIn(app) {
  const agent = request.agent(app);
  const form = await agent.get('/admin/login');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];
  await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });
  return agent;
}

async function tokenFrom(agent, path) {
  const page = await agent.get(path);
  return page.text.match(/name="_csrf" value="([^"]+)"/)[1];
}

function png() {
  return sharp({ create: { width: 48, height: 48, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    .png().toBuffer();
}

/** Counts of everything an invariant violation might disturb. */
function snapshot(db) {
  return {
    characters: db.prepare('SELECT COUNT(*) n FROM character').get().n,
    images: db.prepare('SELECT COUNT(*) n FROM image').get().n,
    stories: db.prepare('SELECT COUNT(*) n FROM story').get().n,
    characterImages: db.prepare('SELECT COUNT(*) n FROM character_image').get().n,
    characterTags: db.prepare('SELECT COUNT(*) n FROM character_tag').get().n,
    jobTitles: db.prepare('SELECT COUNT(*) n FROM character_job_title').get().n,
    characterStories: db.prepare('SELECT COUNT(*) n FROM character_story').get().n,
  };
}

test('I-1: a character can never end up with zero images', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = snapshot(db);

  // Brann has exactly one image; removing it must be refused.
  const token = await tokenFrom(agent, `/admin/images/${ids.imageSfwB}/edit`);
  const res = await agent.post(`/admin/images/${ids.imageSfwB}/delete`).type('form')
    .send({ _csrf: token, confirm: 'delete' });

  assert.ok(res.status === 422 || res.status === 409, `expected refusal, got ${res.status}`);
  assert.deepEqual(snapshot(db), before, 'nothing changed');

  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM character_image WHERE character_id = ?').get(ids.brann).n,
    1,
    'Brann still has his image',
  );
});

test('I-2: a character cannot be created without an image', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = snapshot(db);
  const token = await tokenFrom(agent, '/admin/characters/new');

  const res = await agent.post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Imageless')
    .field('gender_id', String(ids.genderFemale))
    .field('short_description', 'No image attached.')
    .field('job_title', 'Ghost')
    .field('terms_of_use', 'Ask first.')
    .field('designer_id', String(ids.designer))
    .field('tag_id', String(ids.tagCute));

  assert.equal(res.status, 422, 'a character with no image is refused');
  assert.deepEqual(snapshot(db), before, 'no partial character was left behind');
});

test('I-3: a character can never end up with zero tags or zero job titles', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = snapshot(db);
  const token = await tokenFrom(agent, `/admin/characters/${ids.aria}/edit`);

  const noTags = await agent.post(`/admin/characters/${ids.aria}`).type('form').send({
    _csrf: token,
    name: 'Aria',
    gender_id: ids.genderFemale,
    short_description: 'Still here.',
    terms_of_use: 'Ask first.',
    designer_id: ids.designer,
    job_title: 'Cartographer',
  });

  assert.equal(noTags.status, 422, 'removing every tag is refused');

  const noTitles = await agent.post(`/admin/characters/${ids.aria}`).type('form').send({
    _csrf: token,
    name: 'Aria',
    gender_id: ids.genderFemale,
    short_description: 'Still here.',
    terms_of_use: 'Ask first.',
    designer_id: ids.designer,
    tag_id: ids.tagCute,
  });

  assert.equal(noTitles.status, 422, 'removing every job title is refused');
  assert.deepEqual(snapshot(db), before, 'neither attempt changed anything');
});

test('I-4: an image can never end up with zero linked characters', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = snapshot(db);
  const token = await tokenFrom(agent, `/admin/images/${ids.imageSfwA}/edit`);

  const res = await agent.post(`/admin/images/${ids.imageSfwA}`).type('form').send({
    _csrf: token,
    alt_text: 'A mapmaker at her desk',
    artist_id: ids.artistA,
    // character_id deliberately omitted
  });

  assert.equal(res.status, 422, 'unlinking the last character is refused');
  assert.deepEqual(snapshot(db), before, 'the link survives');
});

test('I-5: a story can never end up with zero linked characters', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = snapshot(db);
  const token = await tokenFrom(agent, `/admin/stories/${ids.storySfw}/edit`);

  const res = await agent.post(`/admin/stories/${ids.storySfw}`).type('form').send({
    _csrf: token,
    title: 'A Quiet Morning',
    body: 'Still the same story.',
    // character_id deliberately omitted
  });

  assert.equal(res.status, 422, 'unlinking the last character is refused');
  assert.deepEqual(snapshot(db), before, 'the links survive');
});

test('I-6: an image can never exist without an artist or without alt text', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const before = snapshot(db);
  const token = await tokenFrom(agent, '/admin/images/new');
  const buffer = await png();

  const noArtist = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Has alt text but no artist')
    .field('character_id', String(ids.aria))
    .attach('image', buffer, 'a.png');

  assert.equal(noArtist.status, 422, 'an image with no artist is refused');

  const noAlt = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', '   ')
    .field('artist_id', String(ids.artistA))
    .field('character_id', String(ids.aria))
    .attach('image', buffer, 'b.png');

  assert.equal(noAlt.status, 422, 'whitespace-only alt text is refused');
  assert.deepEqual(snapshot(db), before, 'no orphaned image rows were created');
});

test('a rejected upload leaves no file behind on disk', async (t) => {
  const { app, config, ids } = await withApp(t);
  const agent = await signIn(app);

  const fs = await import('node:fs');
  const listing = () => {
    const read = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f !== 'previews') : []);
    return { uploads: read(config.uploadDir), previews: read(config.previewDir) };
  };

  const before = listing();
  const token = await tokenFrom(agent, '/admin/images/new');

  const res = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Will be rejected')
    .field('character_id', String(ids.aria))
    .attach('image', await png(), 'rejected.png');

  assert.equal(res.status, 422);
  assert.deepEqual(
    listing(), before,
    'a rejected upload must not leave an orphaned original or preview on disk',
  );
});

test('the avatar can only be an image actually linked to that character', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  // Brann's image is not linked to Aria, so it cannot be Aria's avatar.
  const token = await tokenFrom(agent, `/admin/characters/${ids.aria}/edit`);

  const res = await agent.post(`/admin/characters/${ids.aria}`).type('form').send({
    _csrf: token,
    name: 'Aria',
    gender_id: ids.genderFemale,
    short_description: 'Still here.',
    terms_of_use: 'Ask first.',
    designer_id: ids.designer,
    job_title: 'Cartographer',
    tag_id: ids.tagCute,
    avatar_image_id: ids.imageSfwB,
  });

  assert.equal(res.status, 422, 'an unlinked image cannot be designated the avatar');
  assert.equal(
    db.prepare('SELECT avatar_image_id AS a FROM character WHERE id = ?').get(ids.aria).a,
    ids.imageSfwA,
    'the existing avatar is untouched',
  );
});
