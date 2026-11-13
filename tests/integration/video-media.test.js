import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import request from 'supertest';

import { NSFW_ON } from '../helpers/app.js';
import {
  csrfFrom, latestImage, mp4Buffer, uploadMedia, webmBuffer, withAdminApp,
} from '../helpers/media.js';

function storedFiles(config) {
  if (!fs.existsSync(config.uploadDir)) return [];
  return fs.readdirSync(config.uploadDir, { withFileTypes: true })
    .filter((e) => e.isFile()).map((e) => e.name);
}

test('MP4 and WebM uploads are accepted and stored without preview or dimensions', async (t) => {
  const ctx = await withAdminApp(t);

  for (const [buffer, name, mime] of [
    [mp4Buffer(), 'clip.mp4', 'video/mp4'],
    [webmBuffer(), 'clip.webm', 'video/webm'],
  ]) {
    const res = await uploadMedia(ctx, buffer, name, { contentType: mime });
    assert.equal(res.status, 303, `${name}: ${res.text.slice(0, 300)}`);

    const image = latestImage(ctx.db);
    assert.equal(image.mime_type, mime);
    assert.equal(image.preview_file_name, null);
    assert.equal(image.width, null);
    assert.equal(image.height, null);
    assert.ok(fs.existsSync(`${ctx.config.uploadDir}/${image.file_name}`));
  }
});

test('the type is decided by content, not by the declared type or the extension', async (t) => {
  const ctx = await withAdminApp(t);
  const before = storedFiles(ctx.config);

  const fake = await uploadMedia(ctx, Buffer.from('definitely not a video'.repeat(10)), 'fake.mp4',
    { contentType: 'video/mp4' });
  assert.equal(fake.status, 422);
  assert.match(fake.text, /MP4|WebM|video/i);

  // A real MP4 declared as something unsupported is still recognised by its bytes.
  const disguised = await uploadMedia(ctx, mp4Buffer(), 'clip.bin', { contentType: 'application/octet-stream' });
  assert.equal(disguised.status, 303);
  assert.equal(latestImage(ctx.db).mime_type, 'video/mp4');

  assert.equal(storedFiles(ctx.config).length, before.length + 1, 'the rejected upload left nothing behind');
  assert.equal(ctx.db.prepare("SELECT COUNT(*) n FROM image WHERE alt_text = 'A looping clip'").get().n, 1);
});

test('deleting a video removes its file', async (t) => {
  const ctx = await withAdminApp(t);
  await uploadMedia(ctx, mp4Buffer(), 'clip.mp4', { contentType: 'video/mp4' });
  const image = latestImage(ctx.db);
  const file = `${ctx.config.uploadDir}/${image.file_name}`;
  assert.ok(fs.existsSync(file));

  const token = await csrfFrom(ctx.agent, `/admin/images/${image.id}/edit`);
  const res = await ctx.agent.post(`/admin/images/${image.id}/delete`).type('form')
    .send({ _csrf: token, confirm: 'delete' });
  assert.equal(res.status, 303, res.text.slice(0, 300));
  assert.ok(!fs.existsSync(file));
  assert.equal(ctx.db.prepare('SELECT COUNT(*) n FROM image WHERE id = ?').get(image.id).n, 0);
});

test('video markup autoplays muted and looping in listings, with controls on the image page', async (t) => {
  const ctx = await withAdminApp(t);
  await uploadMedia(ctx, mp4Buffer(), 'clip.mp4', { alt: 'Brann waving', contentType: 'video/mp4' });
  const image = latestImage(ctx.db);

  for (const page of ['/characters/brann', '/artists']) {
    const html = (await request(ctx.app).get(page)).text;
    const video = html.match(new RegExp(`<video[^>]*src="/media/${image.id}"[^>]*>`));
    assert.ok(video, `${page} renders a video element`);
    for (const attr of ['autoplay', 'muted', 'loop', 'playsinline', 'preload="metadata"']) {
      assert.ok(video[0].includes(attr), `${page} video has ${attr}`);
    }
    assert.ok(!video[0].includes('controls'), 'listing videos have no controls');
    assert.ok(html.includes(`href="/images/${image.id}"`), 'still wrapped in the preview link');
    assert.ok(!html.includes(`/media/${image.id}/full`), 'listings never embed the full route');
    assert.ok(html.includes('Brann waving'));
  }

  const page = (await request(ctx.app).get(`/images/${image.id}`)).text;
  const video = page.match(/<video[^>]*>/)[0];
  assert.ok(video.includes(`src="/media/${image.id}/full"`));
  for (const attr of ['controls', 'autoplay', 'muted', 'loop', 'playsinline']) {
    assert.ok(video.includes(attr), `image page video has ${attr}`);
  }
  assert.match(page, /<video[\s\S]*<a[^>]*href="\/media\/\d+\/full"[^>]*download/i, 'fallback download link');
});

test('video bytes are served with Range support on both routes', async (t) => {
  const ctx = await withAdminApp(t);
  const clip = mp4Buffer(8192);
  await uploadMedia(ctx, clip, 'clip.mp4', { contentType: 'video/mp4' });
  const image = latestImage(ctx.db);

  for (const route of [`/media/${image.id}`, `/media/${image.id}/full`]) {
    const whole = await request(ctx.app).get(route).buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(whole.status, 200);
    assert.equal(whole.headers['content-type'], 'video/mp4');
    assert.equal(whole.headers['accept-ranges'], 'bytes');
    assert.ok(whole.body.equals(clip));

    const part = await request(ctx.app).get(route).set('Range', 'bytes=0-9');
    assert.equal(part.status, 206);
    assert.equal(part.headers['content-range'], `bytes 0-9/${clip.length}`);
  }
});

