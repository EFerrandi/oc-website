import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestDatabase } from '../helpers/db.js';
import { seedFixtures } from '../helpers/fixtures.js';
import {
  ConflictError,
  createItem,
  deleteItem,
  findOrCreateByName,
  listItems,
} from '../../src/services/taxonomy.js';

function withDb(t) {
  const ctx = createTestDatabase();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { db: ctx.db, ids };
}

test('deleting an in-use TAG is refused', (t) => {
  const { db, ids } = withDb(t);

  assert.throws(
    () => deleteItem(db, 'tags', ids.tagCute),
    (err) => err instanceof ConflictError && err.status === 409,
    'an in-use tag must not be deletable — characters must keep at least one',
  );

  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(ids.tagCute).n, 1);
});

test('an unused tag can be deleted', (t) => {
  const { db } = withDb(t);
  const id = createItem(db, 'tags', { name: 'unused-tag' });

  deleteItem(db, 'tags', id);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(id).n, 0);
});

test('former sin and virtue values use ordinary tag uniqueness', (t) => {
  const { db } = withDb(t);

  assert.throws(
    () => createItem(db, 'tags', { name: 'greed' }),
    /already in use/,
    '"Greed (sin)" must block "greed (virtue)"',
  );
});

test('names are trimmed and collapsed before the uniqueness check', (t) => {
  const { db } = withDb(t);

  assert.throws(
    () => createItem(db, 'tags', { name: '  Greed  ' }),
    /already in use/,
    'surrounding whitespace must not create a duplicate',
  );

  // Collapsing means runs of whitespace become a single space — it is not
  // whitespace removal, so "two words" and "two  words" collide but
  // "twowords" remains a distinct name.
  createItem(db, 'tags', { name: 'moon lit' });

  assert.throws(
    () => createItem(db, 'tags', { name: 'moon   lit' }),
    /already in use/,
    'a collapsed internal whitespace run must not create a duplicate',
  );

  const distinct = createItem(db, 'tags', { name: 'moonlit' });
  assert.ok(distinct > 0, 'removing the space entirely is a genuinely different name');
});

test('a created name is stored normalised', (t) => {
  const { db } = withDb(t);
  createItem(db, 'tags', { name: '  spooky   scary  ' });

  const names = listItems(db, 'tags').map((r) => r.name);
  assert.ok(names.includes('spooky scary'), `expected normalised name, got ${JSON.stringify(names)}`);
});

test('deleting an in-use gender or artist is refused', (t) => {
  const { db, ids } = withDb(t);

  assert.throws(() => deleteItem(db, 'genders', ids.genderFemale), ConflictError);
  assert.throws(() => deleteItem(db, 'artists', ids.artistA), ConflictError);
});

test('an artist URL must be absolute http(s) or blank', (t) => {
  const { db } = withDb(t);

  assert.throws(
    () => createItem(db, 'artists', { name: 'Bad URL Artist', websiteUrl: 'javascript:alert(1)' }),
    /could not be saved/,
  );

  const id = createItem(db, 'artists', { name: 'No URL Artist', websiteUrl: '' });
  const saved = listItems(db, 'artists').find((a) => a.id === id);
  assert.equal(saved.websiteUrl, null, 'a blank URL is stored as null, not an empty string');
});

test('findOrCreateByName reuses an existing row rather than duplicating it', (t) => {
  const { db, ids } = withDb(t);

  const reused = findOrCreateByName(db, 'tags', '  CUTE  ');
  assert.equal(reused, ids.tagCute, 'must match case-insensitively after trimming');

  const created = findOrCreateByName(db, 'tags', 'brand-new-tag');
  assert.notEqual(created, ids.tagCute);
  assert.ok(created > 0);
});
