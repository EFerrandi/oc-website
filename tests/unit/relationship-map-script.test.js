import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attach, clampView, fitView, focusSet, zoomAt, MAX_SCALE, MIN_READABLE_SCALE,
} from '../../src/public/js/relationship-map.js';

/** Minimal event target with just enough DOM for the map script. */
class FakeElement {
  constructor(attrs = {}, parent = null) {
    this.attrs = { ...attrs };
    this.listeners = {};
    this.parent = parent;
    this.dataset = {};
    this.children = [];
    this.classes = new Set();
    this.pointerCapture = null;
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
      toggle: (c, force) => {
        const shouldAdd = force ?? !this.classes.has(c);
        if (shouldAdd) this.classes.add(c);
        else this.classes.delete(c);
        return shouldAdd;
      },
    };
  }

  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  get parentElement() { return this.parent; }
  getBBox() { return this.getBBoxValue?.() ?? { x: 0, y: 0, width: 0, height: 0 }; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  focus() { this.focused = true; }
  setPointerCapture(id) { this.pointerCapture = id; }
  releasePointerCapture(id) { if (this.pointerCapture === id) this.pointerCapture = null; }
  hasPointerCapture(id) { return this.pointerCapture === id; }
  closest(selector) {
    let el = this;
    while (el) {
      if (selector === '.map-node' && el.isNode) return el;
      if (selector === '.map-node-face' && el.isFace) return el;
      el = el.parent;
    }
    return null;
  }

  querySelector(selector) {
    if (selector === '.map-node-face') return this.face ?? null;
    return null;
  }

  fire(type, init = {}) {
    const event = {
      type, target: this, button: 0, pointerId: 1, pointerType: 'mouse', clientX: 0, clientY: 0,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...init,
    };
    let el = this;
    while (el) {
      for (const fn of el.listeners[type] ?? []) fn(event);
      el = el.parent;
    }
    return event;
  }
}

function buildMap({
  oneSided = false,
  nodeBPosition = { x: 300, y: 200 },
  labelWidth = 40,
  labelT = 0.5,
  controls = false,
  fullscreenFails = false,
  boxWidth = 400,
  boxHeight = 300,
  viewBox = '0 0 400 300',
} = {}) {
  const frame = new FakeElement();
  const viewport = new FakeElement({}, frame);
  const svg = new FakeElement({ viewBox }, viewport);
  const document = new FakeElement();
  document.fullscreenElement = null;
  document.exitFullscreenTarget = null;
  document.exitFullscreen = () => {
    document.fullscreenElement = null;
    return Promise.resolve();
  };
  viewport.ownerDocument = document;
  frame.requestFullscreen = fullscreenFails
    ? () => Promise.reject(new Error('fullscreen denied'))
    : () => {
      document.fullscreenElement = frame;
      return Promise.resolve();
    };
  const makeNode = (id, x, y) => {
    const el = new FakeElement({ transform: `translate(${x},${y})` }, svg);
    el.isNode = true;
    el.dataset.node = String(id);
    el.getBBoxValue = () => ({ x: -60, y: -48, width: 120, height: 156 });
    el.face = new FakeElement({ r: '48' }, el);
    el.face.isFace = true;
    el.name = new FakeElement({}, el);
    return el;
  };
  const nodeA = makeNode(1, 100, 100);
  const nodeB = makeNode(2, nodeBPosition.x, nodeBPosition.y);
  const nodeC = makeNode(3, 350, 250);

  const path = new FakeElement({ d: `M 100 100 L ${nodeBPosition.x} ${nodeBPosition.y}` });
  const tspan = new FakeElement({ x: '200' });
  const labelX = (100 + nodeBPosition.x) / 2;
  const labelY = (100 + nodeBPosition.y) / 2;
  const label = new FakeElement({ x: String(labelX), y: String(labelY) });
  label.getBBoxValue = () => ({
    x: Number(label.getAttribute('x')) - labelWidth / 2,
    y: Number(label.getAttribute('y')) - 10,
    width: labelWidth,
    height: 20,
  });
  label.querySelectorAll = () => [tspan];
  const edge = new FakeElement();
  edge.dataset = { from: '1', to: '2', oneSided: oneSided ? '1' : '0', labelT: String(labelT) };
  edge.dataset.edge = '11';
  edge.querySelector = (s) => (s === '.map-edge-line' ? path : label);
  const unrelatedPath = new FakeElement({ d: `M ${nodeBPosition.x} ${nodeBPosition.y} L 350 250` });
  const unrelatedLabel = new FakeElement({ x: '325', y: '225' });
  unrelatedLabel.getBBoxValue = () => ({ x: 305, y: 215, width: 40, height: 20 });
  unrelatedLabel.querySelectorAll = () => [];
  const unrelatedEdge = new FakeElement();
  unrelatedEdge.dataset = { from: '2', to: '3', oneSided: '0' };
  unrelatedEdge.querySelector = (s) => (s === '.map-edge-line' ? unrelatedPath : unrelatedLabel);

  const relationshipLink = new FakeElement({ href: '#map-test-relationship-11' }, svg);
  relationshipLink.dataset.relationshipLink = '11';
  const detail = new FakeElement();
  detail.id = 'map-test-relationship-11';
  detail.textContent = 'Aria — friends — Brann';
  const status = new FakeElement({}, viewport);
  const mapControls = new FakeElement({}, viewport);
  const labels = new FakeElement();
  labels.checked = true;
  const zoomIn = new FakeElement();
  const zoomOut = new FakeElement();
  const reset = new FakeElement();
  const fullscreen = new FakeElement();
  mapControls.querySelector = (selector) => ({
    '[data-map-labels]': labels,
    '[data-map-zoom-in]': zoomIn,
    '[data-map-zoom-out]': zoomOut,
    '[data-map-reset]': reset,
    '[data-map-fullscreen]': fullscreen,
  })[selector] ?? null;
  mapControls.hidden = true;
  viewport.querySelector = (selector) => selector === '.map-controls' && controls
    ? mapControls
    : selector === '.map-status' ? status : null;
  frame.querySelectorAll = (selector) => selector === '.map-details li' && controls ? [detail] : [];
  svg.querySelectorAll = (s) => (s === '.map-node'
    ? [nodeA, nodeB, nodeC]
    : s === '.map-edge' ? [edge, unrelatedEdge]
      : s === '[data-relationship-link]' && controls ? [relationshipLink] : []);
  svg.rect = { width: boxWidth, height: boxHeight };
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, ...svg.rect });
  svg.getScreenCTM = () => ({ inverse: () => ({}) });
  svg.createSVGPoint = () => ({
    x: 0,
    y: 0,
    matrixTransform() { return { x: this.x, y: this.y }; },
  });

  attach(svg);
  return {
    svg, nodeA, nodeB, nodeC, faceA: nodeA.face, nameA: nodeA.name,
    edge, unrelatedEdge, path, unrelatedPath, tspan, label,
    frame, viewport, document, controls: mapControls, labels, zoomIn, zoomOut, reset, fullscreen, status, detail, relationshipLink,
  };
}

