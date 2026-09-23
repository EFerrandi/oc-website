const IMAGE_COLUMNS = `
  i.id, i.file_name AS fileName, i.preview_file_name AS previewFileName,
  i.mime_type AS mimeType, i.byte_size AS byteSize, i.width, i.height,
  i.alt_text AS altText, i.short_description AS shortDescription,
  i.artist_id AS artistId, i.is_nsfw AS isNsfw, i.created_at AS createdAt
`;

/** Images linked to a character, rating-filtered, in curated order. */
export function listImagesForCharacter(db, characterId, { showNsfw }) {
  return db.prepare(`
    SELECT ${IMAGE_COLUMNS}, a.name AS artistName, a.website_url AS artistUrl
    FROM image i
    JOIN character_image ci ON ci.image_id = i.id
    JOIN artist a ON a.id = i.artist_id
    WHERE ci.character_id = :characterId
      AND (:showNsfw = 1 OR i.is_nsfw = 0)
    ORDER BY ci.position, i.created_at, i.id
  `).all({ characterId, showNsfw: showNsfw ? 1 : 0 });
}

/**
 * Fetch one image only if it is visible at the current rating.
 *
 * Returns null both for "does not exist" and for "exists but hidden", so
 * callers cannot accidentally distinguish the two and answer 403 (FR-012).
 */
export function findVisibleImageById(db, id, { showNsfw }) {
  return db.prepare(`
    SELECT ${IMAGE_COLUMNS}, a.name AS artistName, a.website_url AS artistUrl
    FROM image i
    JOIN artist a ON a.id = i.artist_id
    WHERE i.id = :id AND (:showNsfw = 1 OR i.is_nsfw = 0)
  `).get({ id, showNsfw: showNsfw ? 1 : 0 }) ?? null;
}

export function listImagesByArtist(db, artistId, { showNsfw }) {
  return db.prepare(`
    SELECT ${IMAGE_COLUMNS}
    FROM image i
    WHERE i.artist_id = :artistId AND (:showNsfw = 1 OR i.is_nsfw = 0)
    ORDER BY i.created_at DESC, i.id DESC
  `).all({ artistId, showNsfw: showNsfw ? 1 : 0 });
}

export function listCharactersForImage(db, imageId) {
  return db.prepare(`
    SELECT c.id, c.name, c.slug
    FROM character c
    JOIN character_image ci ON ci.character_id = c.id
    WHERE ci.image_id = ?
    ORDER BY c.name COLLATE NOCASE
  `).all(imageId);
}
