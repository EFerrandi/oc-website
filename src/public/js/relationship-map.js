/**
 * Relationship map dragging — a pure enhancement (Constitution Principle III).
 *
 * The map is laid out on the server and arrives fully drawn with literal
 * coordinates, labelled edges and working links. Everything in this file only
 * adds the ability to MOVE an avatar. If the file fails to load, is blocked,
 * or throws, the page is still complete and usable — so nothing here may be
 * the only path to a piece of meaning.
 *
 * It is a module rather than a classic script because module scripts are
 * deferred by definition and because it lets the clamp helper below be
 * unit-tested directly instead of re-implemented in a test.
 *
 * FR-020 is a PROHIBITION and it is easy to violate by being helpful: this
 * file must never write to localStorage, sessionStorage, a cookie, the URL, or
 * the server. A reload returns the default arrangement, deliberately.
 */

/** Pixels an arrow key moves a focused node. */
const STEP = 12;

/** Pixels Shift+Arrow moves a focused node. */
const BIG_STEP = 48;

/**
 * Pointer travel, in client pixels, past which a gesture counts as a drag
 * rather than a click. Below it, navigation must still happen — suppressing
 * the click unconditionally would break FR-005 for every pointer user.
 */
const DRAG_THRESHOLD = 4;

/**
 * Keep a point inside the drawing.
 *
 * This duplicates the bound the server already enforces when it sizes the
 * viewBox, and the duplication is intentional: the server guarantees the
 * DEFAULT arrangement fits (invariant I-M5), while this guarantees a
 * USER-MOVED node still fits (FR-018). Neither covers the other — the server
 * never sees a drag, and this code never runs for a visitor without
 * JavaScript. Removing either one leaves a real gap.
 */
export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** Read the `viewBox` as a plain box, falling back to the rendered size. */
function viewBoxOf(svg) {
  const raw = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);

  if (raw.length === 4 && raw.every((n) => Number.isFinite(n))) {
    return { minX: raw[0], minY: raw[1], width: raw[2], height: raw[3] };
  }

  const box = svg.getBoundingClientRect();
  return { minX: 0, minY: 0, width: box.width, height: box.height };
}

/**
 * Convert a pointer event into the SVG's own coordinate system.
 *
 * Going through `getScreenCTM().inverse()` rather than subtracting rectangle
 * offsets is what makes dragging correct at every container width, at every
 * browser zoom level, and after the page reflows — the viewBox scales the
 * drawing, so client pixels and user units are not the same thing.
 */
function toSvgPoint(svg, event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  return point.matrixTransform(matrix.inverse());
}

/** Current translate of a node, as written by the server or a previous drag. */
function positionOf(node) {
  const match = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(node.getAttribute('transform') || '');
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
}

function setPosition(node, x, y) {
  node.setAttribute('transform', `translate(${x},${y})`);
}

/** Midpoint of the quadratic through (from, control, to); the straight case reduces to it. */
function labelAnchor(from, control, to) {
  return {
    x: (from.x + 2 * control.x + to.x) / 4,
    y: (from.y + 2 * control.y + to.y) / 4,
  };
}

/**
 * Redraw every edge touching a moved node (FR-017).
 *
 * The edge's curve offset is recovered from its ORIGINAL geometry rather than
 * stored separately, so several relationships between the same two characters
 * stay visually separated after a drag exactly as they were before it.
 */
