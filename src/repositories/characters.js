import { resolveEffectiveAvatar } from './avatars.js';
import { listImagesForCharacter } from './images.js';
import { listRelationshipsForCharacterWithAvatars } from './relationships.js';
import { listStoriesForCharacter } from './stories.js';
import { listTagsForCharacter } from './tags.js';

// Re-exported so existing callers and tests keep their import path. The
// implementation moved to avatars.js to break a circular import — see the
// comment at the top of that file.
export { resolveEffectiveAvatar };

function listJobTitles(db, characterId) {
  return db.prepare(`
    SELECT title FROM character_job_title
    WHERE character_id = ?
    ORDER BY position, rowid
  `).all(characterId).map((row) => row.title);
}

const CHARACTER_COLUMNS = `
  c.id, c.name, c.slug, c.gender_id AS genderId,
  c.short_description AS shortDescription,
  c.artist_id AS artistId, c.avatar_image_id AS avatarImageId,
  c.avatar_crop_x AS avatarCropX, c.avatar_crop_y AS avatarCropY,
  c.avatar_crop_zoom AS avatarCropZoom,
  c.created_at AS createdAt, c.updated_at AS updatedAt
`;

/**
 * A character matches only if it carries EVERY requested tag. A grouped
 * subquery preserves AND semantics for repeatable tag filters.
 */
export function listCharacters(db, { showNsfw, tags = [], gender = null } = {}) {
  const where = [];
  const params = [];

  // tag.name and gender.name are declared COLLATE NOCASE, so
  // these comparisons are already case-insensitive without an explicit clause.
  if (tags.length > 0) {
    where.push(`c.id IN (
      SELECT ct.character_id FROM character_tag ct
      JOIN tag t ON t.id = ct.tag_id
      WHERE t.name IN (${tags.map(() => '?').join(',')})
      GROUP BY ct.character_id
      HAVING COUNT(DISTINCT t.id) = ?
    )`);
    params.push(...tags, tags.length);
  }

  if (gender) {
    where.push('g.name = ?');
    params.push(gender);
  }

  const rows = db.prepare(`
    SELECT ${CHARACTER_COLUMNS}, g.name AS genderName
    FROM character c
    JOIN gender g ON g.id = c.gender_id
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY c.name COLLATE NOCASE
  `).all(...params);

  return rows.map((row) => ({
    ...row,
    jobTitles: listJobTitles(db, row.id),
    avatar: resolveAvatarWithCrop(db, row, { showNsfw }),
  }));
}

function resolveAvatarWithCrop(db, row, { showNsfw }) {
  const avatar = resolveEffectiveAvatar(db, row, { showNsfw });
  if (!avatar || avatar.id !== row.avatarImageId) return avatar;
  return {
    ...avatar,
    cropX: row.avatarCropX ?? 50,
    cropY: row.avatarCropY ?? 50,
    cropZoom: row.avatarCropZoom ?? 1,
  };
}

export function findCharacterBySlug(db, slug, { showNsfw, includeOwnership = false }) {
  const row = db.prepare(`
    SELECT ${CHARACTER_COLUMNS},
           g.name AS genderName,
           c.personality AS personality,
           c.physical_description AS physicalDescription,
           a.name AS artistName, a.website_url AS artistUrl
           ${includeOwnership ? `,
           c.terms_of_use AS termsOfUse, c.can_regift AS canRegift,
           c.can_retrade AS canRetrade, c.can_resell AS canResell` : ''}
    FROM character c
    JOIN gender g ON g.id = c.gender_id
    JOIN artist a ON a.id = c.artist_id
    WHERE c.slug = ?
  `).get(slug);

  if (!row) return null;

  return {
    ...row,
    ...(includeOwnership ? {
      canRegift: row.canRegift === 1,
      canRetrade: row.canRetrade === 1,
      canResell: row.canResell === 1,
    } : {}),
    jobTitles: listJobTitles(db, row.id),
    tags: listTagsForCharacter(db, row.id),
    avatar: resolveAvatarWithCrop(db, row, { showNsfw }),
    images: listImagesForCharacter(db, row.id, { showNsfw }),
    stories: listStoriesForCharacter(db, row.id, { showNsfw }),
    relationships: listRelationshipsForCharacterWithAvatars(db, row.id, { showNsfw }),
  };
}

export function listAllSlugs(db) {
  return new Set(db.prepare('SELECT slug FROM character').all().map((r) => r.slug));
}
