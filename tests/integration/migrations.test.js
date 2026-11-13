import assert from 'node:assert/strict';
import test from 'node:test';

import { migrate } from '../../src/db/migrate.js';
import { createLegacyDatabase } from '../helpers/migrations.js';

function seedLegacy(db) {
  const at = '2026-01-01T00:00:00.000Z';
  const run = (sql, ...values) => db.prepare(sql).run(...values).lastInsertRowid;
  const gender = run('INSERT INTO gender (name, created_at) VALUES (?, ?)', 'Female', at);
  const designer = run(
    'INSERT INTO designer (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    '  Example   Studio ', 'https://designer.example/', at, at,
  );
  const artist = run(
    'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'example studio', 'https://artist.example/', at, at,
  );
  const duplicateArtist = run(
    'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ' EXAMPLE STUDIO ', 'https://duplicate.example/', at, at,
  );
  const unmatchedDesigner = run(
    'INSERT INTO designer (name, website_url, created_at, updated_at) VALUES (?, NULL, ?, ?)',
    'Unique Designer', at, at,
  );
  const character = run(`
    INSERT INTO character
      (name, slug, gender_id, short_description, terms_of_use, can_regift,
       can_retrade, can_resell, designer_id, created_at, updated_at)
    VALUES ('Test', 'test', ?, 'Description', 'Terms', 0, 0, 0, ?, ?, ?)
  `, gender, designer, at, at);
  const image = run(`
    INSERT INTO image
      (file_name, preview_file_name, mime_type, byte_size, width, height, alt_text,
       artist_id, is_nsfw, created_at, updated_at)
    VALUES ('legacy.png', 'legacy-preview.webp', 'image/png', 1, 1, 1, 'Legacy image',
       ?, 0, ?, ?)
  `, duplicateArtist, at, at);
  const tag = run('INSERT INTO tag (name, created_at) VALUES (?, ?)', 'Patience', at);
  const duplicateTrait = run(
    'INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ' patience ', 'virtue', at, at,
  );
  const newTrait = run(
    'INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'Honesty', 'virtue', at, at,
  );
  const duplicateNormalisedTrait = run(
    'INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ' HONESTY ', 'sin', at, at,
  );
  db.prepare('INSERT INTO character_tag VALUES (?, ?)').run(character, tag);
  db.prepare('INSERT INTO character_trait VALUES (?, ?)').run(character, duplicateTrait);
  db.prepare('INSERT INTO character_trait VALUES (?, ?)').run(character, newTrait);
  db.prepare('INSERT INTO character_trait VALUES (?, ?)').run(character, duplicateNormalisedTrait);
  return { artist, character, designer, image, unmatchedDesigner };
}

test('migrations consolidate creator identities and preserve artist URL precedence', (t) => {
  const { db, cleanup } = createLegacyDatabase();
  t.after(cleanup);
  const ids = seedLegacy(db);

  assert.ok(migrate(db) >= 1);
  const schema = db.prepare('PRAGMA table_info(character)').all().map((column) => column.name);
  assert.ok(schema.includes('artist_id'));
  assert.ok(!schema.includes('designer_id'));
  assert.equal(db.prepare('SELECT website_url FROM artist WHERE id = ?').get(ids.artist).website_url,
    'https://artist.example/');
  assert.equal(db.prepare('SELECT artist_id FROM character WHERE id = ?').get(ids.character).artist_id,
    ids.artist);
  assert.equal(db.prepare('SELECT artist_id FROM image WHERE id = ?').get(ids.image).artist_id, ids.artist);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM artist').get().n, 2,
    'duplicate normalized artist identities are merged, while unmatched designers become artists');
  assert.ok(db.prepare('SELECT 1 FROM artist WHERE name = ?').get('Unique Designer'));
  assert.throws(() => db.prepare('SELECT designer_id FROM character').get(), /no such column/i);
});

test('migration maps old sins and virtues to tags without duplicate memberships', (t) => {
  const { db, cleanup } = createLegacyDatabase();
  t.after(cleanup);
  const ids = seedLegacy(db);

  migrate(db);
  const tags = db.prepare(`
    SELECT t.name FROM tag t JOIN character_tag ct ON ct.tag_id = t.id
    WHERE ct.character_id = ? ORDER BY t.name
  `).all(ids.character).map((row) => row.name.toLowerCase());
  assert.deepEqual(tags, ['honesty', 'patience']);
  assert.throws(() => db.prepare('SELECT * FROM trait').all(), /no such table/i);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tag WHERE lower(name) = ?').get('honesty').n, 1);
});

