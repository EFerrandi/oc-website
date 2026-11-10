import { Router } from 'express';
import { getImageStatistics } from '../../repositories/image-statistics.js';

export function adminDashboardRouter() {
  const router = Router();

  router.get('/admin', (req, res) => {
    const db = req.app.locals.db;
    const count = (table) => db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
    const imageStatistics = getImageStatistics(db);
    let chartOffset = 0;
    imageStatistics.chart = imageStatistics.characters.map((character, index) => {
      const percentage = imageStatistics.totals.total
        ? (character.total / imageStatistics.totals.total) * 100
        : 0;
      const slice = { ...character, percentage, offset: chartOffset, colorIndex: index % 8 };
      chartOffset += percentage;
      return slice;
    });

    res.render('admin/dashboard.njk', {
      imageStatistics,
      counts: {
        characters: count('character'),
        images: count('image'),
        stories: count('story'),
        relationships: count('relationship'),
      },
    });
  });

  return router;
}