test('a mouse press-and-drag moves a character and redraws its edges', () => {
  const { nodeA, faceA, path, tspan } = buildMap();

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 140, clientY: 120 });
  faceA.fire('pointerup', { clientX: 140, clientY: 120 });

  assert.equal(nodeA.getAttribute('transform'), 'translate(140,120)');
  const endpoints = path.getAttribute('d').match(/^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/);
  assert.ok(endpoints);
  assert.ok(Math.hypot(Number(endpoints[1]) - 140, Number(endpoints[2]) - 120) > 48);
  assert.ok(Math.hypot(Number(endpoints[3]) - 300, Number(endpoints[4]) - 200) > 48);
  assert.notEqual(tspan.getAttribute('x'), '200', 'wrapped label lines follow the edge');
});

test('a dragged character name stays fully inside the enlarged map bounds', () => {
  const { nodeA, faceA } = buildMap();

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 0, clientY: 0 });
  faceA.fire('pointerup', { clientX: 0, clientY: 0 });

  assert.equal(nodeA.getAttribute('transform'), 'translate(60,48)');
  const position = nodeA.getAttribute('transform').match(/translate\(([\d.-]+),([\d.-]+)\)/);
  const x = Number(position[1]);
  const y = Number(position[2]);
  const box = nodeA.getBBox();
  assert.ok(x + box.x >= 0);
  assert.ok(y + box.y >= 0);
  assert.ok(x + box.x + box.width <= 400);
  assert.ok(y + box.y + box.height <= 300);
});

test('a connected relationship label stays fully inside the map after an edge drag', () => {
  const { nodeA, faceA, label, tspan } = buildMap({
    nodeBPosition: { x: 70, y: 100 },
    labelWidth: 140,
  });

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 48, clientY: 100 });
  faceA.fire('pointerup', { clientX: 48, clientY: 100 });

  const position = nodeA.getAttribute('transform').match(/translate\(([\d.-]+),([\d.-]+)\)/);
  assert.equal(Number(position[1]), 60, 'the node keeps its name inside the viewBox');
  const box = label.getBBox();
  assert.ok(box.x >= 0);
  assert.ok(box.y >= 0);
  assert.ok(box.x + box.width <= 400);
  assert.ok(box.y + box.height <= 300);
  assert.ok(Number(label.getAttribute('x')) > 65, 'the label shifts inward from its edge anchor');
  assert.equal(tspan.getAttribute('x'), label.getAttribute('x'), 'wrapped label lines shift with the label');
});

