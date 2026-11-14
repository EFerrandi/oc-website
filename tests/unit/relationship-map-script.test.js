import assert from 'node:assert/strict';
import test from 'node:test';

import { attach } from '../../src/public/js/relationship-map.js';

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
    };
  }

  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getBBox() { return this.getBBoxValue?.() ?? { x: 0, y: 0, width: 0, height: 0 }; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
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

function buildMap({ oneSided = false, nodeBPosition = { x: 300, y: 200 }, labelWidth = 40 } = {}) {
  const svg = new FakeElement({ viewBox: '0 0 400 300' });
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
  edge.dataset = { from: '1', to: '2', oneSided: oneSided ? '1' : '0' };
  edge.querySelector = (s) => (s === '.map-edge-line' ? path : label);

  svg.querySelectorAll = (s) => (s === '.map-node' ? [nodeA, nodeB] : s === '.map-edge' ? [edge] : []);
  svg.getBoundingClientRect = () => ({ width: 400, height: 300 });
  svg.getScreenCTM = () => ({ inverse: () => ({}) });
  svg.createSVGPoint = () => ({
    x: 0,
    y: 0,
    matrixTransform() { return { x: this.x, y: this.y }; },
  });

  attach(svg);
  return { svg, nodeA, faceA: nodeA.face, nameA: nodeA.name, edge, path, tspan, label };
}

test('a mouse press-and-drag moves a character and redraws its edges', () => {
  const { nodeA, faceA, path, tspan } = buildMap();

  faceA.fire('pointerdown', { clientX: 100, clientY: 100 });
  faceA.fire('pointermove', { clientX: 140, clientY: 120 });
  faceA.fire('pointerup', { clientX: 140, clientY: 120 });

  assert.equal(nodeA.getAttribute('transform'), 'translate(140,120)');
  assert.match(path.getAttribute('d'), /^M 140 120 L 300 200$/);
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

test('dragging empty space never pans the view or moves a character', () => {
  const { svg } = buildMap();

  svg.fire('pointerdown', { clientX: 200, clientY: 150 });
  svg.fire('pointermove', { clientX: 170, clientY: 130 });
  svg.fire('pointerup', { clientX: 170, clientY: 130 });

  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');
});

test('touch dragging the face moves the node but empty space does not move the map', () => {
  const { svg, nodeA, faceA } = buildMap();

  svg.fire('pointerdown', { clientX: 200, clientY: 150, pointerType: 'touch' });
  svg.fire('pointermove', { clientX: 100, clientY: 150, pointerType: 'touch' });
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');

  faceA.fire('pointerdown', { clientX: 100, clientY: 100, pointerType: 'touch' });
  faceA.fire('pointermove', { clientX: 60, clientY: 100, pointerType: 'touch' });
  faceA.fire('pointerup', { clientX: 60, clientY: 100, pointerType: 'touch' });
  assert.equal(nodeA.getAttribute('transform'), 'translate(60,100)');
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');
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
