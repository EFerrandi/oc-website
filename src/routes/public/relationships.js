import { Router } from 'express';

import { listRelationshipCards } from '../../repositories/relationships.js';

export function relationshipsRouter() {
  const router = Router();

  router.get('/relationships', (req, res) => {
    const cards = listRelationshipCards(req.app.locals.db, { showNsfw: res.locals.showNsfw });
    res.render('pages/relationships.njk', { cards });
  });

  return router;
}