test('a redrawn one-sided arrow leaves room for the enlarged target avatar', () => {
  const { faceA, path } = buildMap({ oneSided: true });

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 140, clientY: 120 });
  faceA.fire('pointerup', { clientX: 140, clientY: 120 });

  const endpoint = path.getAttribute('d').match(/L ([\d.-]+) ([\d.-]+)$/);
  const distanceFromTarget = Math.hypot(300 - Number(endpoint[1]), 200 - Number(endpoint[2]));
  assert.ok(Math.abs(distanceFromTarget - 51) < 1e-9, 'arrow endpoint keeps the 48px radius plus 3px gap');
});

test('a redrawn relationship label keeps its server-selected position along the edge', () => {
  const { faceA, path, label } = buildMap({ labelT: 0.25 });

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 140, clientY: 120 });
  faceA.fire('pointerup', { clientX: 140, clientY: 120 });

  const endpoints = path.getAttribute('d').match(/^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/);
  assert.ok(endpoints);
  const expectedX = Number(endpoints[1]) * 0.75 + Number(endpoints[3]) * 0.25;
  const expectedY = Number(endpoints[2]) * 0.75 + Number(endpoints[4]) * 0.25;
  assert.ok(Math.abs(Number(label.getAttribute('x')) - expectedX) < 1e-9);
  assert.ok(Math.abs(Number(label.getAttribute('y')) - expectedY) < 1e-9);
});

test('map controls toggle names and zoom without changing graph content', () => {
  const { svg, controls, labels, zoomIn, zoomOut } = buildMap({ controls: true });

  assert.equal(controls.hidden, false);
  labels.checked = false;
  labels.fire('change');
  assert.equal(svg.classes.has('labels-hidden'), true);

  zoomIn.fire('click');
  assert.equal(svg.getAttribute('viewBox'), '40 30 320 240');
  zoomOut.fire('click');
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');
  assert.equal(svg.querySelectorAll('.map-node').length, 3);
});

test('zoom stays within limits and reset restores the fitted view', () => {
  const { svg, zoomIn, zoomOut, reset } = buildMap({ controls: true });

  for (let i = 0; i < 30; i += 1) zoomIn.fire('click');
  const [, , zoomedWidth] = svg.getAttribute('viewBox').split(' ').map(Number);
  assert.ok(Math.abs(zoomedWidth - 400 / MAX_SCALE) < 0.01);
  for (let i = 0; i < 30; i += 1) zoomOut.fire('click');
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');

  zoomIn.fire('click');
  reset.fire('click');
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');
});

test('a large network starts fitted to the minimum readable size and can be panned', () => {
  const { svg } = buildMap({ viewBox: '0 0 4000 3000' });
  const [, , width] = svg.getAttribute('viewBox').split(' ').map(Number);
  assert.ok(Math.abs(width - 400 / MIN_READABLE_SCALE) < 0.01);
});

test('zooming out can reveal a whole large network', () => {
  const { svg, zoomOut } = buildMap({ viewBox: '0 0 8000 6000', controls: true });
  for (let i = 0; i < 30; i += 1) zoomOut.fire('click');
  assert.equal(svg.getAttribute('viewBox'), '0 0 8000 6000');
});

test('resizing the box refits an unmoved view', () => {
  const { svg } = buildMap({ viewBox: '0 0 4000 3000' });
  const before = svg.getAttribute('viewBox');
  svg.rect = { width: 800, height: 600 };
  svg.fire('map:resize');
  assert.notEqual(svg.getAttribute('viewBox'), before);
});

