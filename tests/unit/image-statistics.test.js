import assert from 'node:assert/strict';
import test from 'node:test';

import { getImageStatistics } from '../../src/repositories/image-statistics.js';
import { createTestDatabase } from '../helpers/db.js';
import { seedFixtures } from '../helpers/fixtures.js';

test('image statistics count character-image associations, including shared images', (t) => {
  const { db, cleanup } = createTestDatabase();
  t.after(cleanup);
  const ids = seedFixtures(db);

  db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 2)')
    .run(ids.brann, ids.imageSfwA);
  const stats = getImageStatistics(db);

  assert.deepEqual({ ...stats.totals }, { total: 5, sfw: 3, nsfw: 2 });
  assert.deepEqual({ ...stats.percentages }, { sfw: 60, nsfw: 40 });
  assert.deepEqual(
    stats.characters.map(({ name, total }) => [name, total]),
    [['Aria', 2], ['Brann', 2], ['Shadow', 1]],
  );
});

test('empty image statistics report zero counts and percentages', (t) => {
  const { db, cleanup } = createTestDatabase();
  t.after(cleanup);

  const stats = getImageStatistics(db);
  assert.deepEqual({ ...stats.totals }, { total: 0, sfw: 0, nsfw: 0 });
  assert.deepEqual({ ...stats.percentages }, { sfw: 0, nsfw: 0 });
  assert.equal(stats.characters.length, 0);
});
