export function listStoriesForCharacter(db, characterId, { showNsfw }) {
  return db.prepare(`
    SELECT s.id, s.title, s.slug, s.body, s.is_nsfw AS isNsfw, s.created_at AS createdAt
    FROM story s
    JOIN character_story cs ON cs.story_id = s.id
    WHERE cs.character_id = :characterId
      AND (:showNsfw = 1 OR s.is_nsfw = 0)
    ORDER BY s.created_at, s.id
  `).all({ characterId, showNsfw: showNsfw ? 1 : 0 });
}

/** Null for both "missing" and "hidden" — the caller must answer 404 either way. */
export function findVisibleStoryBySlug(db, slug, { showNsfw }) {
  return db.prepare(`
    SELECT id, title, slug, body, is_nsfw AS isNsfw, created_at AS createdAt
    FROM story
    WHERE slug = :slug AND (:showNsfw = 1 OR is_nsfw = 0)
  `).get({ slug, showNsfw: showNsfw ? 1 : 0 }) ?? null;
}

export function listCharactersForStory(db, storyId) {
  return db.prepare(`
    SELECT c.id, c.name, c.slug
    FROM character c
    JOIN character_story cs ON cs.character_id = c.id
    WHERE cs.story_id = ?
    ORDER BY c.name COLLATE NOCASE
  `).all(storyId);
}
