import { ValidationError } from '../middleware/errors.js';
import { transaction } from '../db/index.js';
import { deleteImageFiles, storeImage } from './images.js';

function asIdList(value) {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
}

function asBool(value) {
  return value === '1' || value === 'true' || value === 'on' || value === true;
}

function validate(db, body, { requireFile, file }) {
  const fieldErrors = {};

  if (requireFile && (!file || !file.buffer || file.buffer.length === 0)) {
    fieldErrors.image = 'Choose an image file.';
  }

  const altText = String(body.alt_text ?? '').trim();
  if (!altText) fieldErrors.alt_text = 'Enter alt text describing the image.';

  // An image cannot exist without an artist credit (FR-042).
  const artistId = Number(body.artist_id);
  if (!db.prepare('SELECT 1 FROM artist WHERE id = ?').get(artistId)) {
    fieldErrors.artist_id = 'Choose the artist who made this image.';
  }

  // An image must be linked to at least one character (invariant I-4).
  const characterIds = asIdList(body['character_id[]'] ?? body.character_id);
  if (characterIds.length === 0) {
    fieldErrors.character_id = 'Link this image to at least one character.';
  } else if (characterIds.some((id) => !db.prepare('SELECT 1 FROM character WHERE id = ?').get(id))) {
    fieldErrors.character_id = 'One of the chosen characters no longer exists.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('The image could not be saved', fieldErrors);
  }

  return {
    altText,
    artistId,
    characterIds,
    shortDescription: String(body.short_description ?? '').trim() || null,
    isNsfw: asBool(body.is_nsfw),
  };
}

export async function createImage(db, { body, file, config }) {
  const input = validate(db, body, { requireFile: true, file });

  // Written before the transaction because filesystem writes cannot be rolled
  // back; the catch below removes them if the database work fails (FR-068).
  const stored = await storeImage({ buffer: file.buffer, mimeType: file.mimetype, config });

  try {
    return transaction(db, () => {
      const at = new Date().toISOString();

      const imageId = Number(db.prepare(`
        INSERT INTO image
          (file_name, preview_file_name, mime_type, byte_size, width, height,
           alt_text, short_description, artist_id, is_nsfw, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        stored.fileName, stored.previewFileName, stored.mimeType, stored.byteSize,
        stored.width, stored.height, input.altText, input.shortDescription,
        input.artistId, input.isNsfw ? 1 : 0, at, at,
      ).lastInsertRowid);

      for (const characterId of input.characterIds) {
        db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)')
          .run(characterId, imageId);
      }

      return imageId;
    });
  } catch (err) {
    await deleteImageFiles(stored, config);
    throw err;
  }
}

export function updateImage(db, id, body) {
  const existing = db.prepare('SELECT id FROM image WHERE id = ?').get(id);
  if (!existing) throw new ValidationError('Image not found');

  const input = validate(db, body, { requireFile: false });

  // Unlinking must not leave any character with zero images (FR-051).
  const currentLinks = db.prepare('SELECT character_id AS id FROM character_image WHERE image_id = ?')
    .all(id).map((r) => r.id);

  const removed = currentLinks.filter((cid) => !input.characterIds.includes(cid));

  for (const characterId of removed) {
    const remaining = db.prepare(
      'SELECT COUNT(*) n FROM character_image WHERE character_id = ? AND image_id <> ?',
    ).get(characterId, id).n;

    if (remaining === 0) {
      const name = db.prepare('SELECT name FROM character WHERE id = ?').get(characterId).name;
      throw new ValidationError('The image could not be saved', {
        character_id: `${name} would be left with no images. Every character must keep at least one.`,
      });
    }
  }

  return transaction(db, () => {
    db.prepare(`
      UPDATE image SET alt_text = ?, short_description = ?, artist_id = ?, is_nsfw = ?, updated_at = ?
      WHERE id = ?
    `).run(input.altText, input.shortDescription, input.artistId, input.isNsfw ? 1 : 0,
      new Date().toISOString(), id);

    db.prepare('DELETE FROM character_image WHERE image_id = ?').run(id);
    for (const characterId of input.characterIds) {
      db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)')
        .run(characterId, id);
    }

    // Any character whose avatar was this image keeps a valid avatar.
    db.prepare(`
      UPDATE character SET avatar_image_id = (
        SELECT image_id FROM character_image
        WHERE character_id = character.id ORDER BY position, rowid LIMIT 1
      )
      WHERE avatar_image_id IS NULL
    `).run();

    return id;
  });
}

export async function deleteImage(db, id, { confirm, config }) {
  const image = db.prepare(`
    SELECT id, file_name AS fileName, preview_file_name AS previewFileName, alt_text AS altText
    FROM image WHERE id = ?
  `).get(id);

  if (!image) throw new ValidationError('Image not found');

  if (confirm !== 'delete') {
    throw new ValidationError('The image was not deleted', {
      confirm: 'Type "delete" to confirm removing this image.',
    });
  }

  // Refuse if any linked character would be left with none (FR-051).
  const stranded = db.prepare(`
    SELECT c.name
    FROM character c
    JOIN character_image ci ON ci.character_id = c.id
    WHERE ci.image_id = :id
      AND NOT EXISTS (
        SELECT 1 FROM character_image other
        WHERE other.character_id = c.id AND other.image_id <> :id
      )
  `).all({ id });

  if (stranded.length > 0) {
    throw new ValidationError('The image was not deleted', {
      confirm: `${stranded.map((c) => c.name).join(', ')} would be left with no images. `
        + 'Add another image to them first.',
    });
  }

  transaction(db, () => {
    db.prepare('UPDATE character SET avatar_image_id = NULL WHERE avatar_image_id = ?').run(id);
    db.prepare('DELETE FROM image WHERE id = ?').run(id);
    db.prepare(`
      UPDATE character SET avatar_image_id = (
        SELECT image_id FROM character_image
        WHERE character_id = character.id ORDER BY position, rowid LIMIT 1
      )
      WHERE avatar_image_id IS NULL
    `).run();
  });

  await deleteImageFiles(image, config);
}
