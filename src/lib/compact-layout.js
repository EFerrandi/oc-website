/**
 * Compact starting arrangement for the global relationship map.
 *
 * The previous layout either inflated a planar drawing until its closest pair
 * had a 240px gap, or placed every group on a ring. This module starts from
 * that drawing, pulls linked characters together with stress majorization,
 * removes overlaps, and packs the groups into a small area.
 *
 * Like graph-layout.js it is a pure function: no clock, no random numbers, and
 * every loop runs in node order with a fixed iteration count, so the same map
 * always gets the same arrangement (FR-005).
 */
import {
  buildAdjacency,
  countStraightCrossings,
  findComponents,
  LINE_HEIGHT,
  layoutGraph,
  wrapText,
} from './graph-layout.js';
import { findPlanarPositions } from './planar-layout.js';

/** Smallest clear space between two avatar rims. */
export const MIN_CLEARANCE = 36;

const DEFAULT_RADIUS = 48;
const LARGE_NETWORK = 40;
const GROUP_GAP = 40;
const LABEL_MAX_CHARS = 20;
const NAME_MAX_CHARS = 16;
const CHAR_WIDTH = 9.2;
const LABEL_PADDING = 16;
const STRESS_ITERATIONS = 80;
const SEPARATION_ITERATIONS = 80;
const INFLATE_STEPS = 16;
const INFLATE_FACTOR = 1.03;
const PACK_CANDIDATES = 24;
const RESCALE_STEPS = 16;
const CLEAR_ROUNDS = 24;
const LINK_MARGIN = 10;
const PLANAR_AREA_FACTOR = 2;
const FALLBACK_AREA_FACTOR = 12;
const SEED_SCALES = [1, 0.6, 0.4, 0.25];
const RAW_SCALES = [1, 0.7, 0.5, 0.35, 0.25];

const radiusOf = (node) => node.r ?? DEFAULT_RADIUS;
const nameSpace = (lines) => 8 + lines * LINE_HEIGHT;
const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function labelSize(labels) {
  const widths = labels.map((label) => Math.max(...wrapText(label, LABEL_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH);
  const lines = Math.max(...labels.map((label) => wrapText(label, LABEL_MAX_CHARS).length));
  return {
    width: widths.reduce((sum, width) => sum + width, 12 * (widths.length - 1)),
    height: lines * LINE_HEIGHT,
  };
}

/** One entry per linked pair: its target length and the room its labels need. */
function linkedPairs(memberSet, drawable, byId) {
  const groups = new Map();
  for (const edge of drawable) {
    if (edge.fromId === edge.toId || !memberSet.has(edge.fromId)) continue;
    const key = pairKey(edge.fromId, edge.toId);
    if (!groups.has(key)) groups.set(key, { a: Math.min(edge.fromId, edge.toId), b: Math.max(edge.fromId, edge.toId), labels: [] });
    groups.get(key).labels.push(edge.label);
  }

  return [...groups.values()].map(({ a, b, labels }) => {
    const rims = radiusOf(byId.get(a)) + radiusOf(byId.get(b));
    const size = labelSize(labels);
    return {
      a,
      b,
      rims,
      label: size,
      target: rims + Math.max(MIN_CLEARANCE, 0.5 * size.width + LABEL_PADDING),
    };
  });
}

/** Weighted shortest-path distances between all members (Floyd-Warshall). */
function pathDistances(ids, pairs) {
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));

  for (const pair of pairs) {
    const i = index.get(pair.a);
    const j = index.get(pair.b);
    dist[i][j] = Math.min(dist[i][j], pair.target);
    dist[j][i] = dist[i][j];
  }

  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      if (dist[i][k] === Infinity) continue;
      for (let j = 0; j < n; j += 1) {
        const through = dist[i][k] + dist[k][j];
        if (through < dist[i][j]) dist[i][j] = through;
      }
    }
  }

  return dist;
}

function stress(x, y, dist) {
  const n = x.length;
  for (let iteration = 0; iteration < STRESS_ITERATIONS; iteration += 1) {
    for (let i = 0; i < n; i += 1) {
      let sumX = 0;
      let sumY = 0;
      let sumW = 0;
      for (let j = 0; j < n; j += 1) {
        if (j === i) continue;
        const d = dist[i][j];
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];
        const length = Math.hypot(dx, dy) || 1e-6;
        const weight = 1 / (d * d);
        sumX += weight * (x[j] + (d * dx) / length);
        sumY += weight * (y[j] + (d * dy) / length);
        sumW += weight;
      }
      x[i] = sumX / sumW;
      y[i] = sumY / sumW;
    }
  }
}

