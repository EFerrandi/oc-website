import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import request from 'supertest';
import sharp from 'sharp';

import {
  animatedGifBuffer, latestImage, uploadMedia, withAdminApp,
} from '../helpers/media.js';

test('an animated GIF gets a looping multi-frame preview and an untouched original', async (t) => {
  const ctx = await withAdminApp(t);
  const gif = await animatedGifBuffer({ width: 1200, height: 1200, frames: 3 });

  const res = await uploadMedia(ctx, gif, 'dance.gif', { alt: 'Dancing Brann' });
  assert.equal(res.status, 303, res.text.slice(0, 300));

  const image = latestImage(ctx.db);
  assert.equal(image.mime_type, 'image/gif');

  const preview = await sharp(path.join(ctx.config.previewDir, image.preview_file_name), { animated: true }).metadata();
  assert.equal(preview.pages, 3, 'every frame survives into the preview');
  assert.equal(preview.loop, 0, 'the preview loops forever');
  assert.ok(preview.width <= 800, 'the preview is genuinely reduced');

  const full = await request(ctx.app).get(`/media/${image.id}/full`);
  assert.equal(full.status, 200);
  assert.equal(full.headers['content-type'], 'image/gif');
  assert.ok(Buffer.from(full.body).equals(gif), 'the original GIF is served byte for byte');

  const previewRes = await request(ctx.app).get(`/media/${image.id}`);
  assert.equal(previewRes.headers['content-type'], 'image/webp');
});

test('a GIF is shown with ordinary image markup wherever images appear', async (t) => {
  const ctx = await withAdminApp(t);
  const res = await uploadMedia(ctx, await animatedGifBuffer(), 'dance.gif', { alt: 'Dancing Brann' });
  assert.equal(res.status, 303);
  const image = latestImage(ctx.db);

  for (const page of ['/characters/brann', '/artists']) {
    const html = (await request(ctx.app).get(page)).text;
    assert.ok(html.includes(`src="/media/${image.id}"`), `${page} shows the GIF preview`);
    assert.ok(!html.includes('<video'), `${page} does not render the GIF as a video`);
  }

  const standalone = (await request(ctx.app).get(`/images/${image.id}`)).text;
  assert.ok(standalone.includes(`/media/${image.id}/full`));
  assert.ok(!standalone.includes('<video'), 'a GIF is not rendered as a video');
});

test('a static GIF still uploads and previews normally', async (t) => {
  const ctx = await withAdminApp(t);
  const still = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#336699' } }).gif().toBuffer();

  const res = await uploadMedia(ctx, still, 'still.gif');
  assert.equal(res.status, 303);
  const image = latestImage(ctx.db);
  assert.ok(fs.existsSync(path.join(ctx.config.previewDir, image.preview_file_name)));
});
