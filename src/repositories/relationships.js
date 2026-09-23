const SELECT_RELATIONSHIP = `
  SELECT r.id, r.label, r.is_nsfw AS isNsfw,
         f.id AS fromId, f.name AS fromName, f.slug AS fromSlug,
         t.id AS toId,   t.name AS toName,   t.slug AS toSlug
  FROM relationship r
  JOIN character f ON f.id = r.from_character_id
  JOIN character t ON t.id = r.to_character_id
`;

function shape(row) {
  return {
    id: row.id,
    label: row.label,
    isNsfw: row.isNsfw === 1,
    from: { id: row.fromId, name: row.fromName, slug: row.fromSlug },
    to: { id: row.toId, name: row.toName, slug: row.toSlug },
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

export function listAllRelationships(db, { showNsfw }) {
  return db.prepare(`
    ${SELECT_RELATIONSHIP}
    WHERE (:showNsfw = 1 OR r.is_nsfw = 0)
    ORDER BY f.name COLLATE NOCASE, t.name COLLATE NOCASE, r.id
  `).all({ showNsfw: showNsfw ? 1 : 0 }).map(shape);
}

/**
 * Split into the two cards the relationships page renders. The NSFW card is
 * always empty when the visitor has not opted in, because the query above
 * already excluded those rows.
 */
export function listRelationshipCards(db, { showNsfw }) {
  const all = listAllRelationships(db, { showNsfw });
  return {
    sfw: all.filter((r) => !r.isNsfw),
    nsfw: all.filter((r) => r.isNsfw),
  };
}
