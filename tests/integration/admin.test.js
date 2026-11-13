import assert from 'node:assert/strict';
import fs from 'node:fs';
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
    .field('artist_id', String(ids.designer))
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

test('character personality and physical descriptions persist independently', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const token = await tokenFrom(agent, '/admin/characters/new');
  const created = await agent.post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Described Character')
    .field('gender_id', String(ids.genderFemale))
    .field('short_description', 'A character with extra details.')
    .field('personality', 'Curious and kind.\n\nAlways helpful.')
    .field('physical_description', 'Tall with silver hair.')
    .field('job_title', 'Explorer')
    .field('terms_of_use', 'Ask first.')
    .field('can_regift', '1')
    .field('can_retrade', '0')
    .field('can_resell', '0')
    .field('artist_id', String(ids.designer))
    .field('tag_id', String(ids.tagCute))
    .field('image_alt_text', 'A portrait')
    .field('image_artist_id', String(ids.artistA))
    .attach('image', await pngBuffer(), 'described.png');

  assert.equal(created.status, 303, created.text.slice(0, 300));
  const row = db.prepare(`
    SELECT id, personality, physical_description AS physicalDescription
    FROM character WHERE name = 'Described Character'
  `).get();
  assert.equal(row.personality, 'Curious and kind.\n\nAlways helpful.');
  assert.equal(row.physicalDescription, 'Tall with silver hair.');

  const edit = await agent.get(`/admin/characters/${row.id}/edit`);
  assert.match(edit.text, /name="personality"[^>]*>Curious and kind\.\n\nAlways helpful\.<\/textarea>/);
  assert.match(edit.text, /name="physical_description"[^>]*>Tall with silver hair\.<\/textarea>/);
  const editToken = edit.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const changed = await agent.post(`/admin/characters/${row.id}`).type('form').send({
    _csrf: editToken,
    name: 'Described Character',
    gender_id: String(ids.genderFemale),
    short_description: 'A character with extra details.',
    personality: '',
    physical_description: 'Now has blue hair.',
    job_title: 'Explorer',
    terms_of_use: 'Ask first.',
    can_regift: '1',
    can_retrade: '0',
    can_resell: '0',
    artist_id: String(ids.designer),
    tag_id: String(ids.tagCute),
  });
  assert.equal(changed.status, 303);
  const updated = db.prepare(`
    SELECT personality, physical_description AS physicalDescription
    FROM character WHERE id = ?
  `).get(row.id);
  assert.equal(updated.personality, null, 'blank clears just that field');
  assert.equal(updated.physicalDescription, 'Now has blue hair.');
});

test('character descriptions are preserved in an edit validation response', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get(`/admin/characters/${ids.aria}/edit`);
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const response = await agent.post(`/admin/characters/${ids.aria}`).type('form').send({
    _csrf: token,
    name: '',
    gender_id: String(ids.genderFemale),
    short_description: 'Aria short description',
    personality: 'Submitted personality.',
    physical_description: 'Submitted physical description.',
    job_title: ['Cartographer', 'Archivist'],
    terms_of_use: 'Do not resell without permission.',
    can_regift: '1',
    can_retrade: '0',
    can_resell: '0',
    artist_id: String(ids.designer),
    tag_id: String(ids.tagCute),
    avatar_image_id: String(ids.imageSfwA),
  });
  assert.equal(response.status, 422);
  assert.match(response.text, /name="personality"[^>]*>Submitted personality\.<\/textarea>/);
  assert.match(response.text, /name="physical_description"[^>]*>Submitted physical description\.<\/textarea>/);
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
    .field('artist_id', String(ids.designer))
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

test('an image upload can create its credited artist atomically', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const token = await tokenFrom(agent, '/admin/images/new');
  const before = {
    artists: db.prepare('SELECT COUNT(*) n FROM artist').get().n,
    images: db.prepare('SELECT COUNT(*) n FROM image').get().n,
  };

  const res = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'A newly credited image')
    .field('artist_id', 'new')
    .field('new_artist_name', 'New Upload Artist')
    .field('new_artist_website_url', 'https://artist.example/')
    .field('character_id', String(ids.aria))
    .attach('image', await pngBuffer(), 'new-artist.png');

  assert.equal(res.status, 303, `upload should redirect, got ${res.status}`);
  const artist = db.prepare('SELECT id, website_url FROM artist WHERE name = ?').get('New Upload Artist');
  assert.ok(artist);
  assert.equal(artist.website_url, 'https://artist.example/');
  assert.equal(
    db.prepare('SELECT artist_id FROM image WHERE alt_text = ?').get('A newly credited image').artist_id,
    artist.id,
  );
  assert.equal(db.prepare('SELECT COUNT(*) n FROM artist').get().n, before.artists + 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM image').get().n, before.images + 1);
});

