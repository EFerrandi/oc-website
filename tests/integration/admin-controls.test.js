import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { hashPassword } from '../../src/services/auth.js';
import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { seedFixtures } from '../helpers/fixtures.js';

/**
 * User Story 5 (deleting a character) and User Story 6 (returning to the
 * admin area).
 *
 * Both routes already existed and were already tested at the service layer.
 * What was missing was any way to REACH them: `POST /admin/characters/:id/delete`
 * was fully implemented but no template linked to it, and there was no path
 * back to /admin from a public page. These tests are about reachability, which
 * is why they assert on markup rather than on behaviour alone.
 */

const ADMIN_PASSWORD = 'correct horse battery staple';

async function signedInAgent(t) {
  const hash = await hashPassword(ADMIN_PASSWORD);
  const ctx = createTestApp({ adminPasswordHash: hash });
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());

  const agent = request.agent(ctx.app);
  const page = await agent.get('/admin/login');
  const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];

  const res = await agent.post('/admin/login').type('form')
    .send({ _csrf: token, password: ADMIN_PASSWORD });

  assert.equal(res.status, 303, 'sign-in must succeed for this suite to mean anything');
  return { agent, ids, app: ctx.app, db: ctx.db };
}

/**
 * Supertest cannot interleave requests: fetching a CSRF token inside the
 * object literal passed to `.send()` tears down the connection and surfaces as
 * ECONNREFUSED. The token is always hoisted into a const first.
 */
async function csrfFrom(agent, path) {
  const page = await agent.get(path);
  const match = page.text.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, `no CSRF token on ${path}`);
  return match[1];
}

/* ------------------------------------------------------------------ *
 * US5 — deleting a character.
 * ------------------------------------------------------------------ */

// T069 — FR-022.
test('the admin character list offers a delete control for each character', async (t) => {
  const { agent, ids } = await signedInAgent(t);

  const res = await agent.get('/admin/characters');
  assert.equal(res.status, 200);

  for (const id of [ids.aria, ids.brann, ids.shadow]) {
    assert.ok(
      res.text.includes(`/admin/characters/${id}/edit#delete`),
      `no delete control for character ${id}`,
    );
  }

  assert.match(res.text, />\s*Delete\s*</i, 'the control must be labelled, not just an icon');
});

// T070 — FR-023.
test('the edit page carries a delete form that is a sibling of the edit form', async (t) => {
  const { agent, ids } = await signedInAgent(t);

  const res = await agent.get(`/admin/characters/${ids.aria}/edit`);
  assert.equal(res.status, 200);

  const deleteForm = res.text.match(
    new RegExp(`<form[^>]*action="/admin/characters/${ids.aria}/delete"[\\s\\S]*?</form>`),
  );
  assert.ok(deleteForm, 'no delete form on the edit page');

  assert.match(deleteForm[0], /method="post"/i);
  assert.match(deleteForm[0], /name="confirm_name"/, 'deletion must be confirmed by typing the name');
  assert.match(deleteForm[0], /name="_csrf"/, 'the delete form needs the CSRF field');

  assert.ok(res.text.includes('id="delete"'), 'the list page links to #delete, so the anchor must exist');

  // Nested forms are invalid HTML: the parser drops the inner one, which would
  // silently turn the delete button into a second submit for the edit form.
  const deleteStart = res.text.indexOf(deleteForm[0]);
  const editForm = res.text.match(
    new RegExp(`<form[^>]*action="/admin/characters/${ids.aria}"[\\s\\S]*?</form>`),
  );
  assert.ok(editForm, 'no edit form on the edit page');

  const editStart = res.text.indexOf(editForm[0]);
  const editEnd = editStart + editForm[0].length;
  assert.ok(
    deleteStart >= editEnd || deleteStart + deleteForm[0].length <= editStart,
    'the delete form is nested inside the edit form',
  );
});

// T071 — FR-024.
test('a mismatched confirmation is refused and the character survives', async (t) => {
  const { agent, ids } = await signedInAgent(t);

  const token = await csrfFrom(agent, `/admin/characters/${ids.aria}/edit`);

  const res = await agent.post(`/admin/characters/${ids.aria}/delete`).type('form')
    .send({ _csrf: token, confirm_name: 'Not Aria' });

  assert.equal(res.status, 422, 'a wrong confirmation is a validation failure, not a conflict');
  assert.match(res.text, /confirm_name|confirm/i, 'the error must name the field that was wrong');

  const still = await request(res.request.app ?? agent.app).get('/characters/aria');
  assert.equal(still.status, 200, 'the character must still exist after a refused deletion');
});

