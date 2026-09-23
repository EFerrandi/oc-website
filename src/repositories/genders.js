export function listGenders(db) {
  return db.prepare('SELECT id, name FROM gender ORDER BY name COLLATE NOCASE').all();
}

/** Gender facets derived from the currently visible character set (FR-056). */
export function listGenderFacets(db, characterIds) {
  if (characterIds.length === 0) return [];

  const placeholders = characterIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT g.id, g.name, COUNT(c.id) AS characterCount
    FROM gender g
    JOIN character c ON c.gender_id = g.id
    WHERE c.id IN (${placeholders})
    GROUP BY g.id, g.name
    ORDER BY g.name COLLATE NOCASE
  `).all(...characterIds);
}