test('view helpers fit, clamp, zoom around an anchor and compute the focus set', () => {
  const content = { x: 0, y: 0, width: 1000, height: 500 };
  const fit = fitView(content, { width: 500, height: 500 });
  assert.equal(fit.initialScale, 0.5);
  assert.equal(fit.minScale, 0.5);
  assert.deepEqual(fitView(content, { width: 0, height: 0 }).initialScale, 1);

  const limits = { minScale: 0.5, maxScale: 3 };
  const clamped = clampView({ centerX: -50, centerY: 900, scale: 10 }, content, limits);
  assert.equal(clamped.scale, 3);
  assert.equal(clamped.centerX, 0);
  assert.equal(clamped.centerY, 500);

  const view = { centerX: 500, centerY: 250, scale: 1 };
  const anchor = { x: 700, y: 250 };
  const zoomed = zoomAt(view, 2, anchor, content, limits);
  assert.equal(zoomed.scale, 2);
  assert.equal(zoomed.centerX, 600);

  const edges = [{ fromId: '1', toId: '2' }, { fromId: '2', toId: '3' }, { fromId: '1', toId: '1' }];
  const set = focusSet(edges, '1');
  assert.deepEqual([...set.nodes].sort(), ['1', '2']);
  assert.deepEqual([...set.edges].sort(), [0, 2]);
});
test('selecting a relationship focuses its complete server-rendered details', () => {
  const { edge, relationshipLink, detail, status } = buildMap({ controls: true });
  const click = relationshipLink.fire('click');

  assert.equal(click.defaultPrevented, true);
  assert.equal(detail.focused, true);
  assert.equal(detail.classes.has('is-selected'), true);
  assert.equal(edge.classes.has('is-selected'), true);
  assert.match(status.textContent, /Selected relationship/);
});

test('selecting relationship details keeps them in the fullscreen map frame', async () => {
  const { frame, document, fullscreen, relationshipLink } = buildMap({ controls: true });

  fullscreen.fire('click');
  await Promise.resolve();
  assert.equal(document.fullscreenElement, frame);

  relationshipLink.fire('click');
  assert.equal(document.fullscreenElement, frame);
});

test('fullscreen controls report unsupported failures without disabling the map', async () => {
  const supported = buildMap({ controls: true });
  supported.fullscreen.fire('click');
  await Promise.resolve();
  assert.equal(supported.fullscreen.textContent, 'Exit fullscreen');

  const denied = buildMap({ controls: true, fullscreenFails: true });
  denied.fullscreen.fire('click');
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(denied.status.textContent, /could not be opened/);
  assert.equal(denied.svg.querySelectorAll('.map-node').length, 3);
});

test('the browser native link drag is cancelled so a mouse drag is not hijacked', () => {
  const { nodeA } = buildMap();
  const event = nodeA.fire('dragstart');
  assert.equal(event.defaultPrevented, true);
});

test('a drag suppresses the click, a plain click does not', () => {
  const { nodeA, faceA } = buildMap();

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 130, clientY: 100 });
  faceA.fire('pointerup', { clientX: 130, clientY: 100 });
  assert.equal(nodeA.fire('click').defaultPrevented, true);

  nodeA.fire('pointerdown', { clientX: 130, clientY: 100 });
  nodeA.fire('pointerup', { clientX: 130, clientY: 100 });
  assert.equal(nodeA.fire('click').defaultPrevented, false);
});

test('a pointer nudge below the drag threshold leaves the node in place', () => {
  const { nodeA, faceA } = buildMap();

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 102, clientY: 101 });
  faceA.fire('pointerup', { clientX: 102, clientY: 101 });

  assert.equal(nodeA.getAttribute('transform'), 'translate(100,100)');
  assert.equal(nodeA.fire('click').defaultPrevented, false);
  assert.equal(faceA.pointerCapture, null, 'the face releases its pointer capture');
});

test('cancelling a drag releases the face and does not suppress a later click', () => {
  const { nodeA, faceA } = buildMap();

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 130, clientY: 100 });
  faceA.fire('pointercancel', { clientX: 130, clientY: 100 });

  assert.equal(faceA.pointerCapture, null);
  assert.equal(nodeA.fire('click').defaultPrevented, false);
});


test('dragging empty space pans a zoomed view and never moves a character', () => {
  const { svg, nodeA, zoomIn } = buildMap({ controls: true });
  zoomIn.fire('click');

  svg.fire('pointerdown', { clientX: 200, clientY: 150 });
  svg.fire('pointermove', { clientX: 225, clientY: 150 });
  svg.fire('pointerup', { clientX: 225, clientY: 150 });

  assert.equal(svg.getAttribute('viewBox'), '20 30 320 240');
  assert.equal(nodeA.getAttribute('transform'), 'translate(100,100)');
});