/** Centre distance two avatars need so rims and the upper one's name stay clear. */
function requiredDistance(a, b, dx, dy, nameLines) {
  const rims = radiusOf(a) + radiusOf(b);
  if (Math.abs(dy) <= Math.abs(dx)) return rims + MIN_CLEARANCE;
  const upper = dy > 0 ? a : b;
  return rims + Math.max(MIN_CLEARANCE, nameSpace(nameLines.get(upper.id)) + 12);
}

function separate(members, x, y, pairs, nameLines, iterations = SEPARATION_ITERATIONS) {
  const n = members.length;
  const index = new Map(members.map((node, i) => [node.id, i]));

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let moved = false;

    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = x[j] - x[i];
        const dy = y[j] - y[i];
        const distance = Math.hypot(dx, dy) || 1e-6;
        const required = requiredDistance(members[i], members[j], dx, dy, nameLines);
        if (distance >= required - 0.01) continue;
        const push = (required - distance) / 2;
        const ux = distance === 1e-6 ? 1 : dx / distance;
        const uy = distance === 1e-6 ? 0 : dy / distance;
        x[i] -= ux * push;
        y[i] -= uy * push;
        x[j] += ux * push;
        y[j] += uy * push;
        moved = true;
      }
    }

    // Labels sit on the middle of a link, so a link must be long enough for
    // its labels to clear both avatars in the direction it points.
    for (const pair of pairs) {
      const i = index.get(pair.a);
      const j = index.get(pair.b);
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      const distance = Math.hypot(dx, dy) || 1e-6;
      const room = (Math.abs(dx) / distance) * pair.label.width + (Math.abs(dy) / distance) * pair.label.height;
      const required = pair.rims + Math.max(MIN_CLEARANCE, room + LABEL_PADDING);
      if (distance >= required - 0.01) continue;
      const push = (required - distance) / 2;
      x[i] -= (dx / distance) * push;
      y[i] -= (dy / distance) * push;
      x[j] += (dx / distance) * push;
      y[j] += (dy / distance) * push;
      moved = true;
    }

    if (!moved) break;
  }
}

/** True when a link label lands on an avatar or a name; label-label overlaps are slid apart by layoutGraph. */
function labelsCollide(members, x, y, pairs, nameLines) {
  const index = new Map(members.map((node, i) => [node.id, i]));
  const boxes = pairs.map((pair) => {
    const i = index.get(pair.a);
    const j = index.get(pair.b);
    const cx = (x[i] + x[j]) / 2;
    const cy = (y[i] + y[j]) / 2;
    return { left: cx - pair.label.width / 2, right: cx + pair.label.width / 2, top: cy - pair.label.height / 2, bottom: cy + pair.label.height / 2 };
  });

  for (let p = 0; p < boxes.length; p += 1) {
    const box = boxes[p];
    for (let k = 0; k < members.length; k += 1) {
      const node = members[k];
      const halfName = (Math.max(...wrapText(node.name, NAME_MAX_CHARS).map((line) => line.length)) * CHAR_WIDTH) / 2;
      const nearestX = Math.max(box.left, Math.min(x[k], box.right));
      const nearestY = Math.max(box.top, Math.min(y[k], box.bottom));
      if (Math.hypot(nearestX - x[k], nearestY - y[k]) < radiusOf(node) + 4) return true;
      if (box.left < x[k] + halfName && box.right > x[k] - halfName
        && box.top < y[k] + radiusOf(node) + nameSpace(nameLines.get(node.id)) + 4 && box.bottom > y[k] + radiusOf(node)) return true;
    }
  }
  return false;
}

/**
 * Move any avatar that a link passes over sideways until the link clears it,
 * then restore the spacing rules. Bounded and in member order, so it is deterministic.
 */
