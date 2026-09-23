import { listImagesForCharacter } from './images.js';
import { listRelationshipsForCharacter } from './relationships.js';
import { listStoriesForCharacter } from './stories.js';
import { listTagsForCharacter } from './tags.js';
import { groupTraits, listTraitsForCharacter } from './traits.js';

/**
 * Resolve the avatar actually shown for a character (FR-014, research R-014).
 *
 * Three steps, in order:
 *   1. the designated avatar, if it is visible at the current rating;
 *   2. otherwise the oldest visible linked image;
 *   3. otherwise none — the caller renders the static placeholder.
 *
 * Returning null rather than hiding the character is the point: a character
 * whose every image is NSFW must still be listed.
 */
export function resolveEffectiveAvatar(db, character, { showNsfw }) {
  const rating = { showNsfw: showNsfw ? 1 : 0 };

  if (character.avatarImageId) {
    const designated = db.prepare(`
      SELECT id, alt_text AS altText, is_nsfw AS isNsfw
      FROM image
      WHERE id = :id AND (:showNsfw = 1 OR is_nsfw = 0)
    `).get({ id: character.avatarImageId, ...rating });

    if (designated) return designated;
  }

  return db.prepare(`
    SELECT i.id, i.alt_text AS altText, i.is_nsfw AS isNsfw
    FROM image i
    JOIN character_image ci ON ci.image_id = i.id
    WHERE ci.character_id = :characterId AND (:showNsfw = 1 OR i.is_nsfw = 0)
    ORDER BY i.created_at, i.id
    LIMIT 1
  `).get({ characterId: character.id, ...rating }) ?? null;
}

function listJobTitles(db, characterId) {
  return db.prepare(`
    SELECT title FROM character_job_title
    WHERE character_id = ?
    ORDER BY position, rowid
  `).all(characterId).map((row) => row.title);
}

const CHARACTER_COLUMNS = `
  c.id, c.name, c.slug, c.gender_id AS genderId,
  c.short_description AS shortDescription, c.terms_of_use AS termsOfUse,
  c.can_regift AS canRegift, c.can_retrade AS canRetrade, c.can_resell AS canResell,
  c.designer_id AS designerId, c.avatar_image_id AS avatarImageId,
  c.created_at AS createdAt, c.updated_at AS updatedAt
`;

/**
 * Gallery listing with AND filter semantics.
 *
 * A character matches only if it carries EVERY requested tag and EVERY
 * requested trait, which is why each taxonomy filter is its own
 * `GROUP BY … HAVING COUNT(DISTINCT …) = n` subquery rather than an `IN` list
 * (an `IN` list would give OR semantics).
 */
export function listCharacters(db, { showNsfw, tags = [], traits = [], gender = null } = {}) {
  const where = [];
  const params = [];

  // tag.name, trait.name and gender.name are declared COLLATE NOCASE, so
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

  if (traits.length > 0) {
    where.push(`c.id IN (
      SELECT ctr.character_id FROM character_trait ctr
      JOIN trait tr ON tr.id = ctr.trait_id
      WHERE tr.name IN (${traits.map(() => '?').join(',')})
      GROUP BY ctr.character_id
      HAVING COUNT(DISTINCT tr.id) = ?
    )`);
    params.push(...traits, traits.length);
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
    avatar: resolveEffectiveAvatar(db, row, { showNsfw }),
  }));
}

export function findCharacterBySlug(db, slug, { showNsfw }) {
  const row = db.prepare(`
    SELECT ${CHARACTER_COLUMNS},
           g.name AS genderName,
           d.name AS designerName, d.website_url AS designerUrl
    FROM character c
    JOIN gender g ON g.id = c.gender_id
    JOIN designer d ON d.id = c.designer_id
    WHERE c.slug = ?
  `).get(slug);

  if (!row) return null;

  const traits = listTraitsForCharacter(db, row.id);

  return {
    ...row,
    canRegift: row.canRegift === 1,
    canRetrade: row.canRetrade === 1,
    canResell: row.canResell === 1,
    jobTitles: listJobTitles(db, row.id),
    tags: listTagsForCharacter(db, row.id),
    traits: groupTraits(traits),
    avatar: resolveEffectiveAvatar(db, row, { showNsfw }),
    images: listImagesForCharacter(db, row.id, { showNsfw }),
    stories: listStoriesForCharacter(db, row.id, { showNsfw }),
    relationships: listRelationshipsForCharacter(db, row.id, { showNsfw }),
  };
}

export function listAllSlugs(db) {
  return new Set(db.prepare('SELECT slug FROM character').all().map((r) => r.slug));
}
