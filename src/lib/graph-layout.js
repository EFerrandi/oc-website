/**
 * Deterministic graph layout for the relationship map.
 *
 * This module imports NOTHING. That is not an accident and must not be
 * "tidied up" later: invariant I-M3 requires the layout to be a pure function
 * of its arguments, because clarification FR-021 moved layout to the server so
 * that a visitor without JavaScript sees the same arrangement as everyone else.
 * A clock, a random number, or an environment read would make FR-013 and
 * SC-004 (identical arrangement on every load) unenforceable.
 *
 * It also knows nothing about HTTP, the database, or content rating. Nodes are
 * handed to it already filtered; see invariant I-M1 in data-model.md for why
 * that filtering must never move in here.
 */

/** Drawn radius of a character's avatar circle. */
export const NODE_RADIUS = 34;

/** Clear space between adjacent avatars on the same ring. */
const NODE_GAP = 26;

/** Margin around the whole drawing, leaving room for names and labels. */
const PADDING = 56;

/** Extra room below a node for its name text. */
const NAME_SPACE = 22;

/** Perpendicular displacement applied to each additional edge of a pair. */
const CURVE_STEP = 26;

/** Smallest ring radius, so a two-node component is not drawn comically small. */
const MIN_RADIUS = 90;

/** Clear space between two unrelated groups, so they read as separate (FR-014). */
const COMPONENT_GAP = 48;

/**
 * Ring radius for a component: large enough that `count` avatars fit around
 * the circumference without touching.
 */
function ringRadius(count) {
  if (count <= 1) return 0;
  const circumference = count * (2 * NODE_RADIUS + NODE_GAP);
  return Math.max(MIN_RADIUS, circumference / (2 * Math.PI));
}

/**
 * Place node ids evenly around a circle centred on (cx, cy), in the order
 * given.
 */