function clearLinks(members, x, y, pairs, nameLines) {
  const index = new Map(members.map((node, i) => [node.id, i]));

  for (let round = 0; round < CLEAR_ROUNDS; round += 1) {
    let moved = false;
    for (const pair of pairs) {
      const a = index.get(pair.a);
      const b = index.get(pair.b);
      const sx = x[b] - x[a];
      const sy = y[b] - y[a];
      const lengthSquared = sx * sx + sy * sy || 1e-6;
      for (let k = 0; k < members.length; k += 1) {
        if (k === a || k === b) continue;
        const t = Math.max(0, Math.min(1, ((x[k] - x[a]) * sx + (y[k] - y[a]) * sy) / lengthSquared));
        const nx = x[k] - (x[a] + t * sx);
        const ny = y[k] - (y[a] + t * sy);
        const distance = Math.hypot(nx, ny);
        const need = radiusOf(members[k]) + LINK_MARGIN;
        if (distance >= need) continue;
        const length = Math.sqrt(lengthSquared);
        const ux = distance > 1e-6 ? nx / distance : -sy / length;
        const uy = distance > 1e-6 ? ny / distance : sx / length;
        x[k] += ux * (need - distance);
        y[k] += uy * (need - distance);
        moved = true;
      }
    }
    if (!moved) break;
    separate(members, x, y, pairs, nameLines, 6);
  }
  separate(members, x, y, pairs, nameLines);
}
/** Grow the drawing evenly until nothing collides; scaling never adds crossings. */
function inflateUntilClear(members, x, y, pairs, nameLines) {
  for (let step = 0; step < INFLATE_STEPS && labelsCollide(members, x, y, pairs, nameLines); step += 1) {
    const cx = x.reduce((sum, value) => sum + value, 0) / x.length;
    const cy = y.reduce((sum, value) => sum + value, 0) / y.length;
    for (let i = 0; i < x.length; i += 1) {
      x[i] = cx + (x[i] - cx) * INFLATE_FACTOR;
      y[i] = cy + (y[i] - cy) * INFLATE_FACTOR;
    }
  }
}
function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function linksOverAvatars(members, pairs, positions) {
  let count = 0;
  for (const pair of pairs) {
    for (const node of members) {
      if (node.id === pair.a || node.id === pair.b) continue;
      if (distanceToSegment(positions.get(node.id), positions.get(pair.a), positions.get(pair.b)) < radiusOf(node)) count += 1;
    }
  }
  return count;
}

function clearanceOk(members, positions, nameLines) {
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = positions.get(members[i].id);
      const b = positions.get(members[j].id);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.hypot(dx, dy) < requiredDistance(members[i], members[j], dx, dy, nameLines) - 0.5) return false;
    }
  }
  return true;
}

/**
 * Uniformly rescale the previous drawing about its centre. Crossings are
 * unchanged by scaling, but shrinking can push a link over an avatar, so the
 * smallest scale that adds no such link is used.
 */
function rescaled(members, start, pairs, nameLines) {
  let smallest = 0;
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = start.get(members[i].id);
      const b = start.get(members[j].id);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      smallest = Math.max(smallest, requiredDistance(members[i], members[j], dx, dy, nameLines) / (Math.hypot(dx, dy) || 1e-6));
    }
  }

  const cx = members.reduce((sum, node) => sum + start.get(node.id).x, 0) / members.length;
  const cy = members.reduce((sum, node) => sum + start.get(node.id).y, 0) / members.length;
  const scaledBy = (scale) => new Map(members.map((node) => {
    const point = start.get(node.id);
    return [node.id, { x: (point.x - cx) * scale, y: (point.y - cy) * scale }];
  }));
  const allowed = linksOverAvatars(members, pairs, start);
  const top = Math.max(smallest, 1);

  for (let step = 0; step < RESCALE_STEPS; step += 1) {
    const scale = smallest + ((top - smallest) * step) / RESCALE_STEPS;
    const candidate = scaledBy(scale);
    if (linksOverAvatars(members, pairs, candidate) <= allowed) return candidate;
  }

  return scaledBy(top);
}

/** Breadth-first rings around the best connected character: a stable, planar-friendly starting drawing. */
function radialSeed(members, pairs) {
  const index = new Map(members.map((node, i) => [node.id, i]));
  const neighbours = members.map(() => []);
  for (const pair of pairs) {
    neighbours[index.get(pair.a)].push(index.get(pair.b));
    neighbours[index.get(pair.b)].push(index.get(pair.a));
  }
  let root = 0;
  neighbours.forEach((list, i) => { if (list.length > neighbours[root].length) root = i; });

  const x = new Array(members.length).fill(0);
  const y = new Array(members.length).fill(0);
  const angle = new Array(members.length).fill(0);
  const seen = new Set([root]);
  let level = [root];
  for (let depth = 1; level.length > 0; depth += 1) {
    const next = [];
    for (const parent of level) {
      for (const child of neighbours[parent]) {
        if (!seen.has(child)) { seen.add(child); next.push(child); }
      }
    }
    const radius = Math.max(depth * 150, (next.length * 130) / (2 * Math.PI));
    next.forEach((node, k) => {
      angle[node] = (2 * Math.PI * k) / next.length;
      x[node] = radius * Math.cos(angle[node]);
      y[node] = radius * Math.sin(angle[node]);
    });
    level = next;
  }
  return { x, y };
}
/** Try the seed at progressively tighter scales and keep the first that draws cleanly. */
function tighten(seed, relax) {
  for (const scale of [1, 0.7, 0.5, 0.35, 0.25]) {
    const result = relax({ x: seed.x.map((value) => value * scale), y: seed.y.map((value) => value * scale) });
    if (result) return result;
  }
  return null;
}