test('touch dragging empty space pans while dragging a face still moves the node', () => {
  const { svg, nodeA, faceA, zoomIn } = buildMap({ controls: true });
  zoomIn.fire('click');

  svg.fire('pointerdown', { clientX: 200, clientY: 150, pointerType: 'touch' });
  svg.fire('pointermove', { clientX: 100, clientY: 150, pointerType: 'touch' });
  svg.fire('pointerup', { clientX: 100, clientY: 150, pointerType: 'touch' });
  assert.equal(svg.getAttribute('viewBox'), '120 30 320 240');

  faceA.fire('pointerdown', { clientX: 100, clientY: 100, pointerType: 'touch' });
  faceA.fire('pointermove', { clientX: 60, clientY: 100, pointerType: 'touch' });
  faceA.fire('pointerup', { clientX: 60, clientY: 100, pointerType: 'touch' });
  assert.equal(nodeA.getAttribute('transform'), 'translate(60,100)');
  assert.equal(svg.getAttribute('viewBox'), '120 30 320 240');
});

test('Ctrl+wheel zooms and a plain wheel is left to the page', () => {
  const { svg } = buildMap();
  const plain = svg.fire('wheel', { deltaY: -100 });
  assert.equal(plain.defaultPrevented, false);
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');

  const zoom = svg.fire('wheel', { deltaY: -100, ctrlKey: true, clientX: 200, clientY: 150 });
  assert.equal(zoom.defaultPrevented, true);
  assert.equal(svg.getAttribute('viewBox'), '40 30 320 240');
});

test('pressing the name or using arrow keys never moves a node', () => {
  const { nodeA, nameA } = buildMap();
  const original = nodeA.getAttribute('transform');

  nameA.fire('pointerdown', { clientX: 100, clientY: 150 });
  nameA.fire('pointermove', { clientX: 140, clientY: 190 });
  nameA.fire('pointerup', { clientX: 140, clientY: 190 });
  const arrow = nodeA.fire('keydown', { key: 'ArrowRight' });

  assert.equal(nodeA.getAttribute('transform'), original);
  assert.equal(arrow.defaultPrevented, false);
});

test('hover focuses the character and its neighbours and grays everything else', () => {
  const { svg, nodeA, nodeB, nodeC, edge, unrelatedEdge } = buildMap();

  nodeA.fire('pointerenter');

  assert.equal(svg.classes.has('has-focus'), true);
  assert.equal(nodeA.classes.has('is-focus'), true);
  assert.equal(nodeB.classes.has('is-focus'), true);
  assert.equal(nodeC.classes.has('is-dimmed'), true);
  assert.equal(edge.classes.has('is-focus'), true);
  assert.equal(unrelatedEdge.classes.has('is-dimmed'), true);
  assert.equal(unrelatedEdge.classes.has('is-focus'), false);

  nodeA.fire('pointerleave');
  assert.equal(svg.classes.has('has-focus'), false);
  assert.equal(nodeC.classes.has('is-dimmed'), false);
  assert.equal(unrelatedEdge.classes.has('is-dimmed'), false);
});

test('touch pointers never trigger hover focus', () => {
  const { svg, nodeA } = buildMap();
  nodeA.fire('pointerenter', { pointerType: 'touch' });
  assert.equal(svg.classes.has('has-focus'), false);
});

test('keyboard focus matches hover and overlapping hover/focus state resets only when both end', () => {
  const { svg, nodeA, nodeC, edge, unrelatedEdge } = buildMap();

  nodeA.fire('focus');
  assert.equal(edge.classes.has('is-focus'), true);
  assert.equal(unrelatedEdge.classes.has('is-dimmed'), true);
  assert.equal(nodeC.classes.has('is-dimmed'), true);

  nodeA.fire('pointerenter');
  nodeA.fire('pointerleave');
  assert.equal(svg.classes.has('has-focus'), true, 'focus stays active after pointer exit');

  nodeA.fire('blur');
  assert.equal(svg.classes.has('has-focus'), false);
  assert.equal(edge.classes.has('is-focus'), false);
  assert.equal(unrelatedEdge.classes.has('is-dimmed'), false);
});

test('pointer hover takes precedence over a different focused character and focus returns on pointer exit', () => {
  const { svg, nodeA, nodeC, edge, unrelatedEdge } = buildMap();

  nodeC.fire('focus');
  assert.equal(unrelatedEdge.classes.has('is-focus'), true);

  nodeA.fire('pointerenter');
  assert.equal(edge.classes.has('is-focus'), true);
  assert.equal(unrelatedEdge.classes.has('is-dimmed'), true);

  nodeA.fire('pointerleave');
  assert.equal(edge.classes.has('is-dimmed'), true);
  assert.equal(unrelatedEdge.classes.has('is-focus'), true);

  nodeC.fire('blur');
  assert.equal(svg.classes.has('has-focus'), false);
  assert.equal(edge.classes.has('is-dimmed'), false);
});