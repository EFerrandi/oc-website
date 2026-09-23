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
