/**
 * Avatar resolution, in its own module so that both the character repository
 * and the relationship repository can use it.
 *
 * It lives here rather than in characters.js because characters.js already
 * imports relationships.js; having relationships.js import characters.js back
 * would make the two modules circular. Duplicating the rule instead would give
 * the gallery and the relationship map two different ideas of which avatar a
 * character has.
 */

/**
 * Resolve the avatar shown for a character (spec 015, constitution I 2.0.0).
 *
 * The content rating is deliberately NOT an input: avatars are public.
 *   1. the designated avatar, if it is a still image;
 *   2. otherwise the oldest linked still image, whatever its rating;
 *   3. otherwise none — the caller renders the static placeholder.
 *
 * Alt text of an adult avatar is replaced by the character's name unless the
 * visitor opted in, so explicit wording never reaches anyone else.
 */
export function resolveEffectiveAvatar(db, character, { showNsfw }) {
  let avatar = null;

  if (character.avatarImageId) {
    avatar = db.prepare(`
      SELECT id, alt_text AS altText, is_nsfw AS isNsfw, width, height
      FROM image
      WHERE id = :id AND mime_type NOT LIKE 'video/%'
    `).get({ id: character.avatarImageId }) ?? null;
  }

  avatar ??= db.prepare(`
    SELECT i.id, i.alt_text AS altText, i.is_nsfw AS isNsfw, i.width, i.height
    FROM image i
    JOIN character_image ci ON ci.image_id = i.id
    WHERE ci.character_id = :characterId AND i.mime_type NOT LIKE 'video/%'
    ORDER BY i.created_at, i.id
    LIMIT 1
  `).get({ characterId: character.id }) ?? null;

  if (avatar && avatar.isNsfw === 1 && !showNsfw) {
    return { ...avatar, altText: character.name ?? '' };
  }

  return avatar;
}

/** Resolve the avatar for a character id, loading the row it needs itself. */
export function resolveAvatarForCharacterId(db, characterId, { showNsfw }) {
  const row = db.prepare(
    'SELECT id, name, avatar_image_id AS avatarImageId FROM character WHERE id = ?',
  ).get(characterId);

  if (!row) return null;

  return resolveEffectiveAvatar(db, row, { showNsfw });
}

/**
 * Is this image the avatar of at least one character right now? Computed per
 * request, never stored, so an image stops being public the moment it stops
 * being an avatar. This is the single definition the media gate relies on.
 */
export function isCurrentAvatar(db, imageId) {
  const designated = db.prepare(`
    SELECT 1 FROM character c
    JOIN image i ON i.id = c.avatar_image_id
    WHERE c.avatar_image_id = ? AND i.mime_type NOT LIKE 'video/%'
    LIMIT 1
  `).get(imageId);
  if (designated) return true;

  const candidates = db.prepare(`
    SELECT c.id, c.avatar_image_id AS avatarImageId
    FROM character c
    JOIN character_image ci ON ci.character_id = c.id
    WHERE ci.image_id = ?
  `).all(imageId);

  return candidates.some((row) => {
    const avatar = resolveEffectiveAvatar(db, row, { showNsfw: true });
    return avatar?.id === imageId;
  });
}
