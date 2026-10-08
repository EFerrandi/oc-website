import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function withApp(t) {
  const ctx = createTestApp();
  seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return ctx;
}

test('GET / lists every character with name and all job titles', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/');

  assert.equal(res.status, 200);
  for (const name of ['Aria', 'Brann', 'Shadow']) {
    assert.ok(res.text.includes(name), `${name} should be listed`);
  }
  // Both of Aria's job titles must show, not just the first (FR-002).
  assert.ok(res.text.includes('Cartographer'), 'first job title');
  assert.ok(res.text.includes('Archivist'), 'second job title');
});

test('GET / renders the NSFW checkbox and the admin entry point', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/');

  assert.ok(res.text.includes('name="nsfw"'), 'NSFW checkbox present');
  assert.ok(res.text.includes('/admin/login'), 'admin sign-in entry point present');
});

test('GET / offers facets drawn only from the visible character set', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/');

  assert.ok(res.text.includes('cute'), 'tag facet present');
  assert.ok(res.text.includes('Female'), 'gender facet present');
});

test('filters combine with AND, not OR', async (t) => {
  const { app } = withApp(t);

  // Shadow carries both tags; Aria carries only "cute"; Brann only "feral".
  const res = await request(app).get('/?tag=cute&tag=feral');
  assert.equal(res.status, 200);

  assert.ok(res.text.includes('Shadow'), 'character with both tags matches');
  assert.ok(!res.text.includes('>Aria<'), 'character with only one of the tags must not match');
});

test('an unmatched filter yields an empty state, not an error', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/?tag=nonexistent-tag');

  assert.equal(res.status, 200, 'unknown filter values are ignored rather than erroring');
  assert.ok(res.text.includes('No characters match'), 'empty state shown');
  assert.ok(res.text.includes('Clear all filters'), 'clear-filters control offered');
});

