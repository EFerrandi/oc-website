import fs from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { loadConfig } from './config.js';
import { openDatabase } from './db/index.js';
import { migrate } from './db/migrate.js';
import { nowIso } from './lib/dates.js';

/**
 * Load a small demonstrable graph into a development database, so the gallery
 * can be browsed before any content has been entered through the admin.
 * Safe to re-run: it does nothing if characters already exist.
 */
async function seed() {
  const config = loadConfig(process.env);
  const db = openDatabase(config.databasePath);
  migrate(db, { log: (m) => console.log(`[migrate] ${m}`) });

  if (db.prepare('SELECT COUNT(*) n FROM character').get().n > 0) {
    console.log('Database already has characters; nothing to seed.');
    db.close();
    return;
  }

  fs.mkdirSync(config.uploadDir, { recursive: true });
  fs.mkdirSync(config.previewDir, { recursive: true });

  const at = nowIso();
  const insert = (sql, ...params) => Number(db.prepare(sql).run(...params).lastInsertRowid);

  const genderF = insert('INSERT INTO gender (name, created_at) VALUES (?, ?)', 'Female', at);
  const genderM = insert('INSERT INTO gender (name, created_at) VALUES (?, ?)', 'Male', at);

  const designer = insert(
    'INSERT INTO designer (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'Sample Designer', 'https://example.com/', at, at,
  );
  const artist = insert(
    'INSERT INTO artist (name, website_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
    'Sample Artist', 'https://example.com/art', at, at,
  );

  const tagCute = insert('INSERT INTO tag (name, created_at) VALUES (?, ?)', 'cute', at);
  const tagFeral = insert('INSERT INTO tag (name, created_at) VALUES (?, ?)', 'feral', at);
  const sin = insert('INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)', 'Greed', 'sin', at, at);
  const virtue = insert('INSERT INTO trait (name, kind, created_at, updated_at) VALUES (?, ?, ?, ?)', 'Patience', 'virtue', at, at);

  async function makeImage(label, hue, isNsfw) {
    const stem = `seed-${label}`;
    const fileName = `${stem}.png`;
    const previewFileName = `${stem}-preview.webp`;

    const buffer = await sharp({
      create: { width: 1200, height: 1200, channels: 3, background: hue },
    }).png().toBuffer();

    fs.writeFileSync(path.join(config.uploadDir, fileName), buffer);
    await sharp(buffer)
      .resize({ width: config.previewMaxEdge, height: config.previewMaxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(config.previewDir, previewFileName));

    return insert(`
      INSERT INTO image
        (file_name, preview_file_name, mime_type, byte_size, width, height,
         alt_text, short_description, artist_id, is_nsfw, created_at, updated_at)
      VALUES (?, ?, 'image/png', ?, 1200, 1200, ?, ?, ?, ?, ?, ?)
    `, fileName, previewFileName, buffer.length,
    `Placeholder artwork for ${label}`, `Seed image: ${label}`, artist, isNsfw ? 1 : 0, at, at);
  }

  const imgA = await makeImage('aria', { r: 120, g: 80, b: 200 }, false);
  const imgB = await makeImage('brann', { r: 200, g: 120, b: 60 }, false);
  const imgNsfw = await makeImage('shadow', { r: 60, g: 60, b: 80 }, true);

  const story = insert(
    'INSERT INTO story (title, slug, body, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    'A Quiet Morning', 'a-quiet-morning',
    'The sun rose slowly over the meadow.\n\nNothing much happened, and that was the point.', at, at,
  );

  function makeCharacter(name, slug, genderId, avatarId) {
    const id = insert(`
      INSERT INTO character
        (name, slug, gender_id, short_description, terms_of_use,
         can_regift, can_retrade, can_resell, designer_id, avatar_image_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?, ?)
    `, name, slug, genderId, `${name} is a sample character.`,
    'Please ask before using this character.', designer, avatarId, at, at);

    db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)').run(id, avatarId);
    return id;
  }

  const aria = makeCharacter('Aria', 'aria', genderF, imgA);
  const brann = makeCharacter('Brann', 'brann', genderM, imgB);
  const shadow = makeCharacter('Shadow', 'shadow', genderF, imgNsfw);

  const link = (sql, ...params) => db.prepare(sql).run(...params);

  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)', aria, 'Cartographer');
  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 1)', aria, 'Archivist');
  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)', brann, 'Blacksmith');
  link('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, 0)', shadow, 'Spy');

  link('INSERT INTO character_tag VALUES (?, ?)', aria, tagCute);
  link('INSERT INTO character_tag VALUES (?, ?)', brann, tagFeral);
  link('INSERT INTO character_tag VALUES (?, ?)', shadow, tagCute);

  link('INSERT INTO character_trait VALUES (?, ?)', aria, virtue);
  link('INSERT INTO character_trait VALUES (?, ?)', shadow, sin);

  link('INSERT INTO character_story VALUES (?, ?)', aria, story);
  link('INSERT INTO character_story VALUES (?, ?)', brann, story);

  link(
    'INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    aria, brann, 'childhood friends', at, at,
  );
  link(
    'INSERT INTO relationship (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
    aria, shadow, 'lovers', at, at,
  );

  console.log('Seeded 3 characters, 3 images, 1 story and 2 relationships.');
  db.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
