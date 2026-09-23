import { nowIso } from '../../src/lib/dates.js';

/**
 * Seed a known graph used across the suite.
 *
 * Deliberately includes `shadow`, whose ONLY image is NSFW: with NSFW off that
 * character must still appear in the gallery but fall back to the placeholder
 * avatar rather than leaking the NSFW image (FR-014).
 */
export function seedFixtures(db) {
  const at = nowIso();
  const ids = {};

  const insert = (sql, ...params) => db.prepare(sql).run(...params).lastInsertRowid;

  ids.genderFemale = insert('INSERT INTO gender (name, created_at) VALUES (?, ?)', 'Female', at);
  ids.genderMale = insert('INSERT INTO gender (name, created_at) VALUES (?, ?)', 'Male', at);

  ids.designer = insert(
    'INSERT INTO designer (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'Dara Designs', 'https://dara.example/', at, at,
  );
  // No website: the detail page must render the name as plain text (FR-005).
  ids.designerNoSite = insert(
    'INSERT INTO designer (name, website_url, created_at, updated_at) VALUES (?, NULL, ?, ?)',
    'Anon Designer', at, at,
  );

  ids.artistA = insert(
    'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'Aster Art', 'https://aster.example/', at, at,
  );
  ids.artistB = insert(
    'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, NULL, ?, ?)',
    'Brin Brush', at, at,
  );

  ids.tagCute = insert('INSERT INTO tag (name, created_at) VALUES (?, ?)', 'cute', at);
  ids.tagFeral = insert('INSERT INTO tag (name, created_at) VALUES (?, ?)', 'feral', at);

  ids.traitGreed = insert(
    'INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)', 'Greed', 'sin', at, at,
  );
  ids.traitPatience = insert(
    'INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)', 'Patience', 'virtue', at, at,
  );

  const addImage = (key, { artistId, nsfw, alt }) => {
    ids[key] = insert(
      `INSERT INTO image
         (file_name, preview_file_name, mime_type, byte_size, width, height,
          alt_text, short_description, artist_id, is_nsfw, created_at, updated_at)
       VALUES (?, ?, 'image/png', 2048, 1600, 1600, ?, ?, ?, ?, ?, ?)`,
      `${key}.png`, `${key}-preview.png`, alt, `${key} description`, artistId, nsfw ? 1 : 0, at, at,
    );
  };

  addImage('imageSfwA', { artistId: ids.artistA, nsfw: false, alt: 'Aria smiling in a field' });
  addImage('imageSfwB', { artistId: ids.artistB, nsfw: false, alt: 'Brann leaning on a staff' });
  addImage('imageNsfwA', { artistId: ids.artistA, nsfw: true, alt: 'Aria, explicit pose' });
  addImage('imageNsfwShadow', { artistId: ids.artistA, nsfw: true, alt: 'Shadow, explicit pose' });

  ids.storySfw = insert(
    'INSERT INTO story (title, slug, body, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    'A Quiet Morning', 'a-quiet-morning', 'The sun rose over the meadow.', at, at,
  );
  ids.storyNsfw = insert(
    'INSERT INTO story (title, slug, body, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    'After Hours', 'after-hours', 'Explicit story body for gating tests.', at, at,
  );

  const addCharacter = (key, { name, slug, genderId, designerId }) => {
    ids[key] = insert(
      `INSERT INTO character
         (name, slug, gender_id, short_description, terms_of_use,
          can_regift, can_retrade, can_resell, designer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?)`,
      name, slug, genderId, `${name} short description`, 'Do not resell without permission.',
      designerId, at, at,
    );
  };

  addCharacter('aria', { name: 'Aria', slug: 'aria', genderId: ids.genderFemale, designerId: ids.designer });
  addCharacter('brann', { name: 'Brann', slug: 'brann', genderId: ids.genderMale, designerId: ids.designerNoSite });
  addCharacter('shadow', { name: 'Shadow', slug: 'shadow', genderId: ids.genderFemale, designerId: ids.designer });

  const link = (sql, ...params) => db.prepare(sql).run(...params);

  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)', ids.aria, 'Cartographer');
  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 1)', ids.aria, 'Archivist');
  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)', ids.brann, 'Blacksmith');
  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)', ids.shadow, 'Spy');

  link('INSERT INTO character_tag VALUES (?, ?)', ids.aria, ids.tagCute);
  link('INSERT INTO character_tag VALUES (?, ?)', ids.brann, ids.tagFeral);
  link('INSERT INTO character_tag VALUES (?, ?)', ids.shadow, ids.tagCute);
  link('INSERT INTO character_tag VALUES (?, ?)', ids.shadow, ids.tagFeral);

  link('INSERT INTO character_trait VALUES (?, ?)', ids.aria, ids.traitPatience);
  link('INSERT INTO character_trait VALUES (?, ?)', ids.shadow, ids.traitGreed);

  link('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)', ids.aria, ids.imageSfwA);
  link('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 1)', ids.aria, ids.imageNsfwA);
  link('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)', ids.brann, ids.imageSfwB);
  link('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)', ids.shadow, ids.imageNsfwShadow);

  link('UPDATE character SET avatar_image_id = ? WHERE id = ?', ids.imageSfwA, ids.aria);
  link('UPDATE character SET avatar_image_id = ? WHERE id = ?', ids.imageSfwB, ids.brann);
  link('UPDATE character SET avatar_image_id = ? WHERE id = ?', ids.imageNsfwShadow, ids.shadow);

  link('INSERT INTO character_story VALUES (?, ?)', ids.aria, ids.storySfw);
  link('INSERT INTO character_story VALUES (?, ?)', ids.brann, ids.storySfw);
  link('INSERT INTO character_story VALUES (?, ?)', ids.aria, ids.storyNsfw);

  link(
    'INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    ids.aria, ids.brann, 'childhood friends', at, at,
  );
  link(
    'INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    ids.aria, ids.shadow, 'lovers', at, at,
  );

  return ids;
}

/** Strings that must never appear in a response while NSFW is off. */
export const NSFW_MARKERS = [
  'After Hours',
  'Explicit story body for gating tests.',
  'lovers',
  'Aria, explicit pose',
  'Shadow, explicit pose',
];