// T072 — FR-025.
test('a correct confirmation deletes the character everywhere', async (t) => {
  const { agent, ids, app } = await signedInAgent(t);

  const token = await csrfFrom(agent, `/admin/characters/${ids.brann}/edit`);

  const res = await agent.post(`/admin/characters/${ids.brann}/delete`).type('form')
    .send({ _csrf: token, confirm_name: 'Brann' });

  assert.equal(res.status, 303);
  assert.equal(res.headers.location, '/admin/characters');

  assert.equal((await request(app).get('/characters/brann')).status, 404);

  const gallery = await request(app).get('/');
  assert.ok(!gallery.text.includes('Brann'), 'the deleted character is still in the gallery');

  // Both maps, at both ratings: a relationship left dangling would render a
  // node for a character that no longer exists.
  for (const nsfw of [false, true]) {
    const req = request(app).get('/relationships');
    const map = await (nsfw ? req.set('Cookie', NSFW_ON) : req);

    assert.ok(!map.text.includes('Brann'), `the deleted character is still on the map (nsfw=${nsfw})`);
    assert.ok(
      !map.text.includes('childhood friends'),
      `a relationship belonging to the deleted character survives (nsfw=${nsfw})`,
    );
  }

  const artists = await request(app).get('/artists');
  assert.ok(!artists.text.includes('Brann'), 'the deleted character is still credited on /artists');
});

// T073 — FR-026, SC-009.
test('deletion is unreachable without an admin session', async (t) => {
  const { ids, app } = await signedInAgent(t);

  for (const page of ['/', '/relationships', '/artists', '/characters/aria']) {
    const res = await request(app).get(page);
    assert.ok(!res.text.includes('/delete'), `${page} exposes a delete control to the public`);
  }

  const anonymous = await request(app).post(`/admin/characters/${ids.aria}/delete`).type('form')
    .send({ confirm_name: 'Aria' });

  assert.ok(
    [401, 403, 303, 404].includes(anonymous.status),
    `an anonymous delete must be refused, got ${anonymous.status}`,
  );

  const survived = await request(app).get('/characters/aria');
  assert.equal(survived.status, 200, 'an anonymous POST deleted a character');
});

// T074 — FR-027.
test('deleting a character that no longer exists reports clearly', async (t) => {
  const { agent, ids } = await signedInAgent(t);

  const token = await csrfFrom(agent, `/admin/characters/${ids.shadow}/edit`);

  const res = await agent.post('/admin/characters/999999/delete').type('form')
    .send({ _csrf: token, confirm_name: 'Shadow' });

  // 404 is the honest answer: the admin asked to delete something that is not
  // there. What must NOT happen is a 500 or a silent 303 implying success.
  assert.equal(res.status, 404, `expected a clear "not found", got ${res.status}`);
});

/* ------------------------------------------------------------------ *
 * US6 — returning to the admin area.
 * ------------------------------------------------------------------ */

const PUBLIC_PAGES = ['/', '/characters/aria', '/relationships', '/artists'];

// T079 — FR-029, SC-010.
test('an anonymous visitor sees no return-to-admin control', async (t) => {
  const { app } = await signedInAgent(t);

  for (const page of PUBLIC_PAGES) {
    const res = await request(app).get(page);
    assert.equal(res.status, 200);

    assert.ok(
      !res.text.includes('class="admin-return"'),
      `${page} shows the admin entry to an anonymous visitor`,
    );
    assert.ok(
      !res.text.includes('href="/admin"'),
      `${page} links straight into the admin area for an anonymous visitor`,
    );
  }
});

// T080 — FR-028.
test('a signed-in admin sees a return-to-admin control on every public page', async (t) => {
  const { agent } = await signedInAgent(t);

  for (const page of PUBLIC_PAGES) {
    const res = await agent.get(page);
    assert.equal(res.status, 200, `${page} should render for an admin`);

    const control = res.text.match(/<a[^>]*class="[^"]*admin-return[^"]*"[^>]*>/);
    assert.ok(control, `${page} has no return-to-admin control`);
    assert.match(control[0], /href="\/admin"/, `${page} points the admin control somewhere else`);
  }
});

// T081 — FR-030: the new control displaces nothing.
test('the NSFW checkbox stays first and sign-out remains present', async (t) => {
  const { agent } = await signedInAgent(t);

  const res = await agent.get('/');
  const controls = res.text.slice(
    res.text.indexOf('class="site-controls"'),
    res.text.indexOf('</header>'),
  );

  assert.notEqual(controls, '', 'no .site-controls region');

  const nsfwIndex = controls.indexOf('nsfw');
  const adminIndex = controls.indexOf('admin-return');

  assert.ok(nsfwIndex !== -1, 'the NSFW toggle disappeared');
  assert.ok(adminIndex !== -1, 'the admin entry is not in the header controls');
  assert.ok(nsfwIndex < adminIndex, 'the NSFW toggle must remain the first control');

  assert.match(controls, /logout|sign out/i, 'the sign-out control disappeared');
});
