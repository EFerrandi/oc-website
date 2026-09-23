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

export function listDesigners(db) {
  return db.prepare(`
    SELECT id, name, website_url AS websiteUrl
    FROM designer
    ORDER BY name COLLATE NOCASE
  `).all();
}

export function findDesignerById(db, id) {
  return db.prepare(`
    SELECT id, name, website_url AS websiteUrl FROM designer WHERE id = ?
  `).get(id) ?? null;
}

/**
 * Artists that have at least one image visible at the current rating, with
 * their visible image counts. Artists whose every image is hidden drop out
 * rather than showing an empty group.
 */
export function listArtistsWithVisibleImages(db, { showNsfw }) {
  return db.prepare(`
    SELECT a.id, a.name, a.website_url AS websiteUrl, COUNT(i.id) AS imageCount
    FROM artist a
    JOIN image i ON i.artist_id = a.id
    WHERE (:showNsfw = 1 OR i.is_nsfw = 0)
    GROUP BY a.id, a.name, a.website_url
    ORDER BY a.name COLLATE NOCASE
  `).all({ showNsfw: showNsfw ? 1 : 0 });
}
