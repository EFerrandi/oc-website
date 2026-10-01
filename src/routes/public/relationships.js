import { Router } from 'express';

import { layoutGraph } from '../../lib/graph-layout.js';
import { listRelationshipCards } from '../../repositories/relationships.js';

const PLACEHOLDER_AVATAR = '/img/placeholder-avatar.svg';

/**
 * Build the node and edge arrays for one map from relationship rows that have
 * ALREADY been rating-filtered by the repository.
 *
 * Invariant I-M1 (NON-NEGOTIABLE): nodes are derived ONLY from the endpoints
 * of the rows passed in. The character table is never consulted here. A node
 * carries a character's name and avatar URL, so emitting one for a character
 * the visitor may not see would disclose that character's existence even if
 * /media/:id subsequently answered 404 — gating the image is not enough,
 * because the node itself is the leak.
 *
 * This is also FR-004 (a character with no visible relationship is absent from
 * the map) seen from the other direction: the two requirements are one rule.
 */
export function buildMapModel(rows) {
  const nodes = [];
  const seen = new Set();

  const addNode = (character) => {
    if (seen.has(character.id)) return;
    seen.add(character.id);

    nodes.push({
      id: character.id,
      name: character.name,
      slug: character.slug,
      // Always the gated preview route, never /media/:id/full and never a
      // static upload path (guarantee G-4, FR-011).
      avatarUrl: character.avatar ? `/media/${character.avatar.id}` : PLACEHOLDER_AVATAR,
      avatarAlt: character.avatar?.altText || character.name,
      hasAvatar: Boolean(character.avatar),
    });
  };

  const edges = rows.map((row) => {
    addNode(row.from);
    addNode(row.to);

    return {
      id: row.id,
      fromId: row.from.id,
      toId: row.to.id,
      fromName: row.from.name,
      toName: row.to.name,
      label: row.label,
    };
  });

  return { nodes, edges };
}

/** Build one laid-out map from already-filtered relationship rows. */
function buildMap(rows) {
  const { nodes, edges } = buildMapModel(rows);
  return layoutGraph(nodes, edges);
}

export function relationshipsRouter() {
  const router = Router();

  router.get('/relationships', (req, res) => {
    const cards = listRelationshipCards(req.app.locals.db, { showNsfw: res.locals.showNsfw });

    // Laid out twice, from disjoint inputs, sharing no state (invariant I-M2).
    // If the two maps shared positions, the SFW map's coordinates would shift
    // according to how much NSFW data exists — making the arrangement itself a
    // side channel. layoutGraph is pure, so separate calls cannot interfere.
    //
    // Before opt-in, cards.nsfw is empty because the SQL already excluded
    // those rows: nothing is rendered and then hidden (guarantee G-1).
    const maps = {
      sfw: buildMap(cards.sfw),
      nsfw: buildMap(cards.nsfw),
    };

    res.render('pages/relationships.njk', { cards, maps });
  });

  return router;
}