function redrawEdges(map, nodeId) {
  for (const edge of map.edges) {
    if (edge.fromId !== nodeId && edge.toId !== nodeId) continue;

    const from = map.positions.get(edge.fromId);
    const to = map.positions.get(edge.toId);
    if (!from || !to) continue;

    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    let control = mid;

    if (edge.curveOffset !== 0) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;

      // The sign convention must match the server's, which derives the
      // perpendicular from the pair in canonical id order. Using the stored
      // direction instead would flip the bow of any relationship recorded
      // "backwards", making it jump sides the first time it is dragged.
      const low = edge.fromId < edge.toId ? from : to;
      const high = edge.fromId < edge.toId ? to : from;
      const perpX = -(high.y - low.y) / length;
      const perpY = (high.x - low.x) / length;

      control = {
        x: mid.x + perpX * edge.curveOffset * 2,
        y: mid.y + perpY * edge.curveOffset * 2,
      };
    }

    edge.path.setAttribute(
      'd',
      edge.curveOffset === 0
        ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
        : `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
    );

    if (edge.label) {
      const anchor = labelAnchor(from, control, to);
      edge.label.setAttribute('x', String(anchor.x));
      edge.label.setAttribute('y', String(anchor.y));
    }
  }
}

/**
 * Recover each edge's curve offset from the geometry the server produced.
 *
 * The offset is not in the markup, and adding an attribute for it would mean
 * the SVG contract carried a number only the script understands. Deriving it
 * from the control point is exact: the server placed the control at twice the
 * offset along the perpendicular.
 */
function readCurveOffset(path, from, to) {
  const quadratic = /Q\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(path.getAttribute('d') || '');
  if (!quadratic) return 0;

  const control = { x: Number(quadratic[1]), y: Number(quadratic[2]) };
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;

  // Project the control displacement back onto the perpendicular and undo the
  // factor of two the server applied.
  return ((control.x - mid.x) * perpX + (control.y - mid.y) * perpY) / 2;
}

function readMap(svg) {
  const positions = new Map();
  const nodes = [...svg.querySelectorAll('.map-node')].map((element) => {
    const id = Number(element.dataset.node);
    positions.set(id, positionOf(element));
    return { id, element };
  });

  const edges = [...svg.querySelectorAll('.map-edge')].map((group) => {
    const fromId = Number(group.dataset.from);
    const toId = Number(group.dataset.to);
    const path = group.querySelector('.map-edge-line');
    const from = positions.get(fromId);
    const to = positions.get(toId);

    return {
      fromId,
      toId,
      path,
      label: group.querySelector('.map-edge-label'),
      curveOffset: path && from && to ? readCurveOffset(path, from, to) : 0,
    };
  }).filter((edge) => edge.path && positions.has(edge.fromId) && positions.has(edge.toId));

  return { svg, nodes, edges, positions, box: viewBoxOf(svg) };
}

function moveNode(map, entry, x, y) {
  const { box } = map;
  const radius = 34;

  const clamped = {
    x: clamp(x, box.minX + radius, box.minX + box.width - radius),
    y: clamp(y, box.minY + radius, box.minY + box.height - radius),
  };

  map.positions.set(entry.id, clamped);
  setPosition(entry.element, clamped.x, clamped.y);
  redrawEdges(map, entry.id);
}

function attach(svg) {
  const map = readMap(svg);
  if (map.nodes.length === 0) return;

  for (const entry of map.nodes) {
    let dragging = null;

    entry.element.addEventListener('pointerdown', (event) => {
      // Let the browser handle anything that is not a primary press, so
      // middle-click-to-open-in-a-new-tab keeps working.
      if (event.button !== 0) return;

      const point = toSvgPoint(svg, event);
      if (!point) return;

      const current = map.positions.get(entry.id);

      dragging = {
        pointerId: event.pointerId,
        // The grab offset keeps the avatar from jumping so its centre snaps
        // under the cursor at the start of a drag.
        offsetX: current.x - point.x,
        offsetY: current.y - point.y,
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false,
      };

      entry.element.setPointerCapture(event.pointerId);
      entry.element.classList.add('is-dragging');
      event.preventDefault();
    });

    entry.element.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== dragging.pointerId) return;

      const travelled = Math.hypot(
        event.clientX - dragging.startClientX,
        event.clientY - dragging.startClientY,
      );
      if (travelled > DRAG_THRESHOLD) dragging.moved = true;

      const point = toSvgPoint(svg, event);
      if (!point) return;

      moveNode(map, entry, point.x + dragging.offsetX, point.y + dragging.offsetY);
      event.preventDefault();
    });

    const endDrag = (event) => {
      if (!dragging || event.pointerId !== dragging.pointerId) return;

      // Read before clearing: the click event fires after pointerup, and it is
      // the only place the decision below can be acted on.
      entry.element.dataset.suppressClick = dragging.moved ? '1' : '';
      entry.element.classList.remove('is-dragging');

      if (entry.element.hasPointerCapture?.(event.pointerId)) {
        entry.element.releasePointerCapture(event.pointerId);
      }

      dragging = null;
    };

    entry.element.addEventListener('pointerup', endDrag);
    entry.element.addEventListener('pointercancel', endDrag);

    entry.element.addEventListener('click', (event) => {
      // Only a gesture that actually moved blocks navigation (FR-005).
      if (entry.element.dataset.suppressClick === '1') {
        event.preventDefault();
        entry.element.dataset.suppressClick = '';
      }
    });

    entry.element.addEventListener('keydown', (event) => {
      const deltas = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      const delta = deltas[event.key];
      if (!delta) return;

      const step = event.shiftKey ? BIG_STEP : STEP;
      const current = map.positions.get(entry.id);

      moveNode(map, entry, current.x + delta[0] * step, current.y + delta[1] * step);

      // Arrow keys would otherwise scroll the page out from under the node.
      event.preventDefault();
    });
  }
}

export function initRelationshipMaps(root) {
  const maps = root?.querySelectorAll?.('.relationship-map');
  if (!maps || maps.length === 0) return;

  for (const svg of maps) attach(svg);
}

// Guarded so the module can be imported by a unit test in Node, where there is
// no document and nothing to enhance.
if (typeof document !== 'undefined') {
  initRelationshipMaps(document);
}