/** In large networks stress leaves wide gaps, so keep the smallest clean drawing from a few tighter starts. */
function tightest(seed, relax, members) {
  let best = null;
  let bestArea = Infinity;
  for (const scale of [1, 0.6, 0.4, 0.25]) {
    const result = relax({ x: seed.x.map((value) => value * scale), y: seed.y.map((value) => value * scale) });
    if (!result) continue;
    const box = boundsOf(members, result);
    if (box.width * box.height < bestArea) {
      best = result;
      bestArea = box.width * box.height;
    }
  }
  return best;
}

function arrangeComponent(members, start, drawable, byId) {
  const nameLines = new Map(members.map((node) => [node.id, wrapText(node.name, NAME_MAX_CHARS).length]));
  const pairs = linkedPairs(new Set(members.map((node) => node.id)), drawable, byId);

  if (members.length === 1) return new Map([[members[0].id, { x: 0, y: 0 }]]);

  if (members.length === 2) {
    const [first, second] = members;
    const pair = pairs[0];
    const length = pair
      ? pair.rims + Math.max(MIN_CLEARANCE, pair.label.width + LABEL_PADDING)
      : radiusOf(first) + radiusOf(second) + MIN_CLEARANCE;
    return new Map([[first.id, { x: -length / 2, y: 0 }], [second.id, { x: length / 2, y: 0 }]]);
  }

  const dist = pathDistances(members.map((node) => node.id), pairs);
  const seeds = [
    { x: members.map((node) => start.get(node.id).x), y: members.map((node) => start.get(node.id).y) },
    radialSeed(members, pairs),
  ];
  const raw = radialSeed(members, pairs);
  for (const seed of seeds) stress(seed.x, seed.y, dist);


  const startEdges = pairs.map((pair) => ({ fromId: pair.a, toId: pair.b }));
  const startCrossings = countStraightCrossings(startEdges, start);
  const startOver = linksOverAvatars(members, pairs, start);

  const relax = ({ x: x0, y: y0 }) => {
    const x = [...x0];
    const y = [...y0];
    separate(members, x, y, pairs, nameLines);
    inflateUntilClear(members, x, y, pairs, nameLines);

    const relaxed = new Map(members.map((node, i) => [node.id, { x: x[i], y: y[i] }]));
    const accepted = clearanceOk(members, relaxed, nameLines)
      && countStraightCrossings(startEdges, relaxed) <= startCrossings
      && linksOverAvatars(members, pairs, relaxed) <= startOver;
    return accepted ? relaxed : null;
  };

  // Seeds are tried in order of preference; later ones only serve networks the
  // earlier ones cannot draw cleanly (for example a hub with many single links).
  const first = members.length > LARGE_NETWORK ? tightest(seeds[0], relax, members) : relax(seeds[0]);
  const strict = first ?? relax(seeds[1]) ?? tighten(raw, relax);
  if (strict) return strict;

  // The previous drawing is only clean because it is huge. A dense network is
  // better served by the best repaired candidate, even with crossings (FR-009).
  const fallback = rescaled(members, start, pairs, nameLines);
  const large = members.length > LARGE_NETWORK;
  const best = bestRepaired(large
    ? [[seeds[1], [0.6]], [raw, [0.4]]]
    : [[seeds[0], SEED_SCALES], [seeds[1], SEED_SCALES], [raw, RAW_SCALES]], members, pairs, nameLines);
  if (!best) return fallback;

  const fallbackBox = boundsOf(members, fallback);
  const keepsPlanarDrawing = startCrossings === 0 && fallbackBox.width * fallbackBox.height <= PLANAR_AREA_FACTOR * best.area;
  // The previous drawing may only win on fewer links over avatars while it stays reasonably small.
  const cleaner = linksOverAvatars(members, pairs, fallback) < best.over
    && fallbackBox.width * fallbackBox.height <= FALLBACK_AREA_FACTOR * members.length * 96 * 136;
  return keepsPlanarDrawing || cleaner ? fallback : best.positions;
}

