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
  updateItem,
} from '../../src/services/taxonomy.js';

function withDb(t) {
  const ctx = createTestDatabase();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { db: ctx.db, ids };
}

/**
 * The asymmetry below is the rule most likely to be "tidied up" into a bug.
 * Tags are mandatory on characters, so an in-use tag cannot be deleted.
 * Traits are optional, so an in-use trait can be — and is simply detached.
 */

test('deleting an in-use TAG is refused', (t) => {
  const { db, ids } = withDb(t);

  assert.throws(
    () => deleteItem(db, 'tags', ids.tagCute),
    (err) => err instanceof ConflictError && err.status === 409,
    'an in-use tag must not be deletable — characters must keep at least one',
  );

  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(ids.tagCute).n, 1);
});

test('deleting an in-use TRAIT succeeds and detaches it', (t) => {
  const { db, ids } = withDb(t);

  const before = db.prepare('SELECT COUNT(*) n FROM character_trait WHERE trait_id = ?').get(ids.traitGreed).n;
  assert.ok(before > 0, 'fixture must have the trait in use for this test to mean anything');

  deleteItem(db, 'traits', ids.traitGreed);

  assert.equal(db.prepare('SELECT COUNT(*) n FROM trait WHERE id = ?').get(ids.traitGreed).n, 0);
  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM character_trait WHERE trait_id = ?').get(ids.traitGreed).n, 0,
    'links must be detached, not orphaned',
  );
  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM character WHERE id = ?').get(ids.shadow).n, 1,
    'the character itself must survive losing a trait',
  );
});

test('an unused tag can be deleted', (t) => {
  const { db } = withDb(t);
  const id = createItem(db, 'tags', { name: 'unused-tag' });

  deleteItem(db, 'tags', id);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE id = ?').get(id).n, 0);
});

test('trait uniqueness is on the name alone, ignoring kind', (t) => {
  const { db } = withDb(t);

  assert.throws(
    () => createItem(db, 'traits', { name: 'greed', traitKind: 'virtue' }),
    /already in use/,
    '"Greed (sin)" must block "greed (virtue)"',
  );
});

test('names are trimmed and collapsed before the uniqueness check', (t) => {
  const { db } = withDb(t);

  assert.throws(
    () => createItem(db, 'traits', { name: '  Greed  ', traitKind: 'sin' }),
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

test('re-classifying a trait moves it between sins and virtues everywhere', (t) => {
  const { db, ids } = withDb(t);

  updateItem(db, 'traits', ids.traitGreed, { name: 'Greed', traitKind: 'virtue' });

  const row = db.prepare('SELECT kind FROM trait WHERE id = ?').get(ids.traitGreed);
  assert.equal(row.kind, 'virtue');

  // Characters reference the row rather than copying it, so the change
  // propagates with no extra work (FR-061).
  assert.equal(
    db.prepare('SELECT COUNT(*) n FROM character_trait WHERE trait_id = ?').get(ids.traitGreed).n, 1,
    'the link must survive re-classification',
  );
});

test('deleting an in-use gender, artist or designer is refused', (t) => {
  const { db, ids } = withDb(t);

  assert.throws(() => deleteItem(db, 'genders', ids.genderFemale), ConflictError);
  assert.throws(() => deleteItem(db, 'artists', ids.artistA), ConflictError);
  assert.throws(() => deleteItem(db, 'designers', ids.designer), ConflictError);
});

test('an artist or designer URL must be absolute http(s) or blank', (t) => {
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
