import { Router } from 'express';

import { findCharacterBySlug } from '../../repositories/characters.js';
import { NotFoundError } from '../../middleware/errors.js';

export function characterRouter() {
  const router = Router();

  router.get('/characters/:slug', (req, res, next) => {
    const character = findCharacterBySlug(
      req.app.locals.db,
      req.params.slug,
      { showNsfw: res.locals.showNsfw },
    );

    if (!character) return next(new NotFoundError());

    // The page stays reachable even when every image and story is hidden by
    // the current rating (FR-052); only the sections go empty.
    return res.render('pages/character.njk', { character });
  });

  return router;
}
