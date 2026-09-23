import { Router } from 'express';

export function adminDashboardRouter() {
  const router = Router();

  router.get('/admin', (req, res) => {
    const db = req.app.locals.db;
    const count = (table) => db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;

    res.render('admin/dashboard.njk', {
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
