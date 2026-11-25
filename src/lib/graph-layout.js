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
export const NODE_RADIUS = 48;

/** Clear space between adjacent avatars on the same ring. */
const NODE_GAP = 36;

/** Margin around the whole drawing, leaving room for names and labels. */
const PADDING = 64;

/** Extra room below a node for its name text, per line of name. */
const NAME_SPACE = 28;

/** Vertical distance between wrapped lines of text. */
export const LINE_HEIGHT = 20;

/** Characters per line before a label or a name wraps. */
const LABEL_MAX_CHARS = 20;
const NAME_MAX_CHARS = 16;

/** Approximate width of one character at the map's 13px font. */
const CHAR_WIDTH = 9.2;

/** Gap between the avatar rim and an arrowhead tip. */
const ARROW_GAP = 3;

/**
 * Split text into lines of at most `max` characters. Words are kept whole when
 * they fit; a word longer than a line is broken so nothing is ever cut off.
 */
export function wrapText(text, max) {
  const lines = [];
  let current = '';

  for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    let rest = word;

    while (rest.length > max) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(rest.slice(0, max));
      rest = rest.slice(max);
    }

    if (!current) current = rest;
    else if (current.length + 1 + rest.length <= max) current += ` ${rest}`;
    else {
      lines.push(current);
      current = rest;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/** Room a name needs below its avatar, given how many lines it wraps to. */
function nameSpace(lines) {
  return NAME_SPACE - LINE_HEIGHT + lines * LINE_HEIGHT;
}

function nodeRadius(node) {
  return node.r ?? NODE_RADIUS;
}

/** Perpendicular displacement applied to each additional edge of a pair. */
const CURVE_STEP = 26;

/** Smallest ring radius, so a two-node component is not drawn comically small. */
const MIN_RADIUS = 120;

/** Clear space between two unrelated groups, so they read as separate (FR-014). */
const COMPONENT_GAP = 48;

/**
 * Ring radius for a component: large enough that `count` avatars fit around
 * the circumference without touching.
 */
function ringRadius(count, slot = 2 * NODE_RADIUS + NODE_GAP, minRadius = MIN_RADIUS) {
  if (count <= 1) return 0;
  const chordSpacing = slot / (2 * Math.sin(Math.PI / count));
  return Math.max(minRadius, chordSpacing);
}

/**
 * Smallest ring radius that leaves room for the widest edge label between two
 * avatar rims, so a wrapped label never lands on an avatar (FR-007).
 */
function labelClearance(componentEdges, byId = new Map()) {
  if (componentEdges.length === 0) return MIN_RADIUS;

  const widest = Math.max(
    ...componentEdges.map((e) => Math.max(...wrapText(e.label, LABEL_MAX_CHARS).map((l) => l.length))),
  ) * CHAR_WIDTH;
  const widestNode = Math.max(...componentEdges.map((edge) => (
    nodeRadius(byId.get(edge.fromId) ?? {}) + nodeRadius(byId.get(edge.toId) ?? {})
  )));

  return Math.max(MIN_RADIUS, (widestNode + widest + 16) / 2);
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

/** Place a profile character at the center and each related character around it. */
function placeAroundCenter(nodeList, edgeList, centerId) {
  const center = nodeList.find((node) => node.id === centerId);
  const surrounding = nodeList.filter((node) => node.id !== centerId);
  const positions = new Map([[centerId, { x: 0, y: 0 }]]);
  if (!center || surrounding.length === 0) return positions;

  const count = surrounding.length;
  const separation = count > 1 ? Math.sin(Math.PI / count) : 1;
  const maxNameWidth = Math.max(
    ...nodeList.map((node) => Math.max(...wrapText(node.name, NAME_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH),
  );
  const maxLabelWidth = Math.max(
    ...edgeList.map((edge) => Math.max(...wrapText(edge.label, LABEL_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH),
    0,
  );
  const widestName = Math.max(...wrapText(center.name, NAME_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH;
  const centerRadius = nodeRadius(center);
  const maxRadius = Math.max(...nodeList.map(nodeRadius));
  const rootNameBottom = centerRadius + nameSpace(wrapText(center.name, NAME_MAX_CHARS).length);
  const radius = Math.max(
    220,
    centerRadius + maxRadius + NODE_GAP,
    2 * (rootNameBottom + LINE_HEIGHT / 2 + 16),
    maxLabelWidth / Math.max(separation, 0.01) + 32,
    (maxNameWidth + NODE_GAP) / (2 * Math.max(separation, 0.01)),
    (2 * maxRadius + NODE_GAP) / (2 * Math.max(separation, 0.01)),
    widestName,
  );

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
    positions.set(surrounding[index].id, {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
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
function assignCurveOffsets(edgeList, scale = 1) {
  const seen = new Map();
  const labelWidths = new Map();

  for (const edge of edgeList) {
    const key = edge.fromId < edge.toId
      ? `${edge.fromId}:${edge.toId}`
      : `${edge.toId}:${edge.fromId}`;
    const widestLabel = Math.max(...wrapText(edge.label, LABEL_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH;
    labelWidths.set(key, [...(labelWidths.get(key) ?? []), widestLabel]);
  }

  return edgeList.map((edge) => {
    const key = edge.fromId < edge.toId
      ? `${edge.fromId}:${edge.toId}`
      : `${edge.toId}:${edge.fromId}`;

    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);

    // 0, +1, -1, +2, -2, ...
    const magnitude = Math.ceil(index / 2);
    const sign = index % 2 === 1 ? 1 : -1;

    const curveOffset = index === 0 ? 0 : sign * magnitude * CURVE_STEP;
    const widths = labelWidths.get(key);
    const span = widths.reduce((total, width) => total + width, 0) + 12 * (widths.length - 1);
    const before = widths.slice(0, index).reduce((total, width) => total + width + 12, 0);
    return {
      ...edge,
      curveOffset: curveOffset * scale,
      labelT: widths.length === 1 ? 0.5 : (before + widths[index] / 2) / span,
    };
  });
}

function bezierPoint(from, control, to, t) {
  const inverse = 1 - t;
  return {
    x: inverse ** 2 * from.x + 2 * inverse * t * control.x + t ** 2 * to.x,
    y: inverse ** 2 * from.y + 2 * inverse * t * control.y + t ** 2 * to.y,
  };
}

function labelBox(edge, x, y) {
  const halfWidth = Math.max(...edge.labelLines.map((l) => l.length)) * CHAR_WIDTH / 2;
  const halfHeight = (edge.labelLines.length * LINE_HEIGHT) / 2;
  return { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight };
}

function boxesOverlap(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function labelCoversNode(box, node) {
  const nearestX = Math.max(box.left, Math.min(node.x, box.right));
  const nearestY = Math.max(box.top, Math.min(node.y, box.bottom));
  if (Math.hypot(nearestX - node.x, nearestY - node.y) < node.r) return true;
  const halfName = Math.max(...node.nameLines.map((l) => l.length)) * CHAR_WIDTH / 2;
  return box.left < node.x + halfName && box.right > node.x - halfName
    && box.top < node.y + node.r + 8 + node.nameLines.length * LINE_HEIGHT && box.bottom > node.y + node.r;
}

// Labels of unrelated links can land on the same spot; slide them along their own link.
function slideOverlappingLabels(edgeList, nodeList) {
  const kept = [];
  return edgeList.map((edge) => {
    const free = (x, y) => {
      const box = labelBox(edge, x, y);
      return !kept.some((other) => boxesOverlap(box, other))
        && !nodeList.some((node) => labelCoversNode(box, node));
    };
    let result = edge;
    if (!free(edge.labelX, edge.labelY)) {
      for (const t of [0.4, 0.6, 0.3, 0.7, 0.25, 0.75, 0.2, 0.8]) {
        const point = bezierPoint(
          { x: edge.pathStartX, y: edge.pathStartY },
          { x: edge.controlX, y: edge.controlY },
          { x: edge.pathEndX, y: edge.pathEndY },
          t,
        );
        if (free(point.x, point.y)) {
          result = { ...edge, labelT: t, labelX: point.x, labelY: point.y };
          break;
        }
      }
    }
    kept.push(labelBox(result, result.labelX, result.labelY));
    return result;
  });
}
function expandForParallelLabels(nodeList, edgeList, positions, centerId) {
  const groups = new Map();
  const byId = new Map(nodeList.map((node) => [node.id, node]));
  for (const edge of edgeList) {
    const key = edge.fromId < edge.toId
      ? `${edge.fromId}:${edge.toId}`
      : `${edge.toId}:${edge.fromId}`;
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  }

  let scale = 1;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const { fromId, toId } = group[0];
    const centerDistance = Math.hypot(
      positions.get(fromId).x - positions.get(toId).x,
      positions.get(fromId).y - positions.get(toId).y,
    );
    const distance = centerDistance - nodeRadius(byId.get(fromId)) - nodeRadius(byId.get(toId)) - 2 * ARROW_GAP;
    const labelSpan = group.reduce(
      (total, edge) => total + Math.max(...wrapText(edge.label, LABEL_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH,
      12 * (group.length - 1),
    );
    scale = Math.max(scale, labelSpan / Math.max(distance, 1));
  }

  if (scale === 1) return;
  const center = centerId === null
    ? {
      x: nodeList.reduce((total, node) => total + positions.get(node.id).x, 0) / nodeList.length,
      y: nodeList.reduce((total, node) => total + positions.get(node.id).y, 0) / nodeList.length,
    }
    : positions.get(centerId);

  for (const node of nodeList) {
    const point = positions.get(node.id);
    positions.set(node.id, {
      x: center.x + (point.x - center.x) * scale,
      y: center.y + (point.y - center.y) * scale,
    });
  }
}

function routeSegments(edge) {
  const steps = edge.curveOffset === 0 ? 1 : 16;
  const segments = [];
  let previous = { x: edge.pathStartX, y: edge.pathStartY };

  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const inverse = 1 - t;
    const point = {
      x: inverse ** 2 * edge.pathStartX + 2 * inverse * t * edge.controlX + t ** 2 * edge.pathEndX,
      y: inverse ** 2 * edge.pathStartY + 2 * inverse * t * edge.controlY + t ** 2 * edge.pathEndY,
    };
    segments.push([previous, point]);
    previous = point;
  }

  return segments;
}

function segmentsCross(a, b, c, d) {
  if (Math.max(a.x, b.x) < Math.min(c.x, d.x)
    || Math.max(c.x, d.x) < Math.min(a.x, b.x)
    || Math.max(a.y, b.y) < Math.min(c.y, d.y)
    || Math.max(c.y, d.y) < Math.min(a.y, b.y)) return false;

  const orientation = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return orientation(a, b, c) * orientation(a, b, d) < 0
    && orientation(c, d, a) * orientation(c, d, b) < 0;
}

function findNonIncidentPathCrossing(edgeList) {
  const paths = edgeList.map((edge) => ({ edge, segments: routeSegments(edge) }));

  for (let i = 0; i < paths.length; i += 1) {
    for (let j = i + 1; j < paths.length; j += 1) {
      const first = paths[i];
      const second = paths[j];
      if (first.edge.curveOffset === 0 && second.edge.curveOffset === 0) continue;
      if ([first.edge.fromId, first.edge.toId]
        .some((id) => id === second.edge.fromId || id === second.edge.toId)) continue;

      for (const [a, b] of first.segments) {
        for (const [c, d] of second.segments) {
          if (segmentsCross(a, b, c, d)) return [first.edge, second.edge];
        }
      }
    }
  }

  return null;
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
export function buildAdjacency(nodeList, edgeList) {
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

export function findComponents(nodeList, adjacency) {
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
 * The caller's input ordering is ALWAYS included. That makes the non-regression
 * baseline true by construction: the selector can only move away from it after
 * finding an arrangement with strictly fewer crossings.
 *
 * Depth-first pre-order is the one that matters most. On a tree it produces
 * nested chords, which is exactly a crossing-free circular drawing — that is
 * what delivers the achievable half of SC-003.
 */
function candidateOrderings(members, inputOrdering, adjacency, byId) {
  const inComponent = new Set(members);
  const baseline = inputOrdering.filter((id) => inComponent.has(id));
  const breadthFirst = [...members];

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

  return [baseline, breadthFirst, depthFirst];
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
function chooseOrdering(members, inputOrdering, componentEdges, adjacency, byId) {
  let best = null;

  for (const candidate of candidateOrderings(members, inputOrdering, adjacency, byId)) {
    const refined = refineOrdering(candidate, componentEdges, adjacency);

    if (best === null || refined.crossings < best.crossings) {
      best = refined;
      if (best.crossings === 0) break;
    }
  }

  return best.ordering;
}

/** Crossings between straight links that share no endpoint. */
export function countStraightCrossings(edgeList, positions) {
  const pairs = new Set();
  const links = [];
  for (const edge of edgeList) {
    if (edge.fromId === edge.toId) continue;
    const key = edge.fromId < edge.toId ? `${edge.fromId}:${edge.toId}` : `${edge.toId}:${edge.fromId}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    links.push(edge);
  }

  let crossings = 0;
  for (let i = 0; i < links.length; i += 1) {
    for (let j = i + 1; j < links.length; j += 1) {
      const a = links[i];
      const b = links[j];
      if (a.fromId === b.fromId || a.fromId === b.toId || a.toId === b.fromId || a.toId === b.toId) continue;
      if (segmentsCross(positions.get(a.fromId), positions.get(a.toId), positions.get(b.fromId), positions.get(b.toId))) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

/**
 * Lay out a set of characters and the relationships between them.
 *
 * @param {Array<{id:number,name:string,slug:string,avatarUrl:string,avatarAlt:string}>} nodes
 * @param {Array<{id:number,fromId:number,toId:number,label:string}>} edges
 * @returns {{nodes:Array, edges:Array, width:number, height:number, crossings:number}}
 */
export function layoutGraph(nodes, edges, { centerId = null, planarPositions = null, placed = null } = {}) {
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
  const centered = centerId !== null && byId.has(centerId)
    && drawable.every((edge) => edge.fromId === centerId || edge.toId === centerId);
  const placedMode = !centered && placed instanceof Map
    && nodes.every((node) => placed.has(node.id));
  const planar = !centered && !placedMode && planarPositions instanceof Map
    && nodes.every((node) => planarPositions.has(node.id));
  const adjacency = buildAdjacency(nodes, drawable);
  const components = findComponents(nodes, adjacency);

  const laidOut = centered || planar || placedMode ? [] : components.map((members) => {
    const membership = new Set(members);
    const componentEdges = drawable.filter((e) => membership.has(e.fromId));
    const inputOrdering = nodes.filter((node) => membership.has(node.id)).map((node) => node.id);
    const ordering = chooseOrdering(members, inputOrdering, componentEdges, adjacency, byId);
    const lineCounts = members.map((id) => wrapText(byId.get(id).name, NAME_MAX_CHARS));
    const maxNodeRadius = Math.max(...members.map((id) => nodeRadius(byId.get(id))));
    const widestName = Math.max(...lineCounts.map((lines) => Math.max(...lines.map((l) => l.length))));
    const tallestName = Math.max(...lineCounts.map((lines) => lines.length));
    const radius = ringRadius(
      ordering.length,
      Math.max(widestName * CHAR_WIDTH + 8, 2 * maxNodeRadius + NODE_GAP),
      labelClearance(componentEdges, byId),
    );

    return {
      ordering,
      radius,
      maxNodeRadius,
      // Cell size includes the avatar radius and the room the name needs.
      cellWidth: 2 * (radius + maxNodeRadius) + COMPONENT_GAP,
      cellHeight: 2 * (radius + maxNodeRadius) + nameSpace(tallestName) + COMPONENT_GAP,
      crossings: countCrossings(componentEdges, rankOf(ordering)),
    };
  });

  // Larger components first, so the big readable cluster leads and the
  // stragglers fill in after it. Ties keep their original order.
  const packed = laidOut
    .map((component, index) => ({ ...component, index }))
    .sort((a, b) => (b.ordering.length - a.ordering.length) || (a.index - b.index));

  const columns = Math.max(1, Math.ceil(Math.sqrt(packed.length)));
  const positions = centered
    ? placeAroundCenter(nodes, drawable, centerId)
    : placedMode
      ? new Map(placed)
      : planar
        ? new Map(planarPositions)
        : new Map();

  let rowTop = 0;

  for (let start = 0; !centered && !planar && !placedMode && start < packed.length; start += columns) {
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

  expandForParallelLabels(nodes, drawable, positions, centered ? centerId : null);

  const crossings = centered || planar
    ? 0
    : placedMode
      ? countStraightCrossings(drawable, positions)
      : laidOut.reduce((total, component) => total + component.crossings, 0);

  const placedNodes = nodes.map((node) => {
    const zoom = node.cropZoom ?? 1;
    const cropX = (node.cropX ?? 50) / 100;
    const cropY = (node.cropY ?? 50) / 100;
    const radius = nodeRadius(node);
    const box = 2 * radius;

    // Same geometry as the gallery's `object-fit: cover; object-position`
    // followed by `scale(zoom)` about the same focus point.
    const ratio = node.imageWidth > 0 && node.imageHeight > 0 ? node.imageWidth / node.imageHeight : 1;
    const coverW = ratio >= 1 ? box * ratio : box;
    const coverH = ratio >= 1 ? box : box / ratio;
    const left = (box - coverW) * cropX;
    const top = (box - coverH) * cropY;
    const originX = box * cropX;
    const originY = box * cropY;

    return {
      ...node,
      x: positions.get(node.id).x,
      y: positions.get(node.id).y,
      r: radius,
      nameLines: wrapText(node.name, NAME_MAX_CHARS),
      imageWidth: coverW * zoom,
      imageHeight: coverH * zoom,
      imageX: -radius + originX + (left - originX) * zoom,
      imageY: -radius + originY + (top - originY) * zoom,
    };
  });

  const placeEdges = (curveScale) => assignCurveOffsets(drawable, curveScale).map((edge) => {
    const from = positions.get(edge.fromId);
    const to = positions.get(edge.toId);
    const fromRadius = nodeRadius(byId.get(edge.fromId));
    const toRadius = nodeRadius(byId.get(edge.toId));

    // Canonical order for the geometry, so a relationship stored as B->A
    // bows to the same side as one stored as A->B would with that offset.
    const forward = edge.fromId < edge.toId;
    const geometry = forward
      ? edgeGeometry(from, to, edge.curveOffset)
      : edgeGeometry(to, from, edge.curveOffset);
    // A one-sided edge ends at the avatar rim so its arrowhead is not painted
    // over by the avatar; the direction is the curve's tangent at the end.
    let pathEndX = to.x;
    let pathEndY = to.y;
    let pathStartX = from.x;
    let pathStartY = from.y;

    const endDx = to.x - geometry.controlX;
    const endDy = to.y - geometry.controlY;
    const endLength = Math.hypot(endDx, endDy);
    const endInset = toRadius + ARROW_GAP;
    if (endLength > endInset) {
      pathEndX = to.x - (endDx / endLength) * endInset;
      pathEndY = to.y - (endDy / endLength) * endInset;
    }

    if (!edge.isOneSided) {
      const startDx = geometry.controlX - from.x;
      const startDy = geometry.controlY - from.y;
      const startLength = Math.hypot(startDx, startDy);
      const startInset = fromRadius + ARROW_GAP;
      if (startLength > startInset) {
        pathStartX = from.x + (startDx / startLength) * startInset;
        pathStartY = from.y + (startDy / startLength) * startInset;
      }
    } else {
      pathEndX = to.x;
      pathEndY = to.y;
      const dx = to.x - geometry.controlX;
      const dy = to.y - geometry.controlY;
      const length = Math.hypot(dx, dy);
      if (length > endInset) {
        pathEndX = to.x - (dx / length) * endInset;
        pathEndY = to.y - (dy / length) * endInset;
      }
    }
    const labelPoint = bezierPoint(
      { x: pathStartX, y: pathStartY },
      { x: geometry.controlX, y: geometry.controlY },
      { x: pathEndX, y: pathEndY },
      edge.labelT,
    );

    return {
      ...edge,
      labelLines: wrapText(edge.label, LABEL_MAX_CHARS),
      fromX: from.x,
      fromY: from.y,
      pathStartX,
      pathStartY,
      toX: to.x,
      toY: to.y,
      pathEndX,
      pathEndY,
      ...geometry,
      labelX: labelPoint.x,
      labelY: labelPoint.y,
    };
  });
  let placedEdges = placeEdges(1);

  if ((planar || placedMode) && placedEdges.some((edge) => edge.curveOffset !== 0)) {
    let crossing = findNonIncidentPathCrossing(placedEdges);
    for (let attempt = 0; attempt < 48 && crossing; attempt += 1) {
      placedEdges = placeEdges(2 ** -(attempt + 1));
      crossing = findNonIncidentPathCrossing(placedEdges);
    }
    if (crossing && planar) {
      throw new Error(`Planar relationships ${crossing[0].id} and ${crossing[1].id} still cross after reducing parallel-edge offsets.`);
    }
  }

  if (placedMode) placedEdges = slideOverlappingLabels(placedEdges, placedNodes);

  return { crossings, ...fitToBox(placedNodes, placedEdges, centered ? centerId : null) };
}

/**
 * Translate the drawing so nothing sits at a negative coordinate, and report a
 * box that contains every avatar, every name and every label (FR-015, I-M5).
 *
 * Measuring the finished drawing rather than predicting its size is what makes
 * the invariant hold unconditionally: a curve offset or a component packing
 * change cannot push something outside the frame without this seeing it.
 */
function fitToBox(placedNodes, placedEdges, centerId = null) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of placedNodes) {
    const halfName = Math.max(...node.nameLines.map((l) => l.length)) * CHAR_WIDTH / 2;
    minX = Math.min(minX, node.x - node.r, node.x - halfName);
    maxX = Math.max(maxX, node.x + node.r, node.x + halfName);
    minY = Math.min(minY, node.y - node.r);
    // Names are drawn below the avatar, so they extend the box downward.
    maxY = Math.max(maxY, node.y + node.r + nameSpace(node.nameLines.length));
  }

  for (const edge of placedEdges) {
    const halfWidth = Math.max(...edge.labelLines.map((l) => l.length)) * CHAR_WIDTH / 2;
    const halfHeight = (edge.labelLines.length * LINE_HEIGHT) / 2;

    minX = Math.min(minX, edge.labelX - halfWidth, edge.controlX);
    maxX = Math.max(maxX, edge.labelX + halfWidth, edge.controlX);
    minY = Math.min(minY, edge.labelY - halfHeight, edge.controlY);
    maxY = Math.max(maxY, edge.labelY + halfHeight, edge.controlY);
  }

  let width = maxX - minX + 2 * PADDING;
  let height = maxY - minY + 2 * PADDING;
  let shiftX = PADDING - minX;
  let shiftY = PADDING - minY;

  if (centerId !== null) {
    const center = placedNodes.find((node) => node.id === centerId);
    const halfWidth = Math.max(center.x - minX, maxX - center.x) + PADDING;
    const halfHeight = Math.max(center.y - minY, maxY - center.y) + PADDING;
    width = 2 * halfWidth;
    height = 2 * halfHeight;
    shiftX = width / 2 - center.x;
    shiftY = height / 2 - center.y;
  }

  return {
    nodes: placedNodes.map((node) => ({ ...node, x: node.x + shiftX, y: node.y + shiftY })),
    edges: placedEdges.map((edge) => ({
      ...edge,
      pathStartX: edge.pathStartX + shiftX,
      fromX: edge.fromX + shiftX,
      toX: edge.toX + shiftX,
      pathEndX: edge.pathEndX + shiftX,
      controlX: edge.controlX + shiftX,
      labelX: edge.labelX + shiftX,
      pathStartY: edge.pathStartY + shiftY,
      fromY: edge.fromY + shiftY,
      toY: edge.toY + shiftY,
      pathEndY: edge.pathEndY + shiftY,
      controlY: edge.controlY + shiftY,
      labelY: edge.labelY + shiftY,
    })),
    width,
    height,
  };
}
