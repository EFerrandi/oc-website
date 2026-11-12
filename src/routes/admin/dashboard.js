import { Router } from 'express';
import { getImageStatistics } from '../../repositories/image-statistics.js';

export function adminDashboardRouter() {
  const router = Router();

  router.get('/admin', (req, res) => {
    const db = req.app.locals.db;
    const count = (table) => db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
    const imageStatistics = getImageStatistics(db);
    const { sfw, nsfw, total } = imageStatistics.totals;
    let chartOffset = 0;
    imageStatistics.chart = [['sfw', sfw], ['nsfw', nsfw]]
      .filter(([, n]) => n > 0 && total > 0)
      .map(([rating, n]) => {
        const percentage = (n / total) * 100;
        const arc = { rating, label: rating.toUpperCase(), count: n, percentage, offset: chartOffset };
        chartOffset += percentage;
        return arc;
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
