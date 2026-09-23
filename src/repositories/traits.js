export function listTraits(db) {
  return db.prepare(`
    SELECT id, name, kind FROM trait ORDER BY kind, name COLLATE NOCASE
  `).all();
}

export function listTraitsForCharacter(db, characterId) {
  return db.prepare(`
    SELECT t.id, t.name, t.kind
    FROM trait t
    JOIN character_trait ct ON ct.trait_id = t.id
    WHERE ct.character_id = ?
    ORDER BY t.name COLLATE NOCASE
  `).all(characterId);
}

/** Split a trait list into the two headings the detail page renders (FR-056). */
export function groupTraits(traits) {
  return {
    sins: traits.filter((t) => t.kind === 'sin'),
    virtues: traits.filter((t) => t.kind === 'virtue'),
  };
}

export function listTraitFacets(db, characterIds) {
  if (characterIds.length === 0) return { sins: [], virtues: [] };

  const placeholders = characterIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT t.id, t.name, t.kind, COUNT(DISTINCT ct.character_id) AS characterCount
    FROM trait t
    JOIN character_trait ct ON ct.trait_id = t.id
    WHERE ct.character_id IN (${placeholders})
    GROUP BY t.id, t.name, t.kind
    ORDER BY t.name COLLATE NOCASE
  `).all(...characterIds);

  return groupTraits(rows);
}
