import { Router } from 'express';

import { NotFoundError } from '../../middleware/errors.js';
import { findVisibleImageById, listCharactersForImage } from '../../repositories/images.js';

/** Standalone full-size view — the href every preview anchor points at. */
export function imagesRouter() {
  const router = Router();

  router.get('/images/:imageId', (req, res, next) => {
    const db = req.app.locals.db;

    const id = Number(req.params.imageId);
    if (!Number.isInteger(id) || id <= 0) return next(new NotFoundError());

    const image = findVisibleImageById(db, id, { showNsfw: res.locals.showNsfw });
    if (!image) return next(new NotFoundError());

    return res.render('pages/image.njk', {
      image: { ...image, isNsfw: image.isNsfw === 1 },
      characters: listCharactersForImage(db, id),
    });
  });

  return router;
}
