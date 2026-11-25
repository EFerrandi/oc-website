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

export const MIN_READABLE_SCALE = 0.34;
export const MAX_SCALE = 3;
const ZOOM_STEP = 1.25;

const round = (value) => Number(value.toFixed(3));

/**
 * Initial and minimum scale for a drawing shown in a box. The initial scale
 * fits the whole map but never drops below the minimum readable avatar size;
 * the visitor can still zoom out to the full fit.
 */
export function fitView(content, box) {
  if (!(box.width > 0) || !(box.height > 0) || !(content.width > 0) || !(content.height > 0)) {
    return {
      fitScale: 1, initialScale: 1, minScale: 1, maxScale: MAX_SCALE,
      centerX: content.x + content.width / 2, centerY: content.y + content.height / 2,
    };
  }
  const fitScale = Math.min(box.width / content.width, box.height / content.height);
  const initialScale = clamp(fitScale, MIN_READABLE_SCALE, 1);
  return {
    fitScale,
    initialScale,
    minScale: Math.min(fitScale, initialScale),
    maxScale: MAX_SCALE,
    centerX: content.x + content.width / 2,
    centerY: content.y + content.height / 2,
  };
}

/** Keep the scale within limits and the view centre inside the drawing. */
export function clampView(view, content, limits) {
  return {
    scale: clamp(view.scale, limits.minScale, limits.maxScale),
    centerX: clamp(view.centerX, content.x, content.x + content.width),
    centerY: clamp(view.centerY, content.y, content.y + content.height),
  };
}

/** Scale the view by `factor` while keeping the anchor point under the pointer. */
export function zoomAt(view, factor, anchor, content, limits) {
  const scale = clamp(view.scale * factor, limits.minScale, limits.maxScale);
  const ratio = view.scale / scale;
  return clampView({
    scale,
    centerX: anchor.x - (anchor.x - view.centerX) * ratio,
    centerY: anchor.y - (anchor.y - view.centerY) * ratio,
  }, content, limits);
}

