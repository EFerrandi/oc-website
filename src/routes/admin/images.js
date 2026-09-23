import { Router } from 'express';

import { verifyCsrf } from '../../middleware/csrf.js';

import { listArtists } from '../../repositories/credits.js';
import { createImage, deleteImage, updateImage } from '../../services/image-records.js';

function options(db) {
  return {
    artists: listArtists(db),
    characters: db.prepare('SELECT id, name FROM character ORDER BY name COLLATE NOCASE').all(),
  };
}

function imageDetail(db, id) {
  const image = db.prepare(`
    SELECT id, alt_text AS altText, short_description AS shortDescription,
           artist_id AS artistId, is_nsfw AS isNsfw, width, height
    FROM image WHERE id = ?
  `).get(id);

  if (!image) return null;

  return {
    ...image,
    characterIds: db.prepare('SELECT character_id AS id FROM character_image WHERE image_id = ?')
      .all(id).map((r) => r.id),
  };
}

export function adminImagesRouter(upload) {
  const router = Router();

  router.get('/admin/images', (req, res) => {
    const images = req.app.locals.db.prepare(`
      SELECT i.id, i.alt_text AS altText, i.is_nsfw AS isNsfw, a.name AS artistName
      FROM image i JOIN artist a ON a.id = i.artist_id
      ORDER BY i.created_at DESC, i.id DESC
    `).all();

    res.render('admin/images-list.njk', { images });
  });

  router.get('/admin/images/new', (req, res) => {
    res.render('admin/image-new.njk', { options: options(req.app.locals.db), values: {} });
  });

  router.post('/admin/images', upload.single('image'), verifyCsrf(), async (req, res, next) => {
    const db = req.app.locals.db;

    try {
      await createImage(db, { body: req.body, file: req.file, config: req.app.locals.config });
      return res.redirect(303, '/admin/images');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      res.status(422);
      return res.render('admin/image-new.njk', {
        options: options(db),
        values: req.body,
        fieldErrors: err.fieldErrors,
      });
    }
  });

  router.get('/admin/images/:id/edit', (req, res, next) => {
    const db = req.app.locals.db;
    const image = imageDetail(db, Number(req.params.id));
    if (!image) return next();

    return res.render('admin/image-edit.njk', { image, options: options(db) });
  });

  router.post('/admin/images/:id', (req, res, next) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);

    try {
      updateImage(db, id, req.body);
      return res.redirect(303, '/admin/images');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      const image = imageDetail(db, id);
      if (!image) return next();

      res.status(422);
      return res.render('admin/image-edit.njk', {
        image, options: options(db), fieldErrors: err.fieldErrors,
      });
    }
  });

  router.post('/admin/images/:id/delete', async (req, res, next) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);

    try {
      await deleteImage(db, id, { confirm: req.body.confirm, config: req.app.locals.config });
      return res.redirect(303, '/admin/images');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      const image = imageDetail(db, id);
      if (!image) return next();

      res.status(422);
      return res.render('admin/image-edit.njk', {
        image, options: options(db), fieldErrors: err.fieldErrors,
      });
    }
  });

  return router;
}
