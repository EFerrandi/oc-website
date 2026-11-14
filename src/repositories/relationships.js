import { resolveAvatarForCharacterId } from './avatars.js';

const SELECT_RELATIONSHIP = `
  SELECT r.id, r.label, r.is_nsfw AS isNsfw, r.is_one_sided AS isOneSided,
         f.id AS fromId, f.name AS fromName, f.slug AS fromSlug,
         f.avatar_crop_x AS fromCropX, f.avatar_crop_y AS fromCropY, f.avatar_crop_zoom AS fromCropZoom,
         t.id AS toId,   t.name AS toName,   t.slug AS toSlug,
         t.avatar_crop_x AS toCropX, t.avatar_crop_y AS toCropY, t.avatar_crop_zoom AS toCropZoom
  FROM relationship r
  JOIN character f ON f.id = r.from_character_id
  JOIN character t ON t.id = r.to_character_id
`;

function shape(row) {
  return {
    id: row.id,
    label: row.label,
    isNsfw: row.isNsfw === 1,
    isOneSided: row.isOneSided === 1,
    from: {
      id: row.fromId, name: row.fromName, slug: row.fromSlug,
      crop: { x: row.fromCropX, y: row.fromCropY, zoom: row.fromCropZoom },
    },
    to: {
      id: row.toId, name: row.toName, slug: row.toSlug,
      crop: { x: row.toCropX, y: row.toCropY, zoom: row.toCropZoom },
    },
  };
}

/** Relationships touching a character, in either direction, rating-filtered. */
export function listRelationshipsForCharacter(db, characterId, { showNsfw }) {
  return db.prepare(`
    ${SELECT_RELATIONSHIP}
    WHERE (r.from_character_id = :characterId OR r.to_character_id = :characterId)
      AND (:showNsfw = 1 OR r.is_nsfw = 0)
    ORDER BY r.label COLLATE NOCASE, r.id
  `).all({ characterId, showNsfw: showNsfw ? 1 : 0 }).map(shape);
}

/** Relationships touching a character, rating-filtered and enriched with safe avatar previews. */
export function listRelationshipsForCharacterWithAvatars(db, characterId, { showNsfw }) {
  const rows = listRelationshipsForCharacter(db, characterId, { showNsfw });
  const cache = new Map();

  const withAvatar = (character) => {
    if (!cache.has(character.id)) {
      cache.set(character.id, resolveAvatarForCharacterId(db, character.id, { showNsfw }));
    }

    return { ...character, avatar: cache.get(character.id) };
  };

  return rows.map((row) => ({
    ...row,
    from: withAvatar(row.from),
    to: withAvatar(row.to),
  }));
}

export function listAllRelationships(db, { showNsfw }) {
  return db.prepare(`
    ${SELECT_RELATIONSHIP}
    WHERE (:showNsfw = 1 OR r.is_nsfw = 0)
    ORDER BY f.name COLLATE NOCASE, t.name COLLATE NOCASE, r.id
  `).all({ showNsfw: showNsfw ? 1 : 0 }).map(shape);
}

/**
 * The same rows as listAllRelationships, with each endpoint's effective avatar
 * attached, for drawing the relationship map.
 *
 * The avatar goes through resolveEffectiveAvatar — the same path the gallery
 * uses — rather than reading avatar_image_id directly, so the map shows the
 * same avatar as every other listing, NSFW or not (the preview is exempt from
 * the rating gate; alt text is neutralised for visitors who have not opted in).
 *
 * Avatars are cached per character within one call because a character
 * typically appears in several relationships and the resolution costs two
 * queries each time.
 */
export function listRelationshipsWithAvatars(db, { showNsfw }) {
  const rows = listAllRelationships(db, { showNsfw });
  const cache = new Map();

  const avatarFor = (characterId) => {
    if (!cache.has(characterId)) {
      cache.set(characterId, resolveAvatarForCharacterId(db, characterId, { showNsfw }));
    }
    return cache.get(characterId);
  };

  return rows.map((row) => ({
    ...row,
    from: { ...row.from, avatar: avatarFor(row.from.id) },
    to: { ...row.to, avatar: avatarFor(row.to.id) },
  }));
}

/**
 * Split into the two cards the relationships page renders. The NSFW card is
 * always empty when the visitor has not opted in, because the query above
 * already excluded those rows.
 */
export function listRelationshipCards(db, { showNsfw }) {
  const all = listRelationshipsWithAvatars(db, { showNsfw });
  return {
    sfw: all.filter((r) => !r.isNsfw),
    nsfw: all.filter((r) => r.isNsfw),
  };
}
