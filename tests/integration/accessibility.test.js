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

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[a-f\d]{2}/gi).map((channel) => parseInt(channel, 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

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
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fill/, 'gallery columns adapt to available width');
  assert.doesNotMatch(
    css,
    /(?:html|body)\s*\{[^}]*overflow-x:\s*hidden/s,
    'page-level clipping must not conceal overflow',
  );
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

  const characterForm = await agent.get('/admin/characters/new');
  const controls = [...characterForm.text.matchAll(/<(input|select|textarea)\b[^>]*>/g)]
    .filter((match) => !/<input\b[^>]*type="hidden"/.test(match[0]));
  for (const control of controls) {
    const id = control[0].match(/\sid="([^"]+)"/)?.[1];
    const hasExplicitLabel = id && characterForm.text.includes(`for="${id}"`);
    const labelStart = characterForm.text.lastIndexOf('<label', control.index);
    const labelEnd = characterForm.text.lastIndexOf('</label>', control.index);

    assert.ok(
      hasExplicitLabel || labelStart > labelEnd,
      `admin form control needs an associated label: ${control[0]}`,
    );
  }
  assert.match(css, /\.field-errors\s*\{|ul\.field-errors\s*\{/, 'admin validation feedback keeps a dedicated style');
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*\d+px/s, 'admin controls retain visible keyboard focus');

  const formToken = characterForm.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(formToken, 'the admin form provides its CSRF token');
  const invalid = await agent.post('/admin/characters').type('form').send({ _csrf: formToken });
  assert.equal(invalid.status, 422, 'invalid admin input renders its validation state');
  assert.match(invalid.text, /class="field-errors"/, 'validation feedback remains visible in the response');
});

test('form fields are labelled', async (t) => {
  const { app } = setup(t);

  const res = await request(app).get('/').set('Cookie', NSFW_ON);

  const controls = [...res.text.matchAll(/<(input|select|textarea)\b[^>]*>/g)]
    .filter((match) => !/<input\b[^>]*type="(?:hidden|submit)"/.test(match[0]));

  for (const control of controls) {
    const id = control[0].match(/\sid="([^"]+)"/)?.[1];
    const hasExplicitLabel = id && res.text.includes(`for="${id}"`);
    const labelStart = res.text.lastIndexOf('<label', control.index);
    const labelEnd = res.text.lastIndexOf('</label>', control.index);

    assert.ok(
      hasExplicitLabel || labelStart > labelEnd,
      `form control needs an associated label: ${control[0]}`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * US7 � the visual refresh must not cost any accessibility.
 * ------------------------------------------------------------------ */

// T084 � FR-036, SC-013.
test('every page still exposes its landmarks, headings and alternative text', async (t) => {
  const { app, ids } = setup(t);

  for (const page of [
    '/',
    '/characters/aria',
    '/images/' + ids.imageSfwA,
    '/stories/a-quiet-morning',
    '/relationships',
    '/artists',
  ]) {
    const res = await request(app).get(page);
    assert.equal(res.status, 200, `${page} should render`);

    assert.ok(res.text.includes('<header'), `${page} lost its banner landmark`);
    assert.ok(res.text.includes('<nav'), `${page} lost its navigation landmark`);
    assert.ok(res.text.includes('<main'), `${page} lost its main landmark`);
    assert.ok(res.text.includes('<footer'), `${page} lost its footer landmark`);

    const h1 = res.text.match(/<h1[\s>]/g) ?? [];
    assert.equal(h1.length, 1, `${page} must have exactly one <h1>, found ${h1.length}`);

    for (const img of res.text.match(/<img\b[^>]*>/g) ?? []) {
      assert.match(img, /\salt="/, `${page} has an image with no alt attribute: ${img}`);
    }

    // SVG content needs an accessible name of its own; alt does not apply.
    for (const svg of res.text.match(/<svg\b[^>]*>/g) ?? []) {
      assert.match(
        svg,
        /aria-labelledby=|aria-label=|aria-hidden="true"/,
        `${page} has an svg with no accessible name and no way to ignore it: ${svg}`,
      );
    }
  }
});

// T085 � FR-021a.
test('the visually-hidden utility clips rather than hiding', () => {
  assert.match(css, /\.visually-hidden\s*\{/, 'no .visually-hidden utility is defined');

  const rule = css.slice(css.indexOf('.visually-hidden'), css.indexOf('}', css.indexOf('.visually-hidden')));

  // display:none and visibility:hidden remove an element from the
  // accessibility tree as well as from the screen, which would silently delete
  // the relationship map's text equivalent for exactly the people who need it.
  assert.ok(!/display:\s*none/.test(rule), 'display:none hides the text from screen readers too');
  assert.ok(!/visibility:\s*hidden/.test(rule), 'visibility:hidden hides the text from screen readers too');
  assert.match(rule, /clip-path:|clip:/, 'the utility must clip the element rather than hide it');
});

// T004 — feature 003: lock in the selected palette before applying it.
test('the shared stylesheet declares the selected purple palette', () => {
  const root = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  const token = (name) => root.match(new RegExp(`${name}:\\s*(#[a-f\\d]{6})`, 'i'))?.[1];

  for (const color of ['#DD92FB', '#8D79FF', '#3E4EB4']) {
    assert.ok(
      root.toLowerCase().includes(color.toLowerCase()),
      `the shared :root token block must declare ${color}`,
    );
  }

  const surface = token('--surface-2');
  assert.ok(contrastRatio(token('--brand-light'), surface) >= 4.5, 'body-size accent text meets AA contrast');
  assert.ok(contrastRatio(token('--accent-ink'), token('--brand-medium')) >= 4.5, 'button labels meet AA contrast');
  assert.ok(contrastRatio(token('--brand-medium'), surface) >= 3, 'focus and map strokes meet non-text contrast');
  assert.ok(contrastRatio(token('--border-strong'), surface) >= 3, 'interactive control boundaries meet non-text contrast');

  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*\d+px/s, 'the palette refresh must keep a visible focus ring');
  assert.match(css, /overflow-wrap:\s*break-word/, 'long names and URLs must continue to wrap');

  const hiddenRule = css.match(/\.visually-hidden\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(hiddenRule, /clip-path:|clip:/, 'visually hidden text must remain in the accessibility tree');
  assert.doesNotMatch(hiddenRule, /display:\s*none/, 'the text equivalent must not be removed from the accessibility tree');
});

// Feature 004: home gallery presentation guarantees.
test('the home gallery grid, tiles and filter bar stay responsive and focusable', () => {
  assert.match(css, /\.character-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill/s, 'the tile grid is fluid');
  assert.match(css, /\.character-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s, 'at least two columns on narrow screens');
  assert.match(css, /\.character-tile \.card-thumb\s*\{[^}]*aspect-ratio:\s*1 \/ 1[^}]*object-fit:\s*cover/s, 'square cover-cropped thumbnails');
  assert.match(css, /\.character-tile a:focus-visible/, 'tiles show a visible focus state');
  assert.match(css, /\.filter-bar summary:focus-visible/, 'disclosure summaries show visible focus');
  assert.match(css, /\.active-filter:focus-visible/, 'removable chips show visible focus');
  assert.match(css, /\.filter-bar[^{]*\{[^}]*flex-wrap:\s*wrap/s, 'the filter bar wraps rather than scrolling');
  assert.match(css, /prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.character-tile/s, 'tile motion respects reduced motion');
});
