import { ValidationError } from '../middleware/errors.js';
import { transaction } from '../db/index.js';
import { normaliseName } from '../lib/names.js';
import { uniqueSlug } from '../lib/slug.js';
import { listAllSlugs } from '../repositories/characters.js';
import { deleteImageFiles, storeImage } from './images.js';

function asIdList(value) {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
}

function asTextList(value) {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((v) => normaliseName(v)).filter(Boolean);
}

function asBool(value) {
  return value === '1' || value === 'true' || value === 'on' || value === true;
}

function exists(db, table, id) {
  if (!Number.isInteger(id) || id <= 0) return false;
  return db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id) !== undefined;
}

/**
 * Validate the non-image character fields.
 *
 * Every field named here is mandatory by invariant: a character cannot exist
 * without a designer, a gender, terms of use, explicit permissions, at least
 * one job title, or at least one tag (FR-041, invariants I-1â€¦I-3).
 * Traits alone are optional (FR-060).
 */
export function validateCharacterInput(db, body) {
  const fieldErrors = {};

  const name = normaliseName(body.name);
  if (!name) fieldErrors.name = 'Enter a name.';

  const shortDescription = String(body.short_description ?? '').trim();
  if (!shortDescription) fieldErrors.short_description = 'Enter a short description.';

  const termsOfUse = String(body.terms_of_use ?? '').trim();
  if (!termsOfUse) fieldErrors.terms_of_use = 'Enter the terms of use.';

  const genderId = Number(body.gender_id);
  if (!exists(db, 'gender', genderId)) fieldErrors.gender_id = 'Choose a gender from the managed list.';

  const designerId = Number(body.designer_id);
  if (!exists(db, 'designer', designerId)) fieldErrors.designer_id = 'Choose a designer.';

  const jobTitles = asTextList(body['job_title[]'] ?? body.job_title);
  if (jobTitles.length === 0) fieldErrors.job_title = 'Add at least one job title.';

  const tagIds = asIdList(body['tag_id[]'] ?? body.tag_id);
  if (tagIds.length === 0) fieldErrors.tag_id = 'Choose at least one tag.';
  else if (tagIds.some((id) => !exists(db, 'tag', id))) fieldErrors.tag_id = 'One of the chosen tags no longer exists.';

  // Traits are optional by design â€” zero is valid and must never error.
  const traitIds = asIdList(body['trait_id[]'] ?? body.trait_id)
    .filter((id) => exists(db, 'trait', id));

  for (const key of ['can_regift', 'can_retrade', 'can_resell']) {
    if (body[key] !== '0' && body[key] !== '1') {
      fieldErrors[key] = 'Choose either allowed or not allowed.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('The character could not be saved', fieldErrors);
  }

  return {
    name,
    shortDescription,
    termsOfUse,
    genderId,
    designerId,
    jobTitles,
    tagIds,
    traitIds,
    canRegift: body.can_regift === '1',
    canRetrade: body.can_retrade === '1',
    canResell: body.can_resell === '1',
  };
}

function validateImageInput(db, body, file) {
  const fieldErrors = {};

  if (!file || !file.buffer || file.buffer.length === 0) {
    fieldErrors.image = 'Choose an image file.';
  }

  const altText = String(body.image_alt_text ?? '').trim();
  if (!altText) fieldErrors.image_alt_text = 'Enter alt text describing the image.';

  const artistId = Number(body.image_artist_id);
  if (!exists(db, 'artist', artistId)) fieldErrors.image_artist_id = 'Choose the artist who made this image.';

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('The image could not be saved', fieldErrors);
  }

  return {
    altText,
    artistId,
    shortDescription: String(body.image_short_description ?? '').trim() || null,
    isNsfw: asBool(body.image_is_nsfw),
  };
}

function replaceLinks(db, characterId, { jobTitles, tagIds, traitIds }) {
  db.prepare('DELETE FROM character_job_title WHERE character_id = ?').run(characterId);
  jobTitles.forEach((title, index) => {
    db.prepare('INSERT INTO character_job_title (character_id, title, position) VALUES (?, ?, ?)')
      .run(characterId, title, index);
  });

  db.prepare('DELETE FROM character_tag WHERE character_id = ?').run(characterId);
  for (const tagId of tagIds) {
    db.prepare('INSERT INTO character_tag (character_id, tag_id) VALUES (?, ?)').run(characterId, tagId);
  }

  db.prepare('DELETE FROM character_trait WHERE character_id = ?').run(characterId);
  for (const traitId of traitIds) {
    db.prepare('INSERT INTO character_trait (character_id, trait_id) VALUES (?, ?)').run(characterId, traitId);
  }
}

/**
 * Create a character and its first image atomically (FR-049, FR-050).
 *
 * The file is written to disk BEFORE the transaction opens, because filesystem
 * writes cannot be rolled back by SQLite. If the transaction then fails, the
 * catch block deletes the files, so a failure leaves neither a half-made
 * character nor an orphaned upload.
 */
