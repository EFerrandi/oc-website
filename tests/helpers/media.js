import assert from 'node:assert/strict';

import request from 'supertest';
import sharp from 'sharp';

import { createTestApp } from './app.js';
import { seedFixtures } from './fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

export const PASSWORD = 'correct-horse-battery-staple';

/** Minimal buffers that carry the real container signatures. */
export function mp4Buffer(size = 4096) {
  const head = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypmp42')]);
  return Buffer.concat([head, Buffer.alloc(size - head.length, 7)]);
}

export function webmBuffer(size = 4096) {
  const head = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
  return Buffer.concat([head, Buffer.alloc(size - head.length, 9)]);
}

/** A looping three-frame animated GIF. */
export async function animatedGifBuffer({ width = 32, height = 32, frames = 3 } = {}) {
  const parts = [];
  for (let i = 0; i < frames; i += 1) {
    parts.push(await sharp({
      create: { width, height, channels: 3, background: { r: i * 80, g: 40, b: 120 } },
    }).png().toBuffer());
  }
  return sharp(parts, { join: { animated: true } })
    .gif({ loop: 0, delay: new Array(frames).fill(100) })
    .toBuffer();
}

export async function withAdminApp(t) {
  const hash = await hashPassword(PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());

  const agent = request.agent(ctx.app);
  const form = await agent.get('/admin/login');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const res = await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });
  assert.equal(res.status, 303, 'sign-in should succeed');

  return { ...ctx, ids, agent };
}

export async function csrfFrom(agent, path) {
  const page = await agent.get(path);
  const match = page.text.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, `no CSRF token on ${path}`);
  return match[1];
}

/** Upload through the real admin form; returns the supertest response. */
export async function uploadMedia({ agent, ids }, buffer, filename, {
  alt = 'A looping clip', nsfw = false, characterId, contentType,
} = {}) {
  const token = await csrfFrom(agent, '/admin/images/new');
  const req = agent
    .post('/admin/images')
    .field('_csrf', token)
    .field('alt_text', alt)
    .field('artist_id', String(ids.artistA))
    .field('character_id', String(characterId ?? ids.brann));
  if (nsfw) req.field('is_nsfw', '1');
  return req.attach('image', buffer, { filename, contentType });
}

export function latestImage(db) {
  return db.prepare('SELECT * FROM image ORDER BY id DESC LIMIT 1').get();
}