test('invalid inline artist data leaves no artist or image behind', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const token = await tokenFrom(agent, '/admin/images/new');
  const before = {
    artists: db.prepare('SELECT COUNT(*) n FROM artist').get().n,
    images: db.prepare('SELECT COUNT(*) n FROM image').get().n,
  };

  const duplicate = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Duplicate artist attempt')
    .field('artist_id', 'new')
    .field('new_artist_name', '  dara designs ')
    .field('character_id', String(ids.aria))
    .attach('image', await pngBuffer(), 'duplicate.png');
  assert.equal(duplicate.status, 422);
  assert.ok(duplicate.text.includes('already exists'));

  const badUrl = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Bad URL artist attempt')
    .field('artist_id', 'new')
    .field('new_artist_name', 'Bad URL Artist')
    .field('new_artist_website_url', 'javascript:alert(1)')
    .field('character_id', String(ids.aria))
    .attach('image', await pngBuffer(), 'bad-url.png');
  assert.equal(badUrl.status, 422);
  assert.ok(badUrl.text.includes('full web address'));

  assert.equal(db.prepare('SELECT COUNT(*) n FROM artist').get().n, before.artists);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM image').get().n, before.images);
});

test('a failed image-record transaction rolls back its artist and removes both files', async (t) => {
  const { app, db, ids, config } = await withApp(t);
  const agent = await signIn(app);
  const token = await tokenFrom(agent, '/admin/images/new');
  const before = {
    artists: db.prepare('SELECT COUNT(*) n FROM artist').get().n,
    images: db.prepare('SELECT COUNT(*) n FROM image').get().n,
  };
  db.exec(`
    CREATE TRIGGER reject_test_upload BEFORE INSERT ON image
    WHEN NEW.alt_text = 'Force transaction rollback'
    BEGIN SELECT RAISE(ABORT, 'forced test failure'); END
  `);

  const response = await agent.post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', 'Force transaction rollback')
    .field('artist_id', 'new')
    .field('new_artist_name', 'Rolled Back Artist')
    .field('character_id', String(ids.aria))
    .attach('image', await pngBuffer(), 'rollback.png');

  assert.equal(response.status, 500);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM artist').get().n, before.artists);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM image').get().n, before.images);
  assert.deepEqual(fs.readdirSync(config.uploadDir).filter((name) => name !== 'previews'), []);
  assert.deepEqual(fs.readdirSync(config.previewDir), []);
});

