export function listArtists(db) {
  return db.prepare(`
    SELECT id, name, website_url AS websiteUrl
    FROM artist
    ORDER BY name COLLATE NOCASE
  `).all();
}

export function findArtistById(db, id) {
  return db.prepare(`
    SELECT id, name, website_url AS websiteUrl FROM artist WHERE id = ?
  `).get(id) ?? null;
}

/** Artists with a visible image or a character design credit. */
export function listArtistsWithVisibleImages(db, { showNsfw }) {
  return db.prepare(`
    SELECT a.id, a.name, a.website_url AS websiteUrl,
           COUNT(DISTINCT CASE WHEN (:showNsfw = 1 OR i.is_nsfw = 0) THEN i.id END) AS imageCount
    FROM artist a
    LEFT JOIN image i ON i.artist_id = a.id AND (:showNsfw = 1 OR i.is_nsfw = 0)
    WHERE :showNsfw = 1
      OR EXISTS (SELECT 1 FROM image visible
                 WHERE visible.artist_id = a.id AND visible.is_nsfw = 0)
      OR EXISTS (SELECT 1 FROM character c WHERE c.artist_id = a.id)
    GROUP BY a.id, a.name, a.website_url
    ORDER BY a.name COLLATE NOCASE
  `).all({ showNsfw: showNsfw ? 1 : 0 });
}
