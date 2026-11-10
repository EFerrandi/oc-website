export function getImageStatistics(db) {
  const characters = db.prepare(`
    SELECT c.id, c.name,
           COUNT(i.id) AS total,
           SUM(CASE WHEN i.is_nsfw = 0 THEN 1 ELSE 0 END) AS sfw,
           SUM(CASE WHEN i.is_nsfw = 1 THEN 1 ELSE 0 END) AS nsfw
    FROM character c
    LEFT JOIN character_image ci ON ci.character_id = c.id
    LEFT JOIN image i ON i.id = ci.image_id
    GROUP BY c.id, c.name
    ORDER BY c.name COLLATE NOCASE
  `).all();

  const totals = characters.reduce((result, character) => ({
    total: result.total + character.total,
    sfw: result.sfw + character.sfw,
    nsfw: result.nsfw + character.nsfw,
  }), { total: 0, sfw: 0, nsfw: 0 });

  return {
    characters,
    totals,
    percentages: {
      sfw: totals.total ? Math.round((totals.sfw / totals.total) * 100) : 0,
      nsfw: totals.total ? Math.round((totals.nsfw / totals.total) * 100) : 0,
    },
  };
}
