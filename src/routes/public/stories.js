import { Router } from 'express';

import { NotFoundError } from '../../middleware/errors.js';
import { findVisibleStoryBySlug, listCharactersForStory } from '../../repositories/stories.js';

export function storiesRouter() {
  const router = Router();

  router.get('/stories/:slug', (req, res, next) => {
    const db = req.app.locals.db;

    // Returns null for both "missing" and "hidden at this rating", so an NSFW
    // story answers 404 rather than 403 — a 403 would confirm it exists.
    const story = findVisibleStoryBySlug(db, req.params.slug, { showNsfw: res.locals.showNsfw });
    if (!story) return next(new NotFoundError());

    return res.render('pages/story.njk', {
      story: { ...story, isNsfw: story.isNsfw === 1 },
      characters: listCharactersForStory(db, story.id),
    });
  });

  return router;
}
