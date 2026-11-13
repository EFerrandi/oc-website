import assert from 'node:assert/strict';
import test from 'node:test';

import { attach, panBox } from '../../src/public/js/relationship-map.js';

/** Minimal event target with just enough DOM for the map script. */
class FakeElement {
  constructor(attrs = {}, parent = null) {
    this.attrs = { ...attrs };
    this.listeners = {};
    this.parent = parent;
    this.dataset = {};
    this.children = [];
    this.classes = new Set();
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
    };
  }

  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() { return true; }
  closest(selector) {
    let el = this;
    while (el) {
      if (selector === '.map-node' && el.isNode) return el;
      el = el.parent;
    }
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

function buildMap() {
  const svg = new FakeElement({ viewBox: '0 0 400 300' });
  const makeNode = (id, x, y) => {
    const el = new FakeElement({ transform: `translate(${x},${y})` }, svg);
    el.isNode = true;
    el.dataset.node = String(id);
    return el;
  };
  const nodeA = makeNode(1, 100, 100);
  const nodeB = makeNode(2, 300, 200);

  const path = new FakeElement({ d: 'M 100 100 L 300 200' });
  const tspan = new FakeElement({ x: '200' });
  const label = new FakeElement({ x: '200', y: '150' });
  label.querySelectorAll = () => [tspan];
  const edge = new FakeElement();
  edge.dataset = { from: '1', to: '2' };
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
  return { svg, nodeA, path, tspan, label };
}

const viewBox = (svg) => svg.getAttribute('viewBox').split(' ').map(Number);

test('a mouse press-and-drag moves a character and redraws its edges', () => {
  const { nodeA, path, tspan } = buildMap();

  nodeA.fire('pointerdown', { clientX: 100, clientY: 100 });
  nodeA.fire('pointermove', { clientX: 140, clientY: 120 });
  nodeA.fire('pointerup', { clientX: 140, clientY: 120 });

  assert.equal(nodeA.getAttribute('transform'), 'translate(140,120)');
  assert.match(path.getAttribute('d'), /^M 140 120 L 300 200$/);
  assert.notEqual(tspan.getAttribute('x'), '200', 'wrapped label lines follow the edge');
});

test('the browser native link drag is cancelled so a mouse drag is not hijacked', () => {
  const { nodeA } = buildMap();
  const event = nodeA.fire('dragstart');
  assert.equal(event.defaultPrevented, true);
});

test('a drag suppresses the click, a plain click does not', () => {
  const { nodeA } = buildMap();

  nodeA.fire('pointerdown', { clientX: 100, clientY: 100 });
  nodeA.fire('pointermove', { clientX: 130, clientY: 100 });
  nodeA.fire('pointerup', { clientX: 130, clientY: 100 });
  assert.equal(nodeA.fire('click').defaultPrevented, true);

  nodeA.fire('pointerdown', { clientX: 130, clientY: 100 });
  nodeA.fire('pointerup', { clientX: 130, clientY: 100 });
  assert.equal(nodeA.fire('click').defaultPrevented, false);
});

test('a mouse press on empty space pans the view', () => {
  const { svg } = buildMap();

  svg.fire('pointerdown', { clientX: 200, clientY: 150 });
  svg.fire('pointermove', { clientX: 170, clientY: 130 });
  svg.fire('pointerup', { clientX: 170, clientY: 130 });

  const [x, y] = viewBox(svg);
  assert.equal(x, 30, 'dragging left moves the view right');
  assert.equal(y, 20);
});

test('touch on empty space does not pan, and a node press does not pan', () => {
  const { svg, nodeA } = buildMap();

  svg.fire('pointerdown', { clientX: 200, clientY: 150, pointerType: 'touch' });
  svg.fire('pointermove', { clientX: 100, clientY: 150, pointerType: 'touch' });
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');

  nodeA.fire('pointerdown', { clientX: 100, clientY: 100 });
  nodeA.fire('pointermove', { clientX: 60, clientY: 100 });
  nodeA.fire('pointerup', { clientX: 60, clientY: 100 });
  assert.equal(svg.getAttribute('viewBox'), '0 0 400 300');
});

test('panBox keeps part of the drawing in view', () => {
  const bounds = { minX: 0, minY: 0, width: 400, height: 300 };
  assert.deepEqual(panBox(bounds, bounds, 30, -20), { minX: 30, minY: -20, width: 400, height: 300 });
  const far = panBox(bounds, bounds, 9999, -9999);
  assert.equal(far.minX, 200);
  assert.equal(far.minY, -150);
});
