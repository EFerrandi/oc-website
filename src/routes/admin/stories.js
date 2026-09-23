import { Router } from 'express';

import { createStory, deleteStory, updateStory } from '../../services/stories.js';

function options(db) {
  return {
    characters: db.prepare('SELECT id, name FROM character ORDER BY name COLLATE NOCASE').all(),
  };
}

function storyDetail(db, id) {
  const story = db.prepare(`
    SELECT id, title, slug, body, is_nsfw AS isNsfw FROM story WHERE id = ?
  `).get(id);

  if (!story) return null;

  return {
    ...story,
    characterIds: db.prepare('SELECT character_id AS id FROM character_story WHERE story_id = ?')
      .all(id).map((r) => r.id),
  };
}

export function adminStoriesRouter() {
  const router = Router();

  router.get('/admin/stories', (req, res) => {
    const stories = req.app.locals.db.prepare(
      'SELECT id, title, slug, is_nsfw AS isNsfw FROM story ORDER BY title COLLATE NOCASE',
    ).all();

    res.render('admin/stories-list.njk', { stories });
  });

  router.get('/admin/stories/new', (req, res) => {
    res.render('admin/story-form.njk', {
      options: options(req.app.locals.db),
      story: null,
      values: {},
    });
  });

  router.post('/admin/stories', (req, res, next) => {
    const db = req.app.locals.db;

    try {
      createStory(db, req.body);
      return res.redirect(303, '/admin/stories');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      res.status(422);
      return res.render('admin/story-form.njk', {
        options: options(db), story: null, values: req.body, fieldErrors: err.fieldErrors,
      });
    }
  });

  router.get('/admin/stories/:id/edit', (req, res, next) => {
    const db = req.app.locals.db;
    const story = storyDetail(db, Number(req.params.id));
    if (!story) return next();

    return res.render('admin/story-form.njk', { options: options(db), story, values: story });
  });

  router.post('/admin/stories/:id', (req, res, next) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);

    try {
      updateStory(db, id, req.body);
      return res.redirect(303, '/admin/stories');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      const story = storyDetail(db, id);
      if (!story) return next();

      res.status(422);
      return res.render('admin/story-form.njk', {
        options: options(db), story, values: req.body, fieldErrors: err.fieldErrors,
      });
    }
  });

  router.post('/admin/stories/:id/delete', (req, res, next) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);

    try {
      deleteStory(db, id, { confirm: req.body.confirm });
      return res.redirect(303, '/admin/stories');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      const story = storyDetail(db, id);
      if (!story) return next();

      res.status(422);
      return res.render('admin/story-form.njk', {
        options: options(db), story, values: story, fieldErrors: err.fieldErrors,
      });
    }
  });

  return router;
}