test('admin dashboard reports association-based image totals and percentages', async (t) => {
  const { app } = await withApp(t);
  const anonymous = await request(app).get('/admin');
  assert.equal(anonymous.status, 303);
  const agent = await signIn(app);
  const dashboard = await agent.get('/admin');

  assert.equal(dashboard.status, 200);
  assert.match(dashboard.text, /All character-image associations: <strong>4<\/strong>/);
  assert.match(dashboard.text, /SFW: <strong>50%<\/strong>/);
  assert.match(dashboard.text, /NSFW: <strong>50%<\/strong>/);
  assert.match(dashboard.text, /Images per character/);
  assert.match(dashboard.text, /role="img"[^>]*aria-labelledby="statistics-chart-title statistics-chart-description"/);
  assert.match(dashboard.text, /class="statistics-slice statistics-sfw"/);
  assert.match(dashboard.text, /class="statistics-slice statistics-nsfw"/);
  const slices = dashboard.text.match(/<circle class="statistics-slice[^>]*>/g) ?? [];
  assert.equal(slices.length, 2, 'exactly one SFW and one NSFW region');
  assert.match(slices[0], /statistics-sfw/);
  assert.match(slices[1], /statistics-nsfw/);
  assert.match(dashboard.text, /<title>SFW: 2 images<\/title>/);
  assert.match(dashboard.text, /<title>NSFW: 2 images<\/title>/);
  assert.match(dashboard.text, /class="statistics-legend"[\s\S]*SFW[\s\S]*NSFW/);
  assert.doesNotMatch(dashboard.text, /statistics-color-/);
  assert.match(dashboard.text, /Image-character associations by character/);
  assert.match(dashboard.text, /<caption>Image-character associations by character and content rating<\/caption>/);
});

test('the statistics chart omits a region with no images', async (t) => {
  const { app, db } = await withApp(t);
  db.exec("UPDATE image SET is_nsfw = 0");
  const agent = await signIn(app);
  const dashboard = await agent.get('/admin');
  const slices = dashboard.text.match(/<circle class="statistics-slice[^>]*>/g) ?? [];
  assert.equal(slices.length, 1);
  assert.match(slices[0], /statistics-sfw/);

  db.exec('DELETE FROM character_image');
  const empty = await agent.get('/admin');
  assert.doesNotMatch(empty.text, /class="statistics-slice/);
});

function checkedPermission(html, key) {
  const checked = html.match(new RegExp(`<input type="radio" name="${key}" value="([01])"[^>]*checked`));
  return checked ? checked[1] : null;
}

test('the edit form preselects saved permissions, including not allowed', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get(`/admin/characters/${ids.aria}/edit`);
  assert.equal(checkedPermission(page.text, 'can_regift'), '1');
  assert.equal(checkedPermission(page.text, 'can_retrade'), '0');
  assert.equal(checkedPermission(page.text, 'can_resell'), '0');

  db.prepare('UPDATE character SET can_resell = 1 WHERE id = ?').run(ids.aria);
  const again = await agent.get(`/admin/characters/${ids.aria}/edit`);
  assert.equal(checkedPermission(again.text, 'can_resell'), '1');
});

test('an unchanged permission save keeps them, and a 422 redisplays submitted choices', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get(`/admin/characters/${ids.aria}/edit`);
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const base = {
    _csrf: token, name: 'Aria', gender_id: String(ids.genderFemale),
    short_description: 'Aria short description', job_title: 'Cartographer',
    terms_of_use: 'Terms', artist_id: String(ids.designer), tag_id: String(ids.tagCute),
    avatar_image_id: String(ids.imageSfwA),
  };

  const ok = await agent.post(`/admin/characters/${ids.aria}`).type('form')
    .send({ ...base, can_regift: '1', can_retrade: '0', can_resell: '0' });
  assert.equal(ok.status, 303);
  const row = db.prepare('SELECT can_regift, can_retrade, can_resell FROM character WHERE id = ?').get(ids.aria);
  assert.deepEqual({ ...row }, { can_regift: 1, can_retrade: 0, can_resell: 0 });

  const bad = await agent.post(`/admin/characters/${ids.aria}`).type('form')
    .send({ ...base, name: '', can_regift: '0', can_retrade: '1', can_resell: '1' });
  assert.equal(bad.status, 422);
  assert.equal(checkedPermission(bad.text, 'can_regift'), '0');
  assert.equal(checkedPermission(bad.text, 'can_retrade'), '1');
  assert.equal(checkedPermission(bad.text, 'can_resell'), '1');
});

test('the creation form preselects no permission', async (t) => {
  const { app } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get('/admin/characters/new');
  for (const key of ['can_regift', 'can_retrade', 'can_resell']) {
    assert.equal(checkedPermission(page.text, key), null);
  }
});

async function postNewCharacter(agent, ids, fields, { withImage = true } = {}) {
  const token = await tokenFrom(agent, '/admin/characters/new');
  const req = agent.post('/admin/characters').field('_csrf', token);
  const base = {
    name: 'Nova', gender_id: String(ids.genderFemale), short_description: 'A star.',
    job_title: 'Navigator', terms_of_use: 'Ask first.', can_regift: '1', can_retrade: '0',
    can_resell: '0', tag_id: String(ids.tagCute), image_alt_text: 'Nova in orbit',
    ...fields,
  };
  for (const [k, v] of Object.entries(base)) req.field(k, v);
  if (withImage) req.attach('image', await pngBuffer(), 'nova.png');
  return req;
}

const countArtists = (db) => db.prepare('SELECT COUNT(*) n FROM artist').get().n;

test('the new-character form offers inline artist creation for designer and image artist', async (t) => {
  const { app } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get('/admin/characters/new');
  assert.equal((page.text.match(/<option value="new"/g) ?? []).length, 2);
  for (const name of ['new_designer_name', 'new_designer_website_url', 'new_image_artist_name', 'new_image_artist_website_url']) {
    assert.match(page.text, new RegExp(`name="${name}"`));
  }
});

test('a character is created with a new designer and a new image artist', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const before = countArtists(db);
  const res = await postNewCharacter(agent, ids, {
    artist_id: 'new', new_designer_name: 'Zed Designer', new_designer_website_url: 'https://zed.example/',
    image_artist_id: 'new', new_image_artist_name: 'Yara Ink',
  });
  assert.equal(res.status, 303, res.text.slice(0, 300));
  assert.equal(countArtists(db), before + 2);
  const row = db.prepare(`
    SELECT d.name AS designer, d.website_url AS site, a.name AS imageArtist, a.website_url AS imageSite
    FROM character c JOIN artist d ON d.id = c.artist_id
    JOIN image i ON i.id = c.avatar_image_id JOIN artist a ON a.id = i.artist_id
    WHERE c.name = 'Nova'`).get();
  assert.deepEqual({ ...row }, {
    designer: 'Zed Designer', site: 'https://zed.example/', imageArtist: 'Yara Ink', imageSite: null,
  });
});