/** Repair every seed at several scales and keep the cleanest, then least crossed, then smallest drawing. */
function bestRepaired(starts, members, pairs, nameLines) {
  const edges = pairs.map((pair) => ({ fromId: pair.a, toId: pair.b }));
  let best = null;

  for (const [seed, scales] of starts) {
    for (const scale of scales) {
      const x = seed.x.map((value) => value * scale);
      const y = seed.y.map((value) => value * scale);
      separate(members, x, y, pairs, nameLines);
      clearLinks(members, x, y, pairs, nameLines);
      inflateUntilClear(members, x, y, pairs, nameLines);

      const positions = new Map(members.map((node, i) => [node.id, { x: x[i], y: y[i] }]));
      if (!clearanceOk(members, positions, nameLines)) continue;
      const box = boundsOf(members, positions);
      const candidate = {
        positions,
        over: linksOverAvatars(members, pairs, positions),
        crossings: countStraightCrossings(edges, positions),
        area: box.width * box.height,
      };
      if (!best
        || candidate.over < best.over
        || (candidate.over === best.over && (candidate.crossings < best.crossings
          || (candidate.crossings === best.crossings && candidate.area < best.area)))) {
        best = candidate;
      }
    }
  }
  return best;
}
function boundsOf(members, positions) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of members) {
    const { x, y } = positions.get(node.id);
    const lines = wrapText(node.name, NAME_MAX_CHARS);
    const halfName = (Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH) / 2;
    minX = Math.min(minX, x - Math.max(radiusOf(node), halfName));
    maxX = Math.max(maxX, x + Math.max(radiusOf(node), halfName));
    minY = Math.min(minY, y - radiusOf(node));
    maxY = Math.max(maxY, y + radiusOf(node) + nameSpace(lines.length));
  }
  return { minX, minY, width: maxX - minX + GROUP_GAP, height: maxY - minY + GROUP_GAP };
}

function shelfPack(items, rowWidth) {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 0;
  const places = [];

  for (const item of items) {
    if (x > 0 && x + item.width > rowWidth) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    places.push({ x, y });
    x += item.width;
    width = Math.max(width, x);
    rowHeight = Math.max(rowHeight, item.height);
  }

  return { places, width, height: y + rowHeight };
}

/** Pick the row width that gives the smallest bounding box. */
function pack(items) {
  const widest = Math.max(...items.map((item) => item.width));
  const total = items.reduce((sum, item) => sum + item.width, 0);
  let best = null;

  for (let step = 0; step <= PACK_CANDIDATES; step += 1) {
    const result = shelfPack(items, widest + ((total - widest) * step) / PACK_CANDIDATES);
    const area = result.width * result.height;
    if (best === null || area < best.area - 1e-6) best = { ...result, area };
  }

  return best.places;
}

/**
 * Compact positions for every node of one rating-filtered map, or null when
 * there is nothing to place.
 *
 * @param {Array<{id:number,name:string,r?:number}>} nodes
 * @param {Array<{id:number,fromId:number,toId:number,label:string}>} edges
 * @returns {Map<number,{x:number,y:number}>|null}
 */
export function compactPositions(nodes, edges) {
  if (nodes.length === 0) return null;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const drawable = edges.filter((edge) => byId.has(edge.fromId) && byId.has(edge.toId));
  const baseline = layoutGraph(nodes, drawable, { planarPositions: findPlanarPositions(nodes, drawable) });
  const start = new Map(baseline.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));

  const components = findComponents(nodes, buildAdjacency(nodes, drawable))
    .map((ids) => ids.map((id) => byId.get(id)).sort((a, b) => nodes.indexOf(a) - nodes.indexOf(b)));

  const arranged = components.map((members) => {
    const positions = arrangeComponent(members, start, drawable, byId);
    return { members, positions, ...boundsOf(members, positions) };
  });

  // Large groups first so they lead the packing; ties keep the input order.
  const ordered = arranged
    .map((group, index) => ({ ...group, index }))
    .sort((a, b) => (b.height - a.height) || (a.index - b.index));
  const places = pack(ordered);
  const result = new Map();

  ordered.forEach((group, i) => {
    for (const node of group.members) {
      const point = group.positions.get(node.id);
      result.set(node.id, {
        x: point.x - group.minX + places[i].x + GROUP_GAP / 2,
        y: point.y - group.minY + places[i].y + GROUP_GAP / 2,
      });
    }
  });

  return new Map(nodes.map((node) => [node.id, result.get(node.id)]));
}