test('gender filter narrows the listing', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/?gender=Male');

  assert.equal(res.status, 200);
  assert.ok(res.text.includes('Brann'), 'matching character listed');
  assert.ok(!res.text.includes('>Aria<'), 'non-matching character excluded');
});
function tiles(html) {
  return [...html.matchAll(/<li class="[^"]*character-tile[^"]*">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
}

function decode(href) {
  return href.replace(/&amp;/g, '&');
}

/* ---------- Feature 004: ToyHouse-inspired home gallery ---------- */

test('each character tile is one link holding only avatar, name and job titles', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/');
  const found = tiles(res.text);

  assert.equal(found.length, 3, 'one tile per visible character');

  for (const tile of found) {
    const links = tile.match(/<a\b[^>]*href="\/characters\/[^"]+"/g) ?? [];
    assert.equal(links.length, 1, `a tile must hold exactly one character link: ${tile}`);
    assert.match(tile, /<img\b[^>]*class="card-thumb"[^>]*alt="[^"]+"/, 'thumbnail has alt text');
    assert.match(tile, /class="card-name"/, 'tile shows the name');

    for (const extra of ['Female', 'Male', 'cute', 'feral', 'Greed', 'Patience']) {
      assert.ok(!tile.includes(extra), `tiles must not show gender, tags or traits (${extra})`);
    }
  }

  const aria = found.find((tile) => tile.includes('href="/characters/aria"'));
  assert.match(aria, /Cartographer · Archivist/, 'all job titles are shown in order');
});

test('the filter bar is a GET form with gender up front and collapsible sections', async (t) => {
  const { app } = withApp(t);

  const plain = await request(app).get('/');
  const form = plain.text.match(/<form[^>]*class="[^"]*filter-bar[^"]*"[\s\S]*?<\/form>/)?.[0];
  assert.ok(form, 'the filter bar form exists');
  assert.match(form, /method="get"/);
  assert.match(form, /action="\/"/);
  assert.match(form, /<select id="gender" name="gender"/, 'gender is shown directly');
  assert.match(form, /Apply filters/);

  const sections = form.match(/<details\b[^>]*>/g) ?? [];
  assert.equal(sections.length, 2, 'tags and sins/virtues each have a disclosure section');
  for (const section of sections) {
    assert.doesNotMatch(section, /\sopen\b/, 'sections start collapsed without active filters');
  }

  const filtered = await request(app).get('/?tag=cute');
  const tagSection = filtered.text.match(/<details[^>]*data-filter-section="tags"[^>]*>/)?.[0];
  assert.match(tagSection, /\sopen\b/, 'a section containing an active filter starts open');
  const traitSection = filtered.text.match(/<details[^>]*data-filter-section="traits"[^>]*>/)?.[0];
  if (traitSection) assert.doesNotMatch(traitSection, /\sopen\b/);
});

test('active filters render as removable chips that keep the other filters', async (t) => {
  const { app } = withApp(t);

  const none = await request(app).get('/');
  assert.doesNotMatch(none.text, /class="[^"]*active-filter/, 'no chips without filters');

  const res = await request(app).get('/?gender=Female&tag=cute');
  const chips = [...res.text.matchAll(/<a[^>]*class="[^"]*active-filter[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.equal(chips.length, 2, 'one chip per applied value');

  const gender = chips.find((chip) => /aria-label="Remove gender filter: Female"/.test(chip));
  const tag = chips.find((chip) => /aria-label="Remove tag filter: cute"/.test(chip));
  assert.ok(gender && tag, 'chips have accessible removal names');

  assert.equal(decode(gender.match(/href="([^"]+)"/)[1]), '/?tag=cute');
  assert.equal(decode(tag.match(/href="([^"]+)"/)[1]), '/?gender=Female');

  assert.match(res.text, /<a[^>]*href="\/"[^>]*>Clear all<\/a>/, 'clear-all is offered');
});

test('removal links encode values and remove only the exact value', async (t) => {
  const { app } = withApp(t);
  const res = await request(app).get('/?tag=cute&tag=feral');
  const chip = res.text.match(/<a[^>]*aria-label="Remove tag filter: feral"[^>]*>/)?.[0];
  assert.ok(chip, 'the feral chip is present');
  assert.equal(decode(chip.match(/href="([^"]+)"/)[1]), '/?tag=cute');
});

test('the collection header shows the fixed heading, introduction and visible count', async (t) => {
  const { app } = withApp(t);

  const all = await request(app).get('/');
  assert.match(all.text, /<h1[^>]*>Original characters<\/h1>/);
  assert.match(all.text, /class="collection-intro"/, 'a fixed introduction is present');
  assert.match(all.text, /class="collection-count"[^>]*>\s*3 characters\s*</, 'plural count');

  const one = await request(app).get('/?gender=Male');
  assert.match(one.text, /class="collection-count"[^>]*>\s*1 character\s*</, 'singular count follows filters');
});

test('the results bar shows the visible count next to chips, with and without filters', async (t) => {
  const { app } = withApp(t);
  const bar = (html) => html.match(/<div class="results-bar"[\s\S]*?<\/div>/)?.[0];
  const tileCount = (html) => (html.match(/class="card character-tile"/g) ?? []).length;
  const shown = (html) => Number(bar(html)?.match(/class="results-count"[^>]*>\s*Showing (\d+) characters?/)?.[1]);

  const all = await request(app).get('/');
  assert.ok(bar(all.text), 'results bar present without filters');
  assert.equal(shown(all.text), tileCount(all.text));
  assert.doesNotMatch(bar(all.text), /Clear all/, 'no clear-all without active filters');

  const filtered = await request(app).get('/?gender=Male');
  const b = bar(filtered.text);
  assert.equal(shown(filtered.text), tileCount(filtered.text));
  assert.equal(shown(filtered.text), 1);
  assert.match(b, /aria-label="Remove gender filter: Male"/, 'chips sit in the same bar as the count');
  assert.match(b, /Clear all/);

  const none = await request(app).get('/?tag=cute&gender=Male');
  assert.equal(tileCount(none.text), 0);
  assert.equal(shown(none.text), 0, 'empty results still report a zero count');
});