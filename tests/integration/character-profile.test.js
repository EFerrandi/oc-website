import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

/**
 * User Story 8 — the character page as a profile: avatar top-left beside the
 * basic information, then the images, then the stories, with each story read
 * in place rather than behind a link.
 *
 * The rating assertions come first and are not negotiable: moving a story's
 * BODY onto the character page is exactly the change that could leak an NSFW
 * story to a visitor who has not opted in, because the body was previously
 * only ever fetched on /stories/:slug, which gates it.
 */

function withApp(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

const profile = (app, { nsfw = false } = {}) => {
  const req = request(app).get('/characters/aria');
  return nsfw ? req.set('Cookie', NSFW_ON) : req;
};

// T057 — FR-042, SC-015, Constitution I.
test('a non-viewable story contributes neither its title nor any of its body', async (t) => {
  const { app } = withApp(t);

  const res = await profile(app);
  assert.equal(res.status, 200);

  assert.ok(!res.text.includes('After Hours'), 'the NSFW story title leaked');
  assert.ok(
    !res.text.includes('Explicit story body for gating tests.'),
    'the NSFW story body leaked — this is the risk inherent in showing bodies inline',
  );

  // Fragments, not just the whole string: a truncated preview would leak too.
  for (const fragment of ['Explicit story body', 'gating tests']) {
    assert.ok(!res.text.includes(fragment), `a fragment of the NSFW story body leaked: ${fragment}`);
  }

  // The converse, so the assertions above cannot pass on a page that is broken.
  const opted = await profile(app, { nsfw: true });
  assert.ok(opted.text.includes('After Hours'), 'the NSFW story stayed hidden after opt-in');
  assert.ok(
    opted.text.includes('Explicit story body for gating tests.'),
    'the NSFW story body is still not readable in place after opt-in',
  );
});

// T058 — FR-039, FR-011.
test('the avatar is a gated preview and the full-size route is never linked', async (t) => {
  const { app, ids } = withApp(t);

  const res = await profile(app);

  const avatar = res.text.match(/<img[^>]*class="[^"]*profile-avatar-image[^"]*"[^>]*>/);
  assert.ok(avatar, 'the profile renders no avatar');
  assert.match(
    avatar[0],
    /src="(?:\/media\/\d+|\/img\/placeholder-avatar\.svg)"/,
    `avatar must be a gated preview or the placeholder: ${avatar[0]}`,
  );
  assert.match(avatar[0], /alt="[^"]+"/, 'the avatar needs meaningful alternative text');

  assert.ok(!res.text.includes(`/media/${ids.imageSfwA}/full`), 'the full-size route was linked');

  // Shadow's only image is NSFW, so before opt-in they fall back to the
  // placeholder rather than disappearing or rendering a broken image.
  const shadow = await request(app).get('/characters/shadow');
  assert.equal(shadow.status, 200, 'a character whose every image is NSFW must still have a page');
  assert.match(
    shadow.text.match(/<img[^>]*class="[^"]*profile-avatar-image[^"]*"[^>]*>/)[0],
    /src="\/img\/placeholder-avatar\.svg"/,
    'a character with no viewable image must fall back to the placeholder',
  );
});

// T059 — FR-040: the reading order the clarification asked for.
test('the profile reads header, then images, then stories', async (t) => {
  const { app } = withApp(t);

  const html = (await profile(app)).text;

  const header = html.indexOf('class="profile-header"');
  const images = html.indexOf('class="profile-images"');
  const stories = html.indexOf('class="profile-stories"');

  assert.ok(header !== -1, 'no .profile-header');
  assert.ok(images !== -1, 'no .profile-images');
  assert.ok(stories !== -1, 'no .profile-stories');

  assert.ok(header < images, 'the header must come before the image gallery');
  assert.ok(images < stories, 'the image gallery must come before the stories');

  // The avatar belongs at the start of the header, not after the summary.
  const avatar = html.indexOf('class="profile-avatar"');
  const summary = html.indexOf('class="profile-summary"');
  assert.ok(header < avatar && avatar < summary, 'the avatar must lead the header, with the summary beside it');
});

test('personality and physical descriptions appear before relationships as escaped paragraphs', async (t) => {
  const { app, db, ids } = withApp(t);
  db.prepare('UPDATE character SET personality = ?, physical_description = ? WHERE id = ?')
    .run('Curious <script>alert(1)</script>.\n\nKind and thoughtful.', 'Tall.\n\nSilver-haired.', ids.aria);

  const html = (await profile(app)).text;
  const relationships = html.indexOf('class="profile-relationships"');
  const personality = html.indexOf('class="profile-personality"');
  const physical = html.indexOf('class="profile-physical-description"');
  const stories = html.indexOf('class="profile-stories"');

  assert.ok(personality < physical && physical < relationships, 'Personality then Physical Description precede Relationships');
  assert.ok(relationships < stories, 'Relationships remain before Stories');
  assert.match(html, /Curious &lt;script&gt;alert\(1\)&lt;\/script&gt;\./);
  assert.match(html, /<p>Kind and thoughtful\.<\/p>/);
  assert.match(html, /<p>Silver-haired\.<\/p>/);
});

test('CRLF line endings in descriptions preserve paragraph breaks', async (t) => {
  const { app, db, ids } = withApp(t);
  db.prepare('UPDATE character SET personality = ? WHERE id = ?')
    .run('First thought.\r\n\r\nSecond thought.', ids.aria);

  const html = (await profile(app)).text;
  assert.match(html, /<p>First thought\.<\/p>\s*<p>Second thought\.<\/p>/);
});

test('profile text preserves mixed line endings in descriptions, stories, and terms of use', async (t) => {
  const password = 'correct-horse-battery-staple';
  const ctx = createTestApp({ adminPasswordHash: await hashPassword(password) });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  const { app, db } = ctx;
  db.prepare('UPDATE character SET personality = ?, physical_description = ?, terms_of_use = ? WHERE id = ?')
    .run(
      'First thought.\r\nSecond <script>alert(1)</script>.\n \t \nThird thought.\rFourth thought.',
      'First detail.\r\nSecond detail.\n \t \nThird detail.\rFourth detail.',
      'First term.\r\nSecond term.\rThird <script>alert(1)</script>.',
      ids.aria,
    );
  db.prepare('UPDATE story SET body = ? WHERE id = ?')
    .run('First story line.\r\nSecond <script>alert(1)</script>.\n \t \nThird line.\rFourth line.', ids.storySfw);

  const agent = request.agent(app);
  const login = await agent.get('/admin/login');
  const token = login.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
  assert.ok(token, 'admin login form provides a CSRF token');
  const authenticated = await agent.post('/admin/login').type('form').send({ _csrf: token, password });
  assert.equal(authenticated.status, 303, 'admin login succeeds');

  const html = (await agent.get('/characters/aria')).text;
  assert.match(html, /First thought\.<br>Second &lt;script&gt;alert\(1\)&lt;\/script&gt;\.<\/p>\s*<p>Third thought\.<br>Fourth thought\.<\/p>/);
  assert.match(html, /First detail\.<br>Second detail\.<\/p>\s*<p>Third detail\.<br>Fourth detail\.<\/p>/);
  assert.match(html, /First story line\.<br>Second &lt;script&gt;alert\(1\)&lt;\/script&gt;\.<\/p>\s*<p>Third line\.<br>Fourth line\.<\/p>/);
  assert.match(html, /<p class="terms">First term\.<br>Second term\.<br>Third &lt;script&gt;alert\(1\)&lt;\/script&gt;\.<\/p>/);

  db.prepare('UPDATE character SET terms_of_use = ? WHERE id = ?').run(' \r\n\t ', ids.aria);
  const whitespaceTerms = (await agent.get('/characters/aria')).text;
  assert.doesNotMatch(whitespaceTerms, /class="ownership-block"/);
});

test('whitespace-only profile text does not produce empty content', async (t) => {
  const { app, db, ids } = withApp(t);
  db.prepare('UPDATE character SET personality = ?, physical_description = ? WHERE id = ?')
    .run(' \r\n \t ', '\n \r ', ids.aria);
  db.prepare('UPDATE story SET body = ? WHERE id = ?').run(' \r\n \t ', ids.storySfw);

  const html = (await profile(app)).text;
  assert.doesNotMatch(html, /class="profile-personality"/);
  assert.doesNotMatch(html, /class="profile-physical-description"/);
  assert.doesNotMatch(html, /class="ownership-block"/);
  assert.doesNotMatch(html, /<div class="story-body">\s*<p>/);
});

test('empty character descriptions produce no public profile sections', async (t) => {
  const { app, db, ids } = withApp(t);
  db.prepare('UPDATE character SET personality = NULL, physical_description = NULL WHERE id = ?').run(ids.aria);
  const html = (await profile(app)).text;
  assert.doesNotMatch(html, /class="profile-personality"/);
  assert.doesNotMatch(html, /class="profile-physical-description"/);
});

test('personality and physical descriptions use story text width and paragraph spacing', async () => {
  const css = await readFile(new URL('../../src/public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.story-body,\s*\.profile-personality,\s*\.profile-physical-description\s*\{[^}]*max-width:\s*75ch/s);
  assert.match(css, /\.story-body p,\s*\.profile-personality p,\s*\.profile-physical-description p\s*\{[^}]*margin:\s*0 0 0\.75rem/s);
  assert.match(css, /\.story-body p,\s*\.profile-personality p,\s*\.profile-physical-description p\s*\{[^}]*max-width:\s*70ch/s);
});

// T060 — FR-041, FR-041a, FR-041b, SC-014.
test('each story is readable in place, collapsed, without following a link', async (t) => {
  const { app } = withApp(t);

  const html = (await profile(app)).text;

  const details = [...html.matchAll(/<details class="story"[\s\S]*?<\/details>/g)].map((m) => m[0]);
  assert.equal(details.length, 1, 'the one viewable story should render as a <details>');

  const story = details[0];
  assert.match(story, /<summary[\s\S]*?A Quiet Morning[\s\S]*?<\/summary>/, 'the title belongs in the summary');
  assert.ok(story.includes('The sun rose over the meadow.'), 'the full body must be on the page itself');

  // FR-041b: collapsed by default, expanding in place.
  assert.ok(!/<details class="story"[^>]*\bopen\b/.test(story), 'stories start collapsed');

  // The route still exists and is still linked (FR-032), but reading must not
  // require it — the body is already here.
  const bodyIndex = html.indexOf('The sun rose over the meadow.');
  const linkIndex = html.indexOf('href="/stories/');
  assert.ok(bodyIndex !== -1 && (linkIndex === -1 || bodyIndex < linkIndex || linkIndex < bodyIndex),
    'the body must be present regardless of the link');
});

// T061 — FR-038: nothing that used to be on the page was lost.
test('the public summary carries tags but never exposes ownership details', async (t) => {
  const { app } = withApp(t);

  const html = (await profile(app)).text;
  const start = html.indexOf('class="profile-summary"');
  assert.notEqual(start, -1, 'no .profile-summary');

  const summary = html.slice(start, html.indexOf('class="profile-images"'));

  const expected = {
    name: 'Aria',
    gender: 'Female',
    'first job title': 'Cartographer',
    'second job title': 'Archivist',
    tag: 'cute',
    reusedTag: 'Patience',
  };

  for (const [what, value] of Object.entries(expected)) {
    assert.ok(summary.includes(value), `the summary lost the ${what} (${value})`);
  }

  assert.ok(!html.includes('Do not resell without permission.'));
  assert.ok(!html.includes('Can be regifted'));
  assert.ok(!html.includes('Ownership'));
  assert.ok(html.indexOf('profile-relationships') < html.indexOf('profile-stories'));
});