export async function createCharacterWithImage(db, { body, file, config }) {
  const characterInput = validateCharacterInput(db, body);
  const imageInput = validateImageInput(db, body, file);

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
        stored.width, stored.height, imageInput.altText, imageInput.shortDescription,
        imageInput.artistId, imageInput.isNsfw ? 1 : 0, at, at,
      ).lastInsertRowid);

      const slug = uniqueSlug(characterInput.name, listAllSlugs(db));

      const characterId = Number(db.prepare(`
        INSERT INTO character
          (name, slug, gender_id, short_description, terms_of_use,
           can_regift, can_retrade, can_resell, designer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        characterInput.name, slug, characterInput.genderId, characterInput.shortDescription,
        characterInput.termsOfUse, characterInput.canRegift ? 1 : 0,
        characterInput.canRetrade ? 1 : 0, characterInput.canResell ? 1 : 0,
        characterInput.designerId, at, at,
      ).lastInsertRowid);

      db.prepare('INSERT INTO character_image (character_id, image_id, position) VALUES (?, ?, 0)')
        .run(characterId, imageId);

      // avatar_image_id is nullable only to break the circular insert between
      // character and image; it is set before this transaction commits, so a
      // committed character always has a designated avatar (invariant I-6).
      db.prepare('UPDATE character SET avatar_image_id = ? WHERE id = ?').run(imageId, characterId);

      replaceLinks(db, characterId, characterInput);

      return { characterId, imageId, slug };
    });
  } catch (err) {
    await deleteImageFiles(stored, config);
    throw err;
  }
}

export function updateCharacter(db, id, body) {
  const input = validateCharacterInput(db, body);

  const current = db.prepare('SELECT id, name FROM character WHERE id = ?').get(id);
  if (!current) throw new ValidationError('Character not found');

  // An existing character must keep at least one image; the edit form cannot
  // remove images, but guard anyway (FR-051, invariant I-2).
  const imageCount = db.prepare('SELECT COUNT(*) n FROM character_image WHERE character_id = ?').get(id).n;
  if (imageCount === 0) {
    throw new ValidationError('The character could not be saved', {
      image: 'A character must keep at least one image.',
    });
  }

  let avatarImageId = body.avatar_image_id ? Number(body.avatar_image_id) : null;
  if (avatarImageId) {
    const linked = db.prepare(
      'SELECT 1 FROM character_image WHERE character_id = ? AND image_id = ?',
    ).get(id, avatarImageId);

    if (!linked) {
      throw new ValidationError('The character could not be saved', {
        avatar_image_id: 'The chosen avatar must be one of this character\'s own images.',
      });
    }
  } else {
    avatarImageId = db.prepare(
      'SELECT image_id FROM character_image WHERE character_id = ? ORDER BY position, rowid LIMIT 1',
    ).get(id).image_id;
  }

  return transaction(db, () => {
    db.prepare(`
      UPDATE character SET
        name = ?, gender_id = ?, short_description = ?, terms_of_use = ?,
        can_regift = ?, can_retrade = ?, can_resell = ?, designer_id = ?,
        avatar_image_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.name, input.genderId, input.shortDescription, input.termsOfUse,
      input.canRegift ? 1 : 0, input.canRetrade ? 1 : 0, input.canResell ? 1 : 0,
      input.designerId, avatarImageId, new Date().toISOString(), id,
    );

    replaceLinks(db, id, input);
    return id;
  });
}

/**
 * Delete a character, its relationships, and any image or story that is left
 * with no other character linked to it (FR-029, invariant I-8). Content shared
 * with another character survives.
 */
export async function deleteCharacter(db, id, { confirmName, config }) {
  const character = db.prepare('SELECT id, name FROM character WHERE id = ?').get(id);
  if (!character) throw new ValidationError('Character not found');

  if (normaliseName(confirmName).toLowerCase() !== character.name.toLowerCase()) {
    throw new ValidationError('The character was not deleted', {
      confirm_name: `Type the character's name exactly ("${character.name}") to confirm deletion.`,
    });
  }

  // Identify soon-to-be-orphaned content while the links still exist.
  const orphanImages = db.prepare(`
    SELECT i.id, i.file_name AS fileName, i.preview_file_name AS previewFileName
    FROM image i
    JOIN character_image ci ON ci.image_id = i.id
    WHERE ci.character_id = :id
      AND NOT EXISTS (
        SELECT 1 FROM character_image other
        WHERE other.image_id = i.id AND other.character_id <> :id
      )
  `).all({ id });

  const orphanStories = db.prepare(`
    SELECT s.id
    FROM story s
    JOIN character_story cs ON cs.story_id = s.id
    WHERE cs.character_id = :id
      AND NOT EXISTS (
        SELECT 1 FROM character_story other
        WHERE other.story_id = s.id AND other.character_id <> :id
      )
  `).all({ id });

  transaction(db, () => {
    // Clearing the avatar first avoids the FK on character.avatar_image_id
    // blocking the image deletes below.
    db.prepare('UPDATE character SET avatar_image_id = NULL WHERE id = ?').run(id);
    db.prepare('DELETE FROM character WHERE id = ?').run(id);

    for (const image of orphanImages) {
      db.prepare('DELETE FROM image WHERE id = ?').run(image.id);
    }
    for (const story of orphanStories) {
      db.prepare('DELETE FROM story WHERE id = ?').run(story.id);
    }
  });

  // Files are removed only after the transaction commits: an aborted
  // transaction must not leave the database pointing at deleted files.
  for (const image of orphanImages) {
    await deleteImageFiles(image, config);
  }

  return { deletedImages: orphanImages.length, deletedStories: orphanStories.length };
}