function placeOnRing(order, cx, cy, radius) {
  const positions = new Map();

  if (order.length === 1) {
    positions.set(order[0], { x: cx, y: cy });
    return positions;
  }

  // Start at the top, which makes the arrangement predictable to the eye as
  // well as to a test — except for a plain pair, which reads far better side
  // by side than stacked, and leaves the label room between the two avatars.
  const startAngle = order.length === 2 ? Math.PI : -Math.PI / 2;

  for (let i = 0; i < order.length; i += 1) {
    const angle = (2 * Math.PI * i) / order.length + startAngle;
    positions.set(order[i], {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  return positions;
}

/**
 * Exact crossing count for chords of a single circle (research R-004).
 *
 * Two chords (a,b) and (c,d) cross if and only if exactly one of c, d lies
 * strictly inside the arc running from a to b. Chords that share an endpoint
 * meet at the rim rather than crossing, so they are excluded first.
 *
 * `rank` maps a node id to its position around the ring. Nodes absent from
 * `rank` belong to another component and cannot cross these chords.
 *
 * O(E^2). At the 300-relationship ceiling in SC-007 that is ~45k integer
 * comparisons — far cheaper than the sweep line it would take to improve on,
 * and exact, which matters because FR-012 is stated as a comparison between
 * two crossing counts.
 */
export function countCrossings(edgeList, rank) {
  const chords = [];

  for (const edge of edgeList) {
    const a = rank.get(edge.fromId);
    const b = rank.get(edge.toId);
    if (a === undefined || b === undefined || a === b) continue;
    chords.push(a < b ? [a, b] : [b, a]);
  }

  let crossings = 0;

  for (let i = 0; i < chords.length; i += 1) {
    const [a, b] = chords[i];

    for (let j = i + 1; j < chords.length; j += 1) {
      const [c, d] = chords[j];

      // Sharing an endpoint means meeting at the rim, not crossing.
      if (a === c || a === d || b === c || b === d) continue;

      const cInside = c > a && c < b;
      const dInside = d > a && d < b;
      if (cInside !== dInside) crossings += 1;
    }
  }

  return crossings;
}

/**
 * Assign each edge a perpendicular offset so that several relationships
 * between the same two characters stay individually readable (FR-006).
 *
 * The first edge of a pair is a straight line; each additional one bows
 * further out, alternating sides. Direction is ignored when grouping, because
 * "Aria -> Brann" and "Brann -> Aria" are drawn between the same two avatars.
 */
function assignCurveOffsets(edgeList) {
  const seen = new Map();

  return edgeList.map((edge) => {
    const key = edge.fromId < edge.toId
      ? `${edge.fromId}:${edge.toId}`
      : `${edge.toId}:${edge.fromId}`;

    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);

    // 0, +1, -1, +2, -2, ...
    const magnitude = Math.ceil(index / 2);
    const sign = index % 2 === 1 ? 1 : -1;

    return { ...edge, curveOffset: index === 0 ? 0 : sign * magnitude * CURVE_STEP };
  });
}

/**
 * Geometry for one edge: the quadratic control point and the curve midpoint
 * that the label is anchored to.
 *
 * `from` and `to` MUST be passed in canonical pair order (lower node id
 * first), not in the relationship's stored direction. The perpendicular is
 * derived from the chord, so passing a reversed pair negates it — and a
 * relationship stored as B->A would then bow onto exactly the same path as one
 * stored as A->B with the opposite offset, silently defeating FR-006. Because
 * a quadratic curve is identical traversed either way, the caller can still
 * draw the path in whichever direction it likes.
 *
 * For a quadratic Bezier the point at t=0.5 is (P0 + 2*P1 + P2) / 4, so the
 * label anchor is exact rather than approximated — FR-003 asks for the
 * midpoint of the line, and a straight edge (offset 0) reduces to the plain
 * midpoint of its two endpoints.
 */
function edgeGeometry(from, to, curveOffset) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  if (curveOffset === 0) {
    return { controlX: midX, controlY: midY, labelX: midX, labelY: midY };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  // Unit vector perpendicular to the chord.
  const perpX = -dy / length;
  const perpY = dx / length;

  // The control point is pushed twice as far as the desired bow, because a
  // quadratic curve only reaches halfway toward its control point.
  const controlX = midX + perpX * curveOffset * 2;
  const controlY = midY + perpY * curveOffset * 2;

  return {
    controlX,
    controlY,
    labelX: (from.x + 2 * controlX + to.x) / 4,
    labelY: (from.y + 2 * controlY + to.y) / 4,
  };
}

/**
 * Split the graph into connected components (FR-014).
 *
 * Characters who have no relationship path between them should not be drawn
 * interleaved on one ring, where the eye reads adjacency as meaning. Each
 * component gets its own circle and its own region.
 *
 * Adjacency is built in a fixed order — neighbours sorted by name then id —
 * so the traversal below cannot vary between calls (FR-013).
 */
function buildAdjacency(nodeList, edgeList) {
  const byId = new Map(nodeList.map((n) => [n.id, n]));
  const adjacency = new Map(nodeList.map((n) => [n.id, []]));

  for (const edge of edgeList) {
    if (edge.fromId === edge.toId) continue;
    adjacency.get(edge.fromId).push(edge.toId);
    adjacency.get(edge.toId).push(edge.fromId);
  }

  for (const [id, neighbours] of adjacency) {
    const unique = [...new Set(neighbours)];
    unique.sort((a, b) => compareNodes(byId.get(a), byId.get(b)));
    adjacency.set(id, unique);
  }

  return adjacency;
}

/** Total order on nodes: name first, id as the tie-break so it is never ambiguous. */
function compareNodes(a, b) {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.id - b.id;
}

function findComponents(nodeList, adjacency) {
  const seen = new Set();
  const components = [];

  // Iterating nodeList rather than the adjacency map keeps component order
  // tied to the caller's order, which is stable.
  for (const node of nodeList) {
    if (seen.has(node.id)) continue;

    const members = [];
    const queue = [node.id];
    seen.add(node.id);

    while (queue.length) {
      const current = queue.shift();
      members.push(current);

      for (const next of adjacency.get(current)) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }

    components.push(members);
  }

  return components;
}

/**
 * Candidate orderings for one component (research R-003).
 *
 * The naive ordering is ALWAYS included. That is what makes "never worse than
 * the obvious arrangement" (FR-012, invariant I-M4) true by construction
 * rather than by tuning: the selector can only move away from it by finding
 * something strictly better.
 *
 * Depth-first pre-order is the one that matters most. On a tree it produces
 * nested chords, which is exactly a crossing-free circular drawing — that is
 * what delivers the achievable half of SC-003.
 */
function candidateOrderings(members, adjacency, byId) {
  const inComponent = new Set(members);
  const naive = [...members];

  const seed = [...members].sort((a, b) => compareNodes(byId.get(a), byId.get(b)))[0];

  const depthFirst = [];
  const visitedDfs = new Set([seed]);
  const stack = [seed];

  while (stack.length) {
    const current = stack.pop();
    depthFirst.push(current);

    // Reversed, because a stack pops last-in first: this makes the walk
    // follow the sorted neighbour order rather than its mirror.
    const neighbours = adjacency.get(current).filter((id) => inComponent.has(id));
    for (let i = neighbours.length - 1; i >= 0; i -= 1) {
      const next = neighbours[i];
      if (visitedDfs.has(next)) continue;
      visitedDfs.add(next);
      stack.push(next);
    }
  }

  const breadthFirst = [];
  const visitedBfs = new Set([seed]);
  const queue = [seed];

  while (queue.length) {
    const current = queue.shift();
    breadthFirst.push(current);

    for (const next of adjacency.get(current)) {
      if (!inComponent.has(next) || visitedBfs.has(next)) continue;
      visitedBfs.add(next);
      queue.push(next);
    }
  }

  return [naive, depthFirst, breadthFirst];
}

/** How many refinement sweeps to attempt. Fixed, so cost stays predictable. */
const REFINE_ITERATIONS = 12;

/**
 * Bounded barycentre refinement (research R-003).
 *
 * Each sweep moves every node toward the average ring position of its
 * neighbours and re-sorts. The result is accepted only when it scores
 * STRICTLY better, so a sweep can never make the drawing worse — the loop is
 * a search, not a simulation, and stopping early is always safe.
 */
function refineOrdering(ordering, componentEdges, adjacency) {
  let best = ordering;
  let bestScore = countCrossings(componentEdges, rankOf(best));

  for (let sweep = 0; sweep < REFINE_ITERATIONS && bestScore > 0; sweep += 1) {
    const rank = rankOf(best);
    const n = best.length;

    const scored = best.map((id, index) => {
      const neighbours = adjacency.get(id).filter((other) => rank.has(other));
      if (neighbours.length === 0) return { id, key: index, index };

      // Angles are averaged as unit vectors rather than as numbers: ring
      // position is circular, so the mean of rank 0 and rank n-1 must come out
      // adjacent to both, not in the middle of the ring.
      let sumX = 0;
      let sumY = 0;

      for (const other of neighbours) {
        const angle = (2 * Math.PI * rank.get(other)) / n;
        sumX += Math.cos(angle);
        sumY += Math.sin(angle);
      }

      const mean = Math.atan2(sumY, sumX);
      const normalised = mean < 0 ? mean + 2 * Math.PI : mean;

      return { id, key: (normalised * n) / (2 * Math.PI), index };
    });

    scored.sort((a, b) => (a.key === b.key ? a.index - b.index : a.key - b.key));

    const candidate = scored.map((entry) => entry.id);
    const score = countCrossings(componentEdges, rankOf(candidate));

    if (score >= bestScore) break;

    best = candidate;
    bestScore = score;
  }

  return { ordering: best, crossings: bestScore };
}

function rankOf(ordering) {
  return new Map(ordering.map((id, i) => [id, i]));
}

/**
 * Choose the arrangement for one component: the lowest exact crossing count
 * among the candidates, ties broken by candidate index so the earlier (and
 * more predictable) ordering wins (FR-012, FR-013).
 */
function chooseOrdering(members, componentEdges, adjacency, byId) {
  let best = null;

  for (const candidate of candidateOrderings(members, adjacency, byId)) {
    const refined = refineOrdering(candidate, componentEdges, adjacency);

    if (best === null || refined.crossings < best.crossings) {
      best = refined;
      if (best.crossings === 0) break;
    }
  }

  return best.ordering;
}

/**
 * Lay out a set of characters and the relationships between them.
 *
 * @param {Array<{id:number,name:string,slug:string,avatarUrl:string,avatarAlt:string}>} nodes
 * @param {Array<{id:number,fromId:number,toId:number,label:string}>} edges
 * @returns {{nodes:Array, edges:Array, width:number, height:number, crossings:number}}
 */
export function layoutGraph(nodes, edges) {
  const known = new Set(nodes.map((n) => n.id));

  // An edge naming a character that is not on this map cannot be drawn. This
  // should not happen — invariant I-M1 derives the nodes from the edges — but
  // dropping it is better than rendering a line to nowhere.
  const drawable = edges.filter((e) => known.has(e.fromId) && known.has(e.toId));

  if (nodes.length === 0) {
    const empty = 2 * PADDING;
    return { nodes: [], edges: [], width: empty, height: empty, crossings: 0 };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = buildAdjacency(nodes, drawable);
  const components = findComponents(nodes, adjacency);

  const laidOut = components.map((members) => {
    const membership = new Set(members);
    const componentEdges = drawable.filter((e) => membership.has(e.fromId));
    const ordering = chooseOrdering(members, componentEdges, adjacency, byId);
    const radius = ringRadius(ordering.length);

    return {
      ordering,
      radius,
      // Cell size includes the avatar radius and the room the name needs.
      cellWidth: 2 * (radius + NODE_RADIUS) + COMPONENT_GAP,
      cellHeight: 2 * (radius + NODE_RADIUS) + NAME_SPACE + COMPONENT_GAP,
      crossings: countCrossings(componentEdges, rankOf(ordering)),
    };
  });

  // Larger components first, so the big readable cluster leads and the
  // stragglers fill in after it. Ties keep their original order.
  const packed = laidOut
    .map((component, index) => ({ ...component, index }))
    .sort((a, b) => (b.ordering.length - a.ordering.length) || (a.index - b.index));

  const columns = Math.max(1, Math.ceil(Math.sqrt(packed.length)));
  const positions = new Map();

  let rowTop = 0;

  for (let start = 0; start < packed.length; start += columns) {
    const row = packed.slice(start, start + columns);
    const rowHeight = Math.max(...row.map((c) => c.cellHeight));

    let cellLeft = 0;

    for (const component of row) {
      const cx = cellLeft + component.cellWidth / 2;
      const cy = rowTop + rowHeight / 2;

      for (const [id, point] of placeOnRing(component.ordering, cx, cy, component.radius)) {
        positions.set(id, point);
      }

      cellLeft += component.cellWidth;
    }

    rowTop += rowHeight;
  }

  const crossings = laidOut.reduce((total, component) => total + component.crossings, 0);

  const placedNodes = nodes.map((node) => ({
    ...node,
    x: positions.get(node.id).x,
    y: positions.get(node.id).y,
    r: NODE_RADIUS,
  }));

  const placedEdges = assignCurveOffsets(drawable).map((edge) => {
    const from = positions.get(edge.fromId);
    const to = positions.get(edge.toId);

    // Canonical order for the geometry, so a relationship stored as B->A
    // bows to the same side as one stored as A->B would with that offset.
    const forward = edge.fromId < edge.toId;
    const geometry = forward
      ? edgeGeometry(from, to, edge.curveOffset)
      : edgeGeometry(to, from, edge.curveOffset);

    return {
      ...edge,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      ...geometry,
    };
  });

  return { crossings, ...fitToBox(placedNodes, placedEdges) };
}

/**
 * Translate the drawing so nothing sits at a negative coordinate, and report a
 * box that contains every avatar, every name and every label (FR-015, I-M5).
 *
 * Measuring the finished drawing rather than predicting its size is what makes
 * the invariant hold unconditionally: a curve offset or a component packing
 * change cannot push something outside the frame without this seeing it.
 */
function fitToBox(placedNodes, placedEdges) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of placedNodes) {
    minX = Math.min(minX, node.x - node.r);
    maxX = Math.max(maxX, node.x + node.r);
    minY = Math.min(minY, node.y - node.r);
    // The name is drawn below the avatar, so it extends the box downward.
    maxY = Math.max(maxY, node.y + node.r + NAME_SPACE);
  }

  for (const edge of placedEdges) {
    minX = Math.min(minX, edge.labelX, edge.controlX);
    maxX = Math.max(maxX, edge.labelX, edge.controlX);
    minY = Math.min(minY, edge.labelY, edge.controlY);
    maxY = Math.max(maxY, edge.labelY, edge.controlY);
  }

  const shiftX = PADDING - minX;
  const shiftY = PADDING - minY;

  return {
    nodes: placedNodes.map((node) => ({ ...node, x: node.x + shiftX, y: node.y + shiftY })),
    edges: placedEdges.map((edge) => ({
      ...edge,
      fromX: edge.fromX + shiftX,
      toX: edge.toX + shiftX,
      controlX: edge.controlX + shiftX,
      labelX: edge.labelX + shiftX,
      fromY: edge.fromY + shiftY,
      toY: edge.toY + shiftY,
      controlY: edge.controlY + shiftY,
      labelY: edge.labelY + shiftY,
    })),
    width: maxX - minX + 2 * PADDING,
    height: maxY - minY + 2 * PADDING,
  };
}