test('the same new name for both selectors creates one artist', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const before = countArtists(db);
  const res = await postNewCharacter(agent, ids, {
    artist_id: 'new', new_designer_name: 'Solo Artist',
    image_artist_id: 'new', new_image_artist_name: '  solo   ARTIST ',
  });
  assert.equal(res.status, 303);
  assert.equal(countArtists(db), before + 1);
});

test('a new artist name matching an existing artist reuses it', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const before = countArtists(db);
  const res = await postNewCharacter(agent, ids, {
    artist_id: 'new', new_designer_name: ' dara designs ',
    image_artist_id: String(ids.artistA),
  });
  assert.equal(res.status, 303);
  assert.equal(countArtists(db), before);
  assert.equal(db.prepare("SELECT artist_id FROM character WHERE name = 'Nova'").get().artist_id, ids.designer);
});

test('invalid new-artist input names the field and keeps every value', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const before = countArtists(db);

  const noName = await postNewCharacter(agent, ids, {
    artist_id: 'new', new_designer_name: '', image_artist_id: String(ids.artistA),
  });
  assert.equal(noName.status, 422);
  assert.match(noName.text, /Enter the artist name\./);
  assert.match(noName.text, /value="Nova"/);
  assert.match(noName.text, /<option value="new" selected/);

  const badUrl = await postNewCharacter(agent, ids, {
    artist_id: String(ids.designer), image_artist_id: 'new',
    new_image_artist_name: 'Bad Link', new_image_artist_website_url: 'ftp://nope',
  });
  assert.equal(badUrl.status, 422);
  assert.match(badUrl.text, /Enter a full web address/);
  assert.match(badUrl.text, /value="Bad Link"/);
  assert.match(badUrl.text, /value="ftp:\/\/nope"/);

  assert.equal(countArtists(db), before);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM character WHERE name = 'Nova'").get().n, 0);
});

test('a failed creation leaves no new artist, character, or files', async (t) => {
  const { app, db, ids, config } = await withApp(t);
  const agent = await signIn(app);
  const before = { artists: countArtists(db), images: db.prepare('SELECT COUNT(*) n FROM image').get().n };
  const filesBefore = fs.readdirSync(config.uploadDir).length;
  db.exec(`
    CREATE TRIGGER reject_nova BEFORE INSERT ON character
    WHEN NEW.name = 'Nova'
    BEGIN SELECT RAISE(ABORT, 'forced test failure'); END
  `);
  const res = await postNewCharacter(agent, ids, {
    artist_id: 'new', new_designer_name: 'Ghost Designer',
    image_artist_id: 'new', new_image_artist_name: 'Ghost Ink',
  });
  assert.equal(res.status, 500);
  assert.equal(countArtists(db), before.artists);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM image').get().n, before.images);
  assert.equal(fs.readdirSync(config.uploadDir).length, filesBefore);

  const noImage = await postNewCharacter(agent, ids, {
    artist_id: 'new', new_designer_name: 'Ghost Designer 2', image_artist_id: String(ids.artistA),
  }, { withImage: false });
  assert.equal(noImage.status, 422);
  assert.equal(countArtists(db), before.artists);
});

test('the avatar picker warns that an NSFW avatar is public', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get(`/admin/characters/${ids.aria}/edit`);
  assert.match(page.text, /avatar-public-notice[^>]*>[^<]*visible to everyone/);
});

