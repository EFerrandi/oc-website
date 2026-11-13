import assert from 'node:assert/strict';
import test from 'node:test';

import { withAdminApp } from '../helpers/media.js';

test('the admin home shows the three add buttons before counts and statistics', async (t) => {
  const { agent } = await withAdminApp(t);
  const html = (await agent.get('/admin')).text;

  const nav = html.indexOf('<nav class="admin-actions" aria-label="Create new content">');
  assert.ok(nav > -1, 'actions nav is present');
  assert.ok(html.indexOf('<h1>Admin</h1>') < nav);
  assert.ok(nav < html.indexOf('class="admin-counts"'));
  assert.ok(nav < html.indexOf('class="admin-statistics"'));

  const block = html.slice(nav, html.indexOf('</nav>', nav));
  const links = [...block.matchAll(/<a class="btn-action" href="([^"]+)">([^<]+)<\/a>/g)]
    .map((m) => [m[1], m[2].trim()]);
  assert.deepEqual(links, [
    ['/admin/characters/new', 'Add a character'],
    ['/admin/images/new', 'Add an image'],
    ['/admin/stories/new', 'Add a story'],
  ]);
});

test('the old small add links are gone from the bottom of the dashboard', async (t) => {
  const { agent } = await withAdminApp(t);
  const html = (await agent.get('/admin')).text;
  assert.doesNotMatch(html, /class="chip" href="\/admin\/(characters|images|stories)\/new"/);
});