test('avatar crop migration adds centered square defaults and enforces bounds', (t) => {
  const { db, cleanup } = createLegacyDatabase();
  t.after(cleanup);
  const ids = seedLegacy(db);

  migrate(db);
  const crop = db.prepare(`
    SELECT avatar_crop_x AS x, avatar_crop_y AS y, avatar_crop_zoom AS zoom
    FROM character WHERE id = ?
  `).get(ids.character);
  assert.deepEqual({ ...crop }, { x: 50, y: 50, zoom: 1 });
  assert.throws(() => db.prepare('UPDATE character SET avatar_crop_x = 101 WHERE id = ?').run(ids.character));
  assert.throws(() => db.prepare('UPDATE character SET avatar_crop_zoom = 0.5 WHERE id = ?').run(ids.character));
});

test('migration is recorded and does not change data when run again', (t) => {
  const { db, cleanup } = createLegacyDatabase();
  t.after(cleanup);
  const ids = seedLegacy(db);

  const first = migrate(db);
  const count = db.prepare('SELECT COUNT(*) n FROM artist').get().n;
  assert.equal(migrate(db), 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM artist').get().n, count);
  assert.ok(db.prepare('SELECT artist_id FROM character WHERE id = ?').get(ids.character));
  assert.ok(first > 0);
});

test('relationship sidedness migration keeps rows two-sided and makes uniqueness direction-aware', (t) => {
  const { db, cleanup } = createLegacyDatabase();
  t.after(cleanup);
  const ids = seedLegacy(db);
  const at = '2026-01-01T00:00:00.000Z';
  const other = db.prepare(`
    INSERT INTO character
      (name, slug, gender_id, short_description, terms_of_use, can_regift,
       can_retrade, can_resell, designer_id, created_at, updated_at)
    VALUES ('Other', 'other', 1, 'Description', 'Terms', 0, 0, 0, ?, ?, ?)
  `).run(ids.designer, at, at).lastInsertRowid;
  const rel = (from, to, label, oneSided = null) => {
    const columns = oneSided === null ? '' : ', is_one_sided';
    const marks = oneSided === null ? '' : ', ?';
    const params = [from, to, label, at, at];
    if (oneSided !== null) params.push(oneSided);
    return db.prepare(`
      INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at${columns})
      VALUES (?, ?, ?, 0, ?, ?${marks})
    `).run(...params);
  };
  const a = ids.character;
  const legacyId = rel(a, other, 'friends').lastInsertRowid;

  migrate(db);

  const column = db.prepare('PRAGMA table_info(relationship)').all().find((c) => c.name === 'is_one_sided');
  assert.ok(column, 'is_one_sided column exists');
  assert.equal(column.notnull, 1);
  assert.equal(db.prepare('SELECT is_one_sided s FROM relationship WHERE id = ?').get(legacyId).s, 0,
    'existing relationships stay two-sided');

  assert.throws(() => rel(a, other, 'Friends'), /constraint/i, 'same two-sided label, same direction');
  assert.throws(() => rel(other, a, 'FRIENDS'), /constraint/i, 'two-sided is direction-independent');
  assert.throws(() => rel(a, other, 'x', 2), /constraint/i, 'is_one_sided is 0 or 1');

  rel(a, other, 'crush on', 1);
  rel(other, a, 'crush on', 1);
  assert.throws(() => rel(a, other, 'CRUSH ON', 1), /constraint/i, 'same direction and label');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
});

test('video migration keeps images and avatar links and enforces the video invariant', (t) => {
  const { db, cleanup } = createLegacyDatabase();
  t.after(cleanup);
  const ids = seedLegacy(db);
  db.prepare('UPDATE character SET avatar_image_id = ? WHERE id = ?').run(ids.image, ids.character);
  db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)')
    .run(ids.character, ids.image);

  migrate(db);

  const kept = db.prepare('SELECT file_name AS f, preview_file_name AS p, width FROM image WHERE id = ?').get(ids.image);
  assert.equal(kept.f, 'legacy.png');
  assert.equal(kept.p, 'legacy-preview.webp');
  assert.equal(db.prepare('SELECT avatar_image_id AS a FROM character WHERE id = ?').get(ids.character).a, ids.image);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM character_image WHERE image_id = ?').get(ids.image).n, 1);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);

  const at = '2026-01-01T00:00:00.000Z';
  const insert = (file, preview, mime, width) => db.prepare(`
    INSERT INTO image (file_name, preview_file_name, mime_type, byte_size, width, height,
      alt_text, artist_id, is_nsfw, created_at, updated_at)
    VALUES (?, ?, ?, 10, ?, ?, 'alt', ?, 0, ?, ?)
  `).run(file, preview, mime, width, width, ids.artist, at, at);

  insert('clip.mp4', null, 'video/mp4', null);
  assert.throws(() => insert('bad.mp4', 'bad-preview.webp', 'video/mp4', null), /constraint/i);
  assert.throws(() => insert('bad.png', null, 'image/png', 10), /constraint/i);
  assert.throws(() => insert('bad.avi', null, 'video/avi', null), /constraint/i);
});
