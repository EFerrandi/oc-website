import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { NSFW_ON } from '../helpers/app.js';
import { csrfFrom, withAdminApp } from '../helpers/media.js';

async function post(ctx, path, fields, page = '/admin/relationships') {
  const token = await csrfFrom(ctx.agent, page);
  return ctx.agent.post(path).type('form').send({ _csrf: token, ...fields });
}

const create = (ctx, fields) => post(ctx, '/admin/relationships', fields);

const row = (db, label) => db.prepare('SELECT * FROM relationship WHERE label = ?').get(label);

test('a new relationship is two-sided unless the admin chooses one-sided', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids, db } = ctx;

  let res = await create(ctx, { from_character_id: ids.brann, to_character_id: ids.shadow, label: 'rivals' });
  assert.equal(res.status, 303);
  assert.equal(row(db, 'rivals').is_one_sided, 0);

  res = await create(ctx, {
    from_character_id: ids.brann, to_character_id: ids.shadow, label: 'admires', is_one_sided: '1',
  });
  assert.equal(res.status, 303);
  const stored = row(db, 'admires');
  assert.equal(stored.is_one_sided, 1);
  assert.equal(stored.from_character_id, ids.brann);
  assert.equal(stored.to_character_id, ids.shadow);
});

test('duplicate rules respect direction only for one-sided relationships', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids } = ctx;
  const pair = { from_character_id: ids.brann, to_character_id: ids.shadow };
  const reverse = { from_character_id: ids.shadow, to_character_id: ids.brann };

  assert.equal((await create(ctx, { ...pair, label: 'crush on', is_one_sided: '1' })).status, 303);

  assert.equal((await create(ctx, { ...reverse, label: 'Crush On', is_one_sided: '1' })).status, 303,
    'opposite one-sided with the same label is allowed');

  const same = await create(ctx, { ...pair, label: 'CRUSH ON', is_one_sided: '1' });
  assert.equal(same.status, 422, 'same direction and label is a duplicate');
  assert.match(same.text, /already have a relationship/);

  const crossKind = await create(ctx, { ...pair, label: 'crush on' });
  assert.equal(crossKind.status, 422, 'a two-sided one cannot duplicate a one-sided label');

  assert.equal((await create(ctx, { ...pair, label: 'partners' })).status, 303);
  const reversed = await create(ctx, { ...reverse, label: 'partners' });
  assert.equal(reversed.status, 422, 'two-sided stays direction-independent');
  const reversedOneSided = await create(ctx, { ...reverse, label: 'partners', is_one_sided: '1' });
  assert.equal(reversedOneSided.status, 422, 'one-sided cannot duplicate a two-sided label');
});

test('editing can change sidedness and swap the direction', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids, db } = ctx;
  await create(ctx, {
    from_character_id: ids.brann, to_character_id: ids.shadow, label: 'admires', is_one_sided: '1',
  });
  const id = row(db, 'admires').id;

  const res = await post(ctx, `/admin/relationships/${id}`, {
    from_character_id: ids.brann, to_character_id: ids.shadow, label: 'admires',
    is_one_sided: '1', swap_direction: '1',
  });
  assert.equal(res.status, 303);
  let stored = row(db, 'admires');
  assert.equal(stored.from_character_id, ids.shadow);
  assert.equal(stored.to_character_id, ids.brann);

  await post(ctx, `/admin/relationships/${id}`, {
    from_character_id: ids.shadow, to_character_id: ids.brann, label: 'admires', is_one_sided: '0',
  });
  stored = row(db, 'admires');
  assert.equal(stored.is_one_sided, 0);
});

test('the admin list shows sidedness and offers an edit form', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids } = ctx;
  await create(ctx, {
    from_character_id: ids.brann, to_character_id: ids.shadow, label: 'admires', is_one_sided: '1',
  });

  const page = await ctx.agent.get('/admin/relationships');
  assert.match(page.text, /One-sided/);
  assert.match(page.text, /Two-sided/);
  assert.match(page.text, /name="swap_direction"/);
  assert.match(page.text, /action="\/admin\/relationships\/\d+"/);
});

test('NSFW one-sided relationships stay hidden from visitors who have not opted in', async (t) => {
  const ctx = await withAdminApp(t);
  const { ids, app } = ctx;
  await create(ctx, {
    from_character_id: ids.brann, to_character_id: ids.shadow, label: 'secretly adores',
    is_one_sided: '1', is_nsfw: '1',
  });

  const hidden = await request(app).get('/relationships');
  assert.ok(!hidden.text.includes('secretly adores'));
  assert.ok(!hidden.text.includes('Shadow'));
  const hiddenProfile = await request(app).get('/characters/brann');
  assert.ok(!hiddenProfile.text.includes('secretly adores'));

  const shown = await request(app).get('/relationships').set('Cookie', NSFW_ON);
  assert.ok(shown.text.includes('secretly adores'));
});