/** The character, its direct neighbours and every edge touching the character. */
export function focusSet(edges, id) {
  const nodes = new Set([id]);
  const touching = new Set();
  edges.forEach((edge, index) => {
    if (edge.fromId !== id && edge.toId !== id) return;
    touching.add(index);
    nodes.add(edge.fromId);
    nodes.add(edge.toId);
  });
  return { nodes, edges: touching };
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
function labelAnchor(from, control, to, t = 0.5) {
  const inverse = 1 - t;
  return {
    x: inverse ** 2 * from.x + 2 * inverse * t * control.x + t ** 2 * to.x,
    y: inverse ** 2 * from.y + 2 * inverse * t * control.y + t ** 2 * to.y,
  };
}

function offsetInside(start, size, min, max) {
  if (size > max - min) return min - start;
  if (start < min) return min - start;
  if (start + size > max) return max - start - size;
  return 0;
}

function positionLabel(label, anchor, bounds) {
  const lines = label.querySelectorAll?.('tspan') ?? [];
  const setPosition = (x, y) => {
    label.setAttribute('x', String(x));
    label.setAttribute('y', String(y));
    for (const line of lines) line.setAttribute('x', String(x));
  };

  setPosition(anchor.x, anchor.y);
  if (typeof label.getBBox !== 'function') return;

  const box = label.getBBox();
  const dx = offsetInside(box.x, box.width, bounds.minX, bounds.minX + bounds.width);
  const dy = offsetInside(box.y, box.height, bounds.minY, bounds.minY + bounds.height);

  if (dx !== 0 || dy !== 0) setPosition(anchor.x + dx, anchor.y + dy);
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

    let start = from;
    let end = to;
    const endDx = to.x - control.x;
    const endDy = to.y - control.y;
    const endLength = Math.hypot(endDx, endDy);
    const endInset = map.nodeRadii.get(edge.toId) + 3;
    if (edge.oneSided && endLength > endInset) {
      end = { x: to.x - (endDx / endLength) * endInset, y: to.y - (endDy / endLength) * endInset };
    } else if (!edge.oneSided) {
      const startDx = control.x - from.x;
      const startDy = control.y - from.y;
      const startLength = Math.hypot(startDx, startDy);
      const startInset = map.nodeRadii.get(edge.fromId) + 3;
      if (startLength > startInset) {
        start = { x: from.x + (startDx / startLength) * startInset, y: from.y + (startDy / startLength) * startInset };
      }
      if (endLength > endInset) {
        end = { x: to.x - (endDx / endLength) * endInset, y: to.y - (endDy / endLength) * endInset };
      }
    }

    edge.path.setAttribute(
      'd',
      edge.curveOffset === 0
        ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
        : `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    );

    if (edge.label) {
      const anchor = labelAnchor(start, control, end, edge.labelT);
      positionLabel(edge.label, anchor, map.bounds);
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
    return { id, element, face: element.querySelector('.map-node-face') };
  });
  const nodeRadii = new Map(nodes.map((entry) => [entry.id, Number(entry.face?.getAttribute('r'))]));

  const edges = [...svg.querySelectorAll('.map-edge')].map((group) => {
    const fromId = Number(group.dataset.from);
    const toId = Number(group.dataset.to);
    const path = group.querySelector('.map-edge-line');
    const from = positions.get(fromId);
    const to = positions.get(toId);

    return {
      group,
      fromId,
      toId,
      path,
      oneSided: group.dataset.oneSided === '1',
      labelT: Number(group.dataset.labelT ?? 0.5),
      label: group.querySelector('.map-edge-label'),
      curveOffset: path && from && to ? readCurveOffset(path, from, to) : 0,
    };
  }).filter((edge) => edge.path && positions.has(edge.fromId) && positions.has(edge.toId));

  let hoveredNodeId = null;
  let focusedNodeId = null;
  const updateFocus = () => {
    const activeNodeId = hoveredNodeId ?? focusedNodeId;
    const active = activeNodeId === null ? null : focusSet(edges, activeNodeId);

    svg.classList.toggle('has-focus', active !== null);
    for (const entry of nodes) {
      entry.element.classList.toggle('is-focus', active !== null && active.nodes.has(entry.id));
      entry.element.classList.toggle('is-dimmed', active !== null && !active.nodes.has(entry.id));
    }
    edges.forEach((edge, index) => {
      edge.group.classList.toggle('is-focus', active !== null && active.edges.has(index));
      edge.group.classList.toggle('is-dimmed', active !== null && !active.edges.has(index));
    });
  };
  for (const entry of nodes) {
    entry.element.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      hoveredNodeId = entry.id;
      updateFocus();
    });
    entry.element.addEventListener('pointerleave', () => {
      if (hoveredNodeId !== entry.id) return;
      hoveredNodeId = null;
      updateFocus();
    });
    entry.element.addEventListener('focus', () => {
      focusedNodeId = entry.id;
      updateFocus();
    });
    entry.element.addEventListener('blur', () => {
      if (focusedNodeId !== entry.id) return;
      focusedNodeId = null;
      updateFocus();
    });
  }

  const box = viewBoxOf(svg);
  return { svg, nodes, edges, positions, nodeRadii, bounds: box };
}

function moveNode(map, entry, x, y) {
  const { bounds } = map;
  const radius = Number(entry.face.getAttribute('r'));
  const box = entry.element.getBBox?.();
  const hasBox = box
    && Number.isFinite(box.x)
    && Number.isFinite(box.y)
    && Number.isFinite(box.width)
    && Number.isFinite(box.height);

  const clamped = {
    x: clamp(
      x,
      bounds.minX - (hasBox ? box.x : -radius),
      bounds.minX + bounds.width - (hasBox ? box.x + box.width : radius),
    ),
    y: clamp(
      y,
      bounds.minY - (hasBox ? box.y : -radius),
      bounds.minY + bounds.height - (hasBox ? box.y + box.height : radius),
    ),
  };

  map.positions.set(entry.id, clamped);
  setPosition(entry.element, clamped.x, clamped.y);
  redrawEdges(map, entry.id);
}

/** Content bounds stay fixed; only the visible window (viewBox) changes. */
function setupView(map) {
  const { svg } = map;
  const content = { x: map.bounds.minX, y: map.bounds.minY, width: map.bounds.width, height: map.bounds.height };
  const state = { view: null, limits: null, initial: null, userMoved: false };

  const apply = () => {
    const { scale, centerX, centerY } = state.view;
    const size = boxSize();
    const width = (size.width > 0 ? size.width : content.width) / scale;
    const height = (size.height > 0 ? size.height : content.height) / scale;
    svg.setAttribute('viewBox', [centerX - width / 2, centerY - height / 2, width, height].map(round).join(' '));
  };
  const boxSize = () => {
    const rect = svg.getBoundingClientRect?.() ?? {};
    return { width: rect.width, height: rect.height };
  };
  const fit = () => {
    const size = boxSize();
    const next = fitView(content, size);
    state.limits = next;
    // A box with the same aspect ratio as the content shows the viewBox as-is;
    // otherwise the SVG letterboxes, which is fine for the centred window.
    state.initial = { scale: next.initialScale, centerX: next.centerX, centerY: next.centerY };
  };
  const refit = () => {
    fit();
    state.view = state.userMoved
      ? clampView(state.view, content, state.limits)
      : { ...state.initial };
    apply();
  };
  const toContent = (event) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: state.view.centerX + (event.clientX - (rect.left ?? 0) - rect.width / 2) / state.view.scale,
      y: state.view.centerY + (event.clientY - (rect.top ?? 0) - rect.height / 2) / state.view.scale,
    };
  };

  const api = {
    refit,
    zoomBy(factor, anchor) {
      const target = anchor ?? { x: state.view.centerX, y: state.view.centerY };
      state.view = zoomAt(state.view, factor, target, content, state.limits);
      state.userMoved = true;
      apply();
    },
    panBy(dxPixels, dyPixels) {
      state.view = clampView({
        ...state.view,
        centerX: state.view.centerX - dxPixels / state.view.scale,
        centerY: state.view.centerY - dyPixels / state.view.scale,
      }, content, state.limits);
      state.userMoved = true;
      apply();
    },
    reset() {
      state.userMoved = false;
      state.view = { ...state.initial };
      apply();
    },
    toContent,
    get scale() { return state.view.scale; },
  };

  fit();
  state.view = { ...state.initial };
  apply();
  map.viewApi = api;
  return api;
}

/** Empty-space panning, pinch zoom and Ctrl/Cmd+wheel zoom. */
function attachNavigation(map) {
  const { svg, viewApi } = map;
  const pointers = new Map();
  let pan = null;
  let pinch = null;

  const pinchMetrics = () => {
    const [a, b] = [...pointers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  svg.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target?.closest?.('.map-node')) return;

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      pan = null;
      pinch = pinchMetrics();
    } else if (pointers.size === 1) {
      pan = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    }
  });

  svg.addEventListener('pointermove', (event) => {
    const known = pointers.get(event.pointerId);
    if (!known) return;

    if (pinch && pointers.size === 2) {
      known.x = event.clientX;
      known.y = event.clientY;
      const next = pinchMetrics();
      if (pinch.distance > 0 && next.distance > 0) {
        viewApi.zoomBy(next.distance / pinch.distance, viewApi.toContent({ clientX: next.x, clientY: next.y }));
      }
      pinch = next;
      event.preventDefault?.();
      return;
    }
    if (!pan || pan.id !== event.pointerId) return;

    if (!pan.moved) {
      if (Math.hypot(event.clientX - pan.x, event.clientY - pan.y) <= DRAG_THRESHOLD) return;
      pan.moved = true;
      // Capture only once it is a real drag, so a plain click on an edge link still works.
      svg.setPointerCapture?.(event.pointerId);
      svg.classList.add('is-panning');
    }
    viewApi.panBy(event.clientX - pan.x, event.clientY - pan.y);
    pan.x = event.clientX;
    pan.y = event.clientY;
    event.preventDefault?.();
  });

  const end = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pan?.id === event.pointerId || pointers.size === 0) {
      pan = null;
      svg.classList.remove('is-panning');
    }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  svg.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    viewApi.zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, viewApi.toContent(event));
  }, { passive: false });
}
function attachControls(map) {
  const viewport = map.svg.parentElement;
  const controls = viewport?.querySelector?.('.map-controls');
  if (!controls) return;

  const labels = controls.querySelector('[data-map-labels]');
  const zoomIn = controls.querySelector('[data-map-zoom-in]');
  const zoomOut = controls.querySelector('[data-map-zoom-out]');
  const reset = controls.querySelector('[data-map-reset]');
  const fullscreen = controls.querySelector('[data-map-fullscreen]');
  const frame = viewport.parentElement;
  const fullscreenTarget = frame ?? viewport;
  const status = viewport.querySelector('.map-status');
  const details = frame?.querySelectorAll?.('.map-details li') ?? [];
  const links = map.svg.querySelectorAll('[data-relationship-link]');

  labels?.addEventListener('change', () => {
    map.svg.classList.toggle('labels-hidden', !labels.checked);
  });
  zoomIn?.addEventListener('click', () => map.viewApi.zoomBy(ZOOM_STEP));
  zoomOut?.addEventListener('click', () => map.viewApi.zoomBy(1 / ZOOM_STEP));
  reset?.addEventListener('click', () => map.viewApi.reset());

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };
  const updateFullscreenLabel = () => {
    if (!fullscreen) return;
    const document = viewport.ownerDocument;
    const active = document?.fullscreenElement === fullscreenTarget;
    map.viewApi.refit();
    fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  };

  if (fullscreen) {
    const document = viewport.ownerDocument;
    const supported = typeof fullscreenTarget.requestFullscreen === 'function'
      && typeof document?.exitFullscreen === 'function';
    fullscreen.disabled = !supported;
    if (!supported) fullscreen.title = 'Fullscreen is not supported in this browser';

    fullscreen.addEventListener('click', () => {
      if (!supported) {
        setStatus('Fullscreen is not supported in this browser.');
        return;
      }
      let action;
      try {
        action = document.fullscreenElement === fullscreenTarget
          ? document.exitFullscreen()
          : fullscreenTarget.requestFullscreen();
      } catch {
        setStatus('Fullscreen could not be opened; the map remains available here.');
        return;
      }
      Promise.resolve(action).then(updateFullscreenLabel).catch(() => {
        setStatus('Fullscreen could not be opened; the map remains available here.');
      });
    });
    document?.addEventListener?.('fullscreenchange', updateFullscreenLabel);
  }

  for (const link of links) {
    link.addEventListener('click', (event) => {
      const id = (link.getAttribute('href') || '').slice(1);
      const detail = [...details].find((item) => item.id === id);
      if (!detail) return;

      event.preventDefault();
      for (const item of details) item.classList.toggle('is-selected', item === detail);
      for (const edge of map.edges) {
        edge.group.classList.toggle('is-selected', edge.group.dataset.edge === link.dataset.relationshipLink);
      }
      detail.focus();
      setStatus(`Selected relationship: ${detail.textContent.trim()}`);
    });
  }

  controls.hidden = false;
}

export function attach(svg) {
  const map = readMap(svg);
  if (map.nodes.length === 0) return;
  setupView(map);
  attachNavigation(map);
  attachControls(map);
  svg.addEventListener('map:resize', map.viewApi.refit);
  if (typeof ResizeObserver === 'function') new ResizeObserver(map.viewApi.refit).observe(svg);
  else if (typeof window !== 'undefined') window.addEventListener('resize', map.viewApi.refit);

  for (const entry of map.nodes) {
    const { face } = entry;
    if (!face) continue;

    let dragging = null;

    // Without this the browser starts its own drag-a-link gesture on an
    // <a> element and swallows the pointer events, so the avatar never moves.
    entry.element.addEventListener('dragstart', (event) => event.preventDefault());

    face.addEventListener('pointerdown', (event) => {
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

      face.setPointerCapture(event.pointerId);
      entry.element.classList.add('is-dragging');
      event.preventDefault();
    });

    face.addEventListener('pointermove', (event) => {
      if (!dragging || event.pointerId !== dragging.pointerId) return;

      const travelled = Math.hypot(
        event.clientX - dragging.startClientX,
        event.clientY - dragging.startClientY,
      );
      if (travelled > DRAG_THRESHOLD) dragging.moved = true;
      if (!dragging.moved) return;

      const point = toSvgPoint(svg, event);
      if (!point) return;

      moveNode(map, entry, point.x + dragging.offsetX, point.y + dragging.offsetY);
      event.preventDefault();
    });

    const endDrag = (event, cancelled = false) => {
      if (!dragging || event.pointerId !== dragging.pointerId) return;

      // Read before clearing: the click event fires after pointerup, and it is
      // the only place the decision below can be acted on.
      entry.element.dataset.suppressClick = dragging.moved && !cancelled ? '1' : '';
      entry.element.classList.remove('is-dragging');

      if (face.hasPointerCapture?.(event.pointerId)) {
        face.releasePointerCapture(event.pointerId);
      }

      dragging = null;
    };

    face.addEventListener('pointerup', endDrag);
    face.addEventListener('pointercancel', (event) => endDrag(event, true));

    entry.element.addEventListener('click', (event) => {
      // Only a gesture that actually moved blocks navigation (FR-005).
      if (entry.element.dataset.suppressClick === '1') {
        event.preventDefault();
        entry.element.dataset.suppressClick = '';
      }
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