test('the edit form offers no new artist and edits never create artists', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get(`/admin/characters/${ids.aria}/edit`);
  assert.doesNotMatch(page.text, /Add a new artist/);
  assert.doesNotMatch(page.text, /new_designer_name/);

  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const before = countArtists(db);
  const res = await agent.post(`/admin/characters/${ids.aria}`).type('form').send({
    _csrf: token, name: 'Aria', gender_id: String(ids.genderFemale), short_description: 'x',
    job_title: 'Cartographer', terms_of_use: 'x', can_regift: '1', can_retrade: '0', can_resell: '0',
    artist_id: 'new', new_designer_name: 'Sneaky', tag_id: String(ids.tagCute),
    avatar_image_id: String(ids.imageSfwA),
  });
  assert.equal(res.status, 422);
  assert.match(res.text, /Choose an artist\./);
  assert.equal(countArtists(db), before);
});

test('avatar crop values persist per character and reject out-of-range values', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);
  const page = await agent.get(`/admin/characters/${ids.aria}/edit`);
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
  assert.match(page.text, /type="range" id="avatar_crop_x"/, 'crop position has a native control');
  assert.match(page.text, /data-crop-preview/, 'crop preview is present');
  const beforeImage = db.prepare('SELECT file_name FROM image WHERE id = ?').get(ids.imageSfwA).file_name;
  const fields = {
    _csrf: token, name: 'Aria', gender_id: String(ids.genderFemale),
    short_description: 'Aria short description', job_title: ['Cartographer', 'Archivist'],
    terms_of_use: 'Do not resell without permission.', can_regift: '1', can_retrade: '0',
    can_resell: '0', artist_id: String(ids.designer), tag_id: String(ids.tagCute),
    avatar_image_id: String(ids.imageSfwA), avatar_crop_x: '25', avatar_crop_y: '70',
    avatar_crop_zoom: '1.5',
  };
  const saved = await agent.post(`/admin/characters/${ids.aria}`).type('form').send(fields);
  assert.equal(saved.status, 303, `crop save should redirect, got ${saved.status}`);
  assert.deepEqual(
    { ...db.prepare('SELECT avatar_crop_x AS x, avatar_crop_y AS y, avatar_crop_zoom AS zoom FROM character WHERE id = ?')
      .get(ids.aria) },
    { x: 25, y: 70, zoom: 1.5 },
  );

  db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 1)')
    .run(ids.brann, ids.imageSfwA);
  const brannPage = await agent.get(`/admin/characters/${ids.brann}/edit`);
  const brannToken = brannPage.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const sharedImageCrop = await agent.post(`/admin/characters/${ids.brann}`).type('form').send({
    _csrf: brannToken,
    name: 'Brann',
    gender_id: String(ids.genderMale),
    short_description: 'Brann short description',
    terms_of_use: 'Do not resell without permission.',
    can_regift: '1',
    can_retrade: '0',
    can_resell: '0',
    artist_id: String(ids.designerNoSite),
    job_title: 'Blacksmith',
    tag_id: String(ids.tagFeral),
    avatar_image_id: String(ids.imageSfwA),
    avatar_crop_x: '80',
    avatar_crop_y: '10',
    avatar_crop_zoom: '2',
  });
  assert.equal(sharedImageCrop.status, 303);
  assert.deepEqual(
    { ...db.prepare('SELECT avatar_crop_x AS x, avatar_crop_y AS y, avatar_crop_zoom AS zoom FROM character WHERE id = ?')
      .get(ids.brann) },
    { x: 80, y: 10, zoom: 2 },
  );
  assert.equal(db.prepare('SELECT avatar_crop_x FROM character WHERE id = ?').get(ids.aria).avatar_crop_x, 25);

  const invalid = await agent.post(`/admin/characters/${ids.aria}`).type('form')
    .send({ ...fields, avatar_crop_x: '101' });
  assert.equal(invalid.status, 422);
  assert.equal(db.prepare('SELECT avatar_crop_x FROM character WHERE id = ?').get(ids.aria).avatar_crop_x, 25);
  assert.equal(db.prepare('SELECT file_name FROM image WHERE id = ?').get(ids.imageSfwA).file_name, beforeImage);
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

test('all character labels are tags and in-use tags cannot be deleted', async (t) => {
  const { app, db, ids } = await withApp(t);
  const agent = await signIn(app);

  const tagToken = await tokenFrom(agent, '/admin/tags');
  const tagRes = await agent.post(`/admin/tags/${ids.tagCute}/delete`).type('form')
    .send({ _csrf: tagToken, confirm: 'delete' });

  assert.equal(tagRes.status, 409, 'an in-use tag must be refused with 409');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(ids.tagCute).n, 1);

  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(ids.tagGreed).n, 1);
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
