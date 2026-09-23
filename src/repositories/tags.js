export function listTags(db) {
  return db.prepare('SELECT id, name FROM tag ORDER BY name COLLATE NOCASE').all();
}

export function listTagsForCharacter(db, characterId) {
  return db.prepare(`
    SELECT t.id, t.name
    FROM tag t
    JOIN character_tag ct ON ct.tag_id = t.id
    WHERE ct.character_id = ?
    ORDER BY t.name COLLATE NOCASE
  `).all(characterId);
}

/**
 * Tag facets derived from a given set of character ids — never from the full
 * tag table — so no offered option can yield zero results (FR-016, FR-040).
 */
export function listTagFacets(db, characterIds) {
  if (characterIds.length === 0) return [];

  const placeholders = characterIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT t.id, t.name, COUNT(DISTINCT ct.character_id) AS characterCount
    FROM tag t
    JOIN character_tag ct ON ct.tag_id = t.id
    WHERE ct.character_id IN (${placeholders})
    GROUP BY t.id, t.name
    ORDER BY t.name COLLATE NOCASE
  `).all(...characterIds);
}
