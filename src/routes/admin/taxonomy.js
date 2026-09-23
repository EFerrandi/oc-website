import { Router } from 'express';

import {
  ConflictError,
  TAXONOMY_KINDS,
  countUsage,
  createItem,
  deleteItem,
  getKind,
  listItems,
  updateItem,
} from '../../services/taxonomy.js';

const LABELS = {
  tags: 'Tags',
  traits: 'Sins & Virtues',
  genders: 'Genders',
  artists: 'Artists',
  designers: 'Designers',
};

function render(req, res, kind, extra = {}) {
  const db = req.app.locals.db;
  const spec = getKind(kind);

  const items = listItems(db, kind).map((item) => ({
    ...item,
    usage: countUsage(db, kind, item.id),
  }));

  return res.render('admin/taxonomy.njk', {
    kind,
    kindLabel: LABELS[kind],
    hasUrl: spec.hasUrl,
    hasTraitKind: spec.hasTraitKind,
    blocksDelete: spec.inUseBlocksDelete,
    items,
    ...extra,
  });
}

/** One CRUD shape shared by all five taxonomies. */
export function taxonomyRouter() {
  const router = Router();

  for (const kind of TAXONOMY_KINDS) {
    router.get(`/admin/${kind}`, (req, res) => render(req, res, kind));

    router.post(`/admin/${kind}`, (req, res) => {
      try {
        createItem(req.app.locals.db, kind, req.body);
        return res.redirect(303, `/admin/${kind}`);
      } catch (err) {
        res.status(422);
        return render(req, res, kind, { fieldErrors: err.fieldErrors ?? { name: err.message } });
      }
    });

    router.post(`/admin/${kind}/:id`, (req, res) => {
      try {
        updateItem(req.app.locals.db, kind, Number(req.params.id), req.body);
        return res.redirect(303, `/admin/${kind}`);
      } catch (err) {
        res.status(422);
        return render(req, res, kind, { fieldErrors: err.fieldErrors ?? { name: err.message } });
      }
    });

    router.post(`/admin/${kind}/:id/delete`, (req, res) => {
      try {
        deleteItem(req.app.locals.db, kind, Number(req.params.id));
        return res.redirect(303, `/admin/${kind}`);
      } catch (err) {
        // 409 when another record still depends on it; 422 otherwise.
        res.status(err instanceof ConflictError ? 409 : 422);
        return render(req, res, kind, { fieldErrors: { delete: err.message } });
      }
    });
  }

  return router;
}
