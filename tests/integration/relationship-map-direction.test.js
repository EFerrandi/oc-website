import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

function setup(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

const insert = (db, ids, from, to, label, oneSided) => db.prepare(`
  INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, is_one_sided, created_at, updated_at)
  VALUES (?, ?, ?, 0, ?, 'x', 'x')
`).run(from, to, label, oneSided);

function sfwMap(html) {
  const start = html.indexOf('data-map-region="sfw"');
  const next = html.indexOf('data-map-region="nsfw"');
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

test('one-sided edges carry an arrowhead and two-sided edges do not', async (t) => {
  const { app, db, ids } = setup(t);
  insert(db, ids, ids.brann, ids.aria, 'admires', 1);

  const html = sfwMap((await request(app).get('/relationships')).text);

  assert.match(html, /<marker[^>]*id="map-sfw-arrow"/);
  const edges = [...html.matchAll(/<g class="map-edge"[^>]*>[\s\S]*?<\/g>/g)].map((m) => m[0]);
  const one = edges.filter((e) => e.includes('admires'));
  const two = edges.filter((e) => e.includes('childhood'));
  assert.equal(one.length, 1);
  assert.equal(two.length, 1);
  assert.match(one[0], /data-one-sided="1"/);
  assert.match(one[0], /marker-end="url\(#map-sfw-arrow\)"/);
  assert.ok(!/data-one-sided/.test(two[0]));
  assert.ok(!/marker-end/.test(two[0]));
});

test('the text equivalent states direction for one-sided relationships only', async (t) => {
  const { app, db, ids } = setup(t);
  insert(db, ids, ids.brann, ids.aria, 'admires', 1);

  const html = sfwMap((await request(app).get('/relationships')).text);

  assert.match(html, /Brann → admires → Aria/);
  assert.match(html, /Aria — childhood friends — Brann/);
});

test('the character page states sidedness and direction', async (t) => {
  const { app, db, ids } = setup(t);
  insert(db, ids, ids.brann, ids.aria, 'admires', 1);

  const brann = (await request(app).get('/characters/brann')).text;
  const aria = (await request(app).get('/characters/aria')).text;

  assert.match(brann, /admires[\s\S]{0,200}one-sided/i);
  assert.match(brann, /childhood friends[\s\S]{0,200}two-sided/i);
  assert.match(aria, /admires[\s\S]{0,200}one-sided/i);
  assert.ok(brann.includes('class="relationship-direction"'));
});
