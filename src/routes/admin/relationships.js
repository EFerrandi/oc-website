import { Router } from 'express';

import {
  createRelationship,
  deleteRelationship,
  updateRelationship,
} from '../../services/relationships.js';

function options(db) {
  return {
    characters: db.prepare('SELECT id, name FROM character ORDER BY name COLLATE NOCASE').all(),
  };
}

function listAll(db) {
  return db.prepare(`
    SELECT r.id, r.label, r.is_nsfw AS isNsfw,
           f.name AS fromName, t.name AS toName,
           r.from_character_id AS fromId, r.to_character_id AS toId
    FROM relationship r
    JOIN character f ON f.id = r.from_character_id
    JOIN character t ON t.id = r.to_character_id
    ORDER BY f.name COLLATE NOCASE, t.name COLLATE NOCASE
  `).all();
}

export function adminRelationshipsRouter() {
  const router = Router();

  function render(req, res, extra = {}) {
    const db = req.app.locals.db;
    return res.render('admin/relationships.njk', {
      options: options(db),
      relationships: listAll(db),
      values: {},
      ...extra,
    });
  }

  router.get('/admin/relationships', (req, res) => render(req, res));

  router.post('/admin/relationships', (req, res, next) => {
    try {
      createRelationship(req.app.locals.db, req.body);
      return res.redirect(303, '/admin/relationships');
    } catch (err) {
      if (!err.fieldErrors) return next(err);
      res.status(422);
      return render(req, res, { values: req.body, fieldErrors: err.fieldErrors });
    }
  });

  router.post('/admin/relationships/:id', (req, res, next) => {
    try {
      updateRelationship(req.app.locals.db, Number(req.params.id), req.body);
      return res.redirect(303, '/admin/relationships');
    } catch (err) {
      if (!err.fieldErrors) return next(err);
      res.status(422);
      return render(req, res, { values: req.body, fieldErrors: err.fieldErrors });
    }
  });

  router.post('/admin/relationships/:id/delete', (req, res, next) => {
    try {
      deleteRelationship(req.app.locals.db, Number(req.params.id), { confirm: req.body.confirm });
      return res.redirect(303, '/admin/relationships');
    } catch (err) {
      if (!err.fieldErrors) return next(err);
      res.status(422);
      return render(req, res, { fieldErrors: err.fieldErrors });
    }
  });

  return router;
}
