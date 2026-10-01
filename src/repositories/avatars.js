/**
 * Avatar resolution, in its own module so that both the character repository
 * and the relationship repository can use it.
 *
 * It lives here rather than in characters.js because characters.js already
 * imports relationships.js; having relationships.js import characters.js back
 * would make the two modules circular. Duplicating the rule instead would give
 * the gallery and the relationship map two different ideas of which avatar a
 * character has, and only one of them would be rating-filtered correctly.
 */

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

/** Resolve the avatar for a character id, loading the row it needs itself. */
export function resolveAvatarForCharacterId(db, characterId, { showNsfw }) {
  const row = db.prepare(
    'SELECT id, avatar_image_id AS avatarImageId FROM character WHERE id = ?',
  ).get(characterId);

  if (!row) return null;

  return resolveEffectiveAvatar(db, row, { showNsfw });
}
