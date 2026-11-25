import { Router } from 'express';

import { layoutGraph } from '../../lib/graph-layout.js';
import { compactPositions } from '../../lib/compact-layout.js';
import { buildMapModel } from '../../lib/relationship-map-model.js';
import { listRelationshipCards } from '../../repositories/relationships.js';

export { buildMapModel } from '../../lib/relationship-map-model.js';

/** Build one laid-out map from rows that the repository already rating-filtered. */
function buildMap(rows) {
  const { nodes, edges } = buildMapModel(rows);
  return layoutGraph(nodes, edges, { placed: compactPositions(nodes, edges) });
}

export function relationshipsRouter() {
  const router = Router();

  router.get('/relationships', (req, res) => {
    const cards = listRelationshipCards(req.app.locals.db, { showNsfw: res.locals.showNsfw });

    // The independently filtered calls keep SFW geometry independent of NSFW data.
    const maps = {
      sfw: buildMap(cards.sfw),
      nsfw: buildMap(cards.nsfw),
    };

    res.render('pages/relationships.njk', { cards, maps });
  });

  return router;
}