test('the video appears in artist grouping', async (t) => {
  const ctx = await withAdminApp(t);
  await uploadMedia(ctx, webmBuffer(), 'clip.webm', { contentType: 'video/webm' });
  const image = latestImage(ctx.db);
  const html = (await request(ctx.app).get('/artists')).text;
  assert.ok(html.includes(`/media/${image.id}"`));
});

test('a video cannot be an avatar and is skipped when choosing one', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids, db, agent } = ctx;

  await uploadMedia(ctx, mp4Buffer(), 'clip.mp4', { characterId: ids.brann, contentType: 'video/mp4' });
  const video = latestImage(db);

  const token = await csrfFrom(agent, `/admin/characters/${ids.brann}/edit`);
  const page = await agent.get(`/admin/characters/${ids.brann}/edit`);
  assert.ok(!new RegExp(`<option value="${video.id}"[^>]*data-preview-src`).test(page.text),
    'the avatar picker does not offer videos');

  const body = {
    _csrf: token,
    name: 'Brann',
    gender_id: String(ids.genderMale),
    short_description: 'Brann short description',
    terms_of_use: 'Terms',
    can_regift: '1', can_retrade: '0', can_resell: '0',
    artist_id: String(ids.designerNoSite),
    job_title: 'Guard',
    tag_id: String(ids.tagCute),
    avatar_image_id: String(video.id),
  };
  const refused = await agent.post(`/admin/characters/${ids.brann}`).type('form').send(body);
  assert.equal(refused.status, 422);
  assert.match(refused.text, /still image|video/i);
  assert.notEqual(
    db.prepare('SELECT avatar_image_id a FROM character WHERE id = ?').get(ids.brann).a, video.id);

  // Without an avatar choice the first still image is kept, never the video.
  delete body.avatar_image_id;
  const ok = await agent.post(`/admin/characters/${ids.brann}`).type('form').send(body);
  assert.equal(ok.status, 303, ok.text.slice(0, 300));
  assert.equal(
    db.prepare('SELECT avatar_image_id a FROM character WHERE id = ?').get(ids.brann).a, ids.imageSfwB);
});

test('a character whose only image is a video shows the placeholder avatar', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids, agent, db } = ctx;
  const token = await csrfFrom(agent, '/admin/characters/new');

  const res = await agent.post('/admin/characters')
    .field('_csrf', token)
    .field('name', 'Reel')
    .field('gender_id', String(ids.genderFemale))
    .field('short_description', 'Only a clip.')
    .field('job_title', 'Actor')
    .field('terms_of_use', 'Ask first.')
    .field('can_regift', '1').field('can_retrade', '0').field('can_resell', '0')
    .field('artist_id', String(ids.designer))
    .field('tag_id', String(ids.tagCute))
    .field('image_alt_text', 'Reel on screen')
    .field('image_artist_id', String(ids.artistA))
    .attach('image', mp4Buffer(), { filename: 'reel.mp4', contentType: 'video/mp4' });
  assert.equal(res.status, 303, res.text.slice(0, 400));

  const reel = db.prepare("SELECT id, slug, avatar_image_id a FROM character WHERE name = 'Reel'").get();
  assert.equal(reel.a, null);
  const gallery = (await request(ctx.app).get('/')).text;
  assert.ok(gallery.includes('No image available for Reel'));

  const page = await request(ctx.app).get(`/characters/${reel.slug}`);
  assert.equal(page.status, 200);
  assert.ok(page.text.includes('<video'), 'the clip still appears in the character gallery');
});

test('an NSFW video is not found without opt-in, by any route, even with a Range header', async (t) => {
  const ctx = await withAdminApp(t);
  await uploadMedia(ctx, mp4Buffer(), 'secret.mp4', { nsfw: true, contentType: 'video/mp4' });
  const image = latestImage(ctx.db);

  const baseline = await request(ctx.app).get('/media/999999');
  for (const route of [`/media/${image.id}`, `/media/${image.id}/full`, `/images/${image.id}`]) {
    for (const range of [null, 'bytes=0-9']) {
      const req = request(ctx.app).get(route);
      if (range) req.set('Range', range);
      const res = await req;
      assert.equal(res.status, 404, `${route} (${range}) must be hidden`);
      assert.ok(!res.headers['content-range'] && !res.headers['accept-ranges']);
    }
  }
  assert.equal(baseline.status, 404);

  const listing = (await request(ctx.app).get('/characters/brann')).text;
  assert.ok(!listing.includes(`/media/${image.id}`));

  for (const route of [`/media/${image.id}`, `/media/${image.id}/full`]) {
    const res = await request(ctx.app).get(route).set('Cookie', NSFW_ON).set('Range', 'bytes=0-9');
    assert.equal(res.status, 206);
    assert.equal(res.headers['cache-control'], 'private, no-store');
  }
  const page = await request(ctx.app).get(`/images/${image.id}`).set('Cookie', NSFW_ON);
  assert.equal(page.status, 200);
});
