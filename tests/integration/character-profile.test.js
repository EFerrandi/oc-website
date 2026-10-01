import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

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
test('the summary still carries every piece of basic information', async (t) => {
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
    trait: 'Patience',
    designer: 'Dara Designs',
  };

  for (const [what, value] of Object.entries(expected)) {
    assert.ok(summary.includes(value), `the summary lost the ${what} (${value})`);
  }

  assert.match(summary, /Terms of use/i, 'the summary lost the terms of use');

  for (const permission of ['regift', 'retrade', 'resell']) {
    assert.match(summary, new RegExp(permission, 'i'), `the summary lost the ${permission} permission`);
  }
});
