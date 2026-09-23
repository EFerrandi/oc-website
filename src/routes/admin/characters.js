import { Router } from 'express';

import { verifyCsrf } from '../../middleware/csrf.js';

import { listGenders } from '../../repositories/genders.js';
import { listDesigners, listArtists } from '../../repositories/credits.js';
import { listTags } from '../../repositories/tags.js';
import { listTraits } from '../../repositories/traits.js';
import {
  createCharacterWithImage,
  deleteCharacter,
  updateCharacter,
} from '../../services/characters.js';
import { findOrCreateByName } from '../../services/taxonomy.js';

/** Options every character form needs. */
function formOptions(db) {
  return {
    genders: listGenders(db),
    designers: listDesigners(db),
    artists: listArtists(db),
    tags: listTags(db),
    traits: listTraits(db),
  };
}

/**
 * A form field repeated N times arrives as a string when one box was filled,
 * an array when several were, and undefined when none were. Templates should
 * never have to care, so normalise to an array here.
 */
function toArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Let the admin type a brand-new tag or sin/virtue directly in the character
 * form instead of breaking off to the taxonomy screens first. Newly created
 * ids are merged into the submitted id lists.
 */
function resolveInlineTaxonomy(db, body) {
  const newTags = String(body.new_tags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const newSins = String(body.new_sins ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const newVirtues = String(body.new_virtues ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  const tagIds = newTags.map((name) => findOrCreateByName(db, 'tags', name)).filter(Boolean);
  const traitIds = [
    ...newSins.map((name) => findOrCreateByName(db, 'traits', name, { traitKind: 'sin' })),
    ...newVirtues.map((name) => findOrCreateByName(db, 'traits', name, { traitKind: 'virtue' })),
  ].filter(Boolean);

  const existingTags = [].concat(body['tag_id[]'] ?? body.tag_id ?? []);
  const existingTraits = [].concat(body['trait_id[]'] ?? body.trait_id ?? []);

  return {
    ...body,
    tag_id: [...existingTags, ...tagIds.map(String)],
    trait_id: [...existingTraits, ...traitIds.map(String)],
  };
}

function characterDetail(db, id) {
  const character = db.prepare(`
    SELECT id, name, slug, gender_id AS genderId, short_description AS shortDescription,
           terms_of_use AS termsOfUse, can_regift AS canRegift, can_retrade AS canRetrade,
           can_resell AS canResell, designer_id AS designerId, avatar_image_id AS avatarImageId
    FROM character WHERE id = ?
  `).get(id);

  if (!character) return null;

  return {
    ...character,
    jobTitles: db.prepare(
      'SELECT title FROM character_job_title WHERE character_id = ? ORDER BY position, rowid',
    ).all(id).map((r) => r.title),
    tagIds: db.prepare('SELECT tag_id AS id FROM character_tag WHERE character_id = ?').all(id).map((r) => r.id),
    traitIds: db.prepare('SELECT trait_id AS id FROM character_trait WHERE character_id = ?').all(id).map((r) => r.id),
    images: db.prepare(`
      SELECT i.id, i.alt_text AS altText, i.is_nsfw AS isNsfw
      FROM image i JOIN character_image ci ON ci.image_id = i.id
      WHERE ci.character_id = ? ORDER BY ci.position, i.id
    `).all(id),
  };
}

export function adminCharactersRouter(upload) {
  const router = Router();

  router.get('/admin/characters', (req, res) => {
    const characters = req.app.locals.db.prepare(`
      SELECT id, name, slug FROM character ORDER BY name COLLATE NOCASE
    `).all();

    res.render('admin/characters-list.njk', { characters });
  });

  router.get('/admin/characters/new', (req, res) => {
    res.render('admin/character-new.njk', {
      options: formOptions(req.app.locals.db),
      values: {},
      titles: [],
    });
  });

  // The character and its first image are created in one submission, so a
  // character can never exist without an image (FR-049, invariant I-2).
  router.post('/admin/characters', upload.single('image'), verifyCsrf(), async (req, res, next) => {
    const db = req.app.locals.db;

    try {
      const body = resolveInlineTaxonomy(db, req.body);
      const { characterId } = await createCharacterWithImage(db, {
        body,
        file: req.file,
        config: req.app.locals.config,
      });

      return res.redirect(303, `/admin/characters/${characterId}/edit`);
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      // Re-render with the submitted values so nothing typed is lost.
      res.status(422);
      return res.render('admin/character-new.njk', {
        options: formOptions(db),
        values: req.body,
        titles: toArray(req.body.job_title),
        fieldErrors: err.fieldErrors,
      });
    }
  });

  router.get('/admin/characters/:id/edit', (req, res, next) => {
    const db = req.app.locals.db;
    const character = characterDetail(db, Number(req.params.id));
    if (!character) return next();

    return res.render('admin/character-edit.njk', {
      character,
      options: formOptions(db),
    });
  });

  router.post('/admin/characters/:id', (req, res, next) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);

    try {
      updateCharacter(db, id, resolveInlineTaxonomy(db, req.body));
      return res.redirect(303, `/admin/characters/${id}/edit`);
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      const character = characterDetail(db, id);
      if (!character) return next();

      res.status(422);
      return res.render('admin/character-edit.njk', {
        character,
        options: formOptions(db),
        fieldErrors: err.fieldErrors,
      });
    }
  });

  router.post('/admin/characters/:id/delete', async (req, res, next) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);

    try {
      await deleteCharacter(db, id, {
        confirmName: req.body.confirm_name,
        config: req.app.locals.config,
      });
      return res.redirect(303, '/admin/characters');
    } catch (err) {
      if (!err.fieldErrors) return next(err);

      const character = characterDetail(db, id);
      if (!character) return next();

      res.status(422);
      return res.render('admin/character-edit.njk', {
        character,
        options: formOptions(db),
        fieldErrors: err.fieldErrors,
      });
    }
  });

  return router;
}
