import { Router } from 'express';

import { listCharacters } from '../../repositories/characters.js';
import { listGenderFacets } from '../../repositories/genders.js';
import { listTagFacets } from '../../repositories/tags.js';
import { listTraitFacets } from '../../repositories/traits.js';

/** Normalise a repeatable query parameter into a de-duplicated array. */
function asList(value) {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];
}

export function galleryRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const showNsfw = res.locals.showNsfw;

    const tags = asList(req.query.tag);
    const traits = asList(req.query.trait);
    const genderRaw = req.query.gender;
    const gender = typeof genderRaw === 'string' && genderRaw.trim() ? genderRaw.trim() : null;

    const characters = listCharacters(db, { showNsfw, tags, traits, gender });

    // Facets come from the currently visible, currently filtered set — never
    // the full taxonomy tables — so no offered option can yield zero results.
    const visibleIds = characters.map((c) => c.id);

    res.render('pages/gallery.njk', {
      characters,
      facets: {
        tags: listTagFacets(db, visibleIds),
        genders: listGenderFacets(db, visibleIds),
        traits: listTraitFacets(db, visibleIds),
      },
      applied: {
        tags,
        traits,
        gender,
        any: tags.length > 0 || traits.length > 0 || Boolean(gender),
      },
    });
  });

  return router;
}
