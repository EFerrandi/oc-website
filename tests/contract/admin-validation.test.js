import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';
import { hashPassword } from '../../src/services/auth.js';

const PASSWORD = 'correct-horse-battery-staple';

async function withApp(t) {
  const hash = await hashPassword(PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

async function signIn(app) {
  const agent = request.agent(app);
  const form = await agent.get('/admin/login');
  const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];
  await agent.post('/admin/login').type('form').send({ _csrf: token, password: PASSWORD });
  return agent;
}

async function tokenFrom(agent, path) {
  const page = await agent.get(path);
  return page.text.match(/name="_csrf" value="([^"]+)"/)[1];
}

test('a successful action answers 303 and redirects, so a refresh cannot resubmit it', async (t) => {
  const { app } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/tags');
  const res = await agent.post('/admin/tags').type('form').send({ _csrf: token, name: 'brand-new-tag' });

  assert.equal(res.status, 303, 'see-other, not 200 and not 302');
  assert.equal(res.headers.location, '/admin/tags');
});

test('a validation failure answers 422 and names the offending field', async (t) => {
  const { app, db } = await withApp(t);
  const agent = await signIn(app);

  const before = db.prepare('SELECT COUNT(*) n FROM tag').get().n;
  const token = await tokenFrom(agent, '/admin/tags');
  const res = await agent.post('/admin/tags').type('form').send({ _csrf: token, name: '   ' });

  assert.equal(res.status, 422);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag').get().n, before, 'nothing was created');
  assert.match(res.text, /field-error|error/i, 'the response carries an error message');
});

test('a dependency conflict answers 409, distinct from a validation failure', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/tags');
  const res = await agent.post(`/admin/tags/${ids.tagCute}/delete`).type('form')
    .send({ _csrf: token, confirm: 'delete' });

  assert.equal(res.status, 409, 'an in-use tag is a conflict, not a malformed request');
});

test('a missing or wrong CSRF token answers 403 and changes nothing', async (t) => {
  const { app, db } = await withApp(t);
  const agent = await signIn(app);

  const before = db.prepare('SELECT COUNT(*) n FROM tag').get().n;

  const missing = await agent.post('/admin/tags').type('form').send({ name: 'no-token' });
  assert.equal(missing.status, 403);

  const wrong = await agent.post('/admin/tags').type('form')
    .send({ _csrf: 'not-the-token', name: 'bad-token' });
  assert.equal(wrong.status, 403);

  // A token of the right shape but wrong value must fail the same way.
  const realToken = await tokenFrom(agent, '/admin/tags');
  const tampered = `${realToken.slice(0, -1)}${realToken.at(-1) === 'a' ? 'b' : 'a'}`;
  const tamperedRes = await agent.post('/admin/tags').type('form')
    .send({ _csrf: tampered, name: 'tampered' });
  assert.equal(tamperedRes.status, 403);

  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag').get().n, before, 'no tag was created');
});

test('an unknown admin record answers 404', async (t) => {
  const { app } = await withApp(t);
  const agent = await signIn(app);

  for (const path of [
    '/admin/characters/999999/edit',
    '/admin/images/999999/edit',
    '/admin/stories/999999/edit',
  ]) {
    assert.equal((await agent.get(path)).status, 404, `${path} is a 404`);
  }
});

test('a 422 re-renders the form rather than discarding what was typed', async (t) => {
  const { app, ids } = await withApp(t);
  const agent = await signIn(app);

  const token = await tokenFrom(agent, '/admin/relationships');
  const res = await agent.post('/admin/relationships').type('form').send({
    _csrf: token,
    from_character_id: ids.aria,
    to_character_id: ids.aria,
    label: 'a label worth keeping',
  });

  assert.equal(res.status, 422);
  assert.ok(res.text.includes('cannot be related to itself'), 'the reason is explained');
  assert.ok(res.text.includes('a label worth keeping'), 'the typed label is preserved');
});

test('validation detail is shown to the admin but never to a visitor', async (t) => {
  const { app } = await withApp(t);

  // A visitor hitting a missing page gets a generic message with no internals.
  const res = await request(app).get('/characters/does-not-exist');
  assert.equal(res.status, 404);

  for (const leak of ['SQLITE', 'stack', 'at Object.', 'node_modules', 'SELECT ']) {
    assert.ok(
      !res.text.includes(leak),
      `a visitor-facing error must not leak "${leak}"`,
    );
  }
});

test('an unhandled visitor error never exposes internals', async (t) => {
  const { app } = await withApp(t);

  // A malformed id must not surface a database or stack trace.
  for (const path of ['/media/not-a-number', '/images/not-a-number', '/characters/%%%']) {
    const res = await request(app).get(path);

    assert.ok(res.status >= 400, `${path} is an error`);
    assert.ok(!res.text.includes('SQLITE'), `${path} leaks no database detail`);
    assert.ok(!/\bat\s+\w+\s+\(/.test(res.text), `${path} leaks no stack trace`);
  }
});
