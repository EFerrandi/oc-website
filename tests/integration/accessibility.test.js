import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.resolve(here, '../../src/public/css/main.css');
const css = fs.readFileSync(cssPath, 'utf8');

const PASSWORD = 'correct-horse-battery-staple';

const PUBLIC_PAGES = ['/', '/artists', '/relationships', '/characters/aria', '/stories/a-quiet-morning'];

function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

test('every page declares a responsive viewport', async (t) => {
  const { app } = setup(t);

  for (const page of PUBLIC_PAGES) {
    const res = await request(app).get(page);
    assert.equal(res.status, 200, `${page} renders`);
    assert.match(
      res.text,
      /<meta name="viewport" content="width=device-width, initial-scale=1">/,
      `${page} must declare a responsive viewport or it will render zoomed out on phones`,
    );
    assert.match(res.text, /<html lang="[a-z-]+"/, `${page} declares a language`);
  }
});

test('the stylesheet cannot force horizontal scrolling', () => {
  // Fixed pixel widths wider than a 360px phone are the usual culprit.
  const widths = [...css.matchAll(/(?<!max-|min-)width:\s*(\d+)px/g)].map((m) => Number(m[1]));

  for (const width of widths) {
    assert.ok(width <= 360, `a fixed width of ${width}px would overflow a 360px screen`);
  }

  assert.ok(css.includes('max-width: 100%'), 'images are constrained to their container');
  assert.ok(css.includes('overflow-wrap: break-word'), 'long URLs wrap instead of overflowing');

  // Grid columns must be fluid, not a fixed count.
  const gridColumns = [...css.matchAll(/grid-template-columns:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(gridColumns.length > 0, 'the gallery uses a grid');

  for (const value of gridColumns) {
    assert.ok(
      value.includes('auto-fill') || value.includes('auto-fit') || value.includes('1fr'),
      `grid columns must adapt to the viewport, got "${value}"`,
    );
  }
});

test('anything that can overflow is allowed to scroll within itself', () => {
  // A wide table must scroll inside its own box rather than pushing the page.
  assert.match(css, /overflow-x:\s*auto/, 'wide content scrolls within its container');
});

test('keyboard focus is always visible', () => {
  assert.match(css, /:focus-visible/, 'a focus indicator is defined');
  assert.match(
    css.slice(css.indexOf(':focus-visible')),
    /outline:\s*\d+px/,
    'the focus indicator is an outline with real thickness',
  );

  // Removing the outline without replacing it is the classic accessibility bug.
  const suppressions = [...css.matchAll(/outline:\s*(none|0)\s*;/g)];
  assert.equal(suppressions.length, 0, 'the focus outline must never be removed outright');
});

test('interactive controls are real, focusable elements', async (t) => {
  const { app } = setup(t);

  for (const page of PUBLIC_PAGES) {
    const res = await request(app).get(page);

    // A div with a click handler is not keyboard reachable; links and buttons are.
    assert.ok(
      !/<div[^>]+onclick/i.test(res.text),
      `${page} must not use a div as a button`,
    );
    assert.ok(
      !/href="javascript:/i.test(res.text),
      `${page} must not use javascript: links`,
    );
    assert.ok(
      !/href="#"/.test(res.text),
      `${page} must not use "#" as a link target`,
    );
  }
});

test('external credit links open in a new tab safely', async (t) => {
  const { app } = setup(t);

  const res = await request(app).get('/artists');
  const external = [...res.text.matchAll(/<a[^>]+href="https?:\/\/[^"]+"[^>]*>/g)].map((m) => m[0]);

  assert.ok(external.length > 0, 'the artists page links out');

  for (const anchor of external) {
    assert.match(anchor, /target="_blank"/, `external link must open in a new tab: ${anchor}`);
    assert.match(
      anchor, /rel="[^"]*noopener/,
      `external link must set rel="noopener" so the new tab cannot reach back: ${anchor}`,
    );
  }
});

test('the NSFW toggle works without JavaScript', async (t) => {
  const { app } = setup(t);

  const res = await request(app).get('/');

  // It must be a real form post, not a checkbox wired up only in script.
  assert.match(res.text, /<form[^>]+class="nsfw-form"[^>]+method="post"/, 'the toggle is a real form');
  assert.match(res.text, /action="\/preferences\/nsfw"/, 'it posts to a real endpoint');
  assert.match(res.text, /<button[^>]*>/, 'a submit control exists for visitors without JavaScript');
});

test('admin screens are responsive too', async (t) => {
  const hash = await hashPassword(PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());

  const agent = request.agent(ctx.app);
  const form = await agent.get('/admin/login');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];
  await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });

  for (const page of ['/admin', '/admin/characters', '/admin/characters/new', '/admin/tags']) {
    const res = await agent.get(page);
    assert.equal(res.status, 200);
    assert.match(
      res.text, /<meta name="viewport" content="width=device-width, initial-scale=1">/,
      `${page} must be usable on a phone too`,
    );
  }
});

test('form fields are labelled', async (t) => {
  const { app } = setup(t);

  const res = await request(app).get('/').set('Cookie', NSFW_ON);

  const inputs = [...res.text.matchAll(/<input[^>]*>/g)].map((m) => m[0])
    .filter((tag) => !/type="(hidden|submit)"/.test(tag));

  for (const input of inputs) {
    const id = input.match(/\sid="([^"]+)"/);
    const wrapped = /class="inline"/.test(res.text);

    assert.ok(
      (id && res.text.includes(`for="${id[1]}"`)) || wrapped,
      `input needs a label: ${input}`,
    );
  }
});
