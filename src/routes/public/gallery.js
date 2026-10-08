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

function filterHref({ gender, tags, traits }) {
  const params = new URLSearchParams();
  if (gender) params.append('gender', gender);
  for (const tag of tags) params.append('tag', tag);
  for (const trait of traits) params.append('trait', trait);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

/**
 * One removable chip per applied value. Each link keeps every other filter, so
 * removing a filter works as an ordinary link without JavaScript.
 */
export function buildActiveFilters(applied) {
  const without = (kind, value) => ({
    gender: kind === 'gender' ? null : applied.gender,
    tags: kind === 'tag' ? applied.tags.filter((v) => v !== value) : applied.tags,
    traits: kind === 'trait' ? applied.traits.filter((v) => v !== value) : applied.traits,
  });

  return [
    ...(applied.gender ? [{ kind: 'gender', label: applied.gender }] : []),
    ...applied.tags.map((label) => ({ kind: 'tag', label })),
    ...applied.traits.map((label) => ({ kind: 'trait', label })),
  ].map((filter) => ({ ...filter, removeHref: filterHref(without(filter.kind, filter.label)) }));
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
      activeFilters: buildActiveFilters({ gender, tags, traits }),
    });
  });

  return router;
}
