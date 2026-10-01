import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { clamp } from '../../src/public/js/relationship-map.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptFile = path.resolve(here, '../../src/public/js/relationship-map.js');

/**
 * The clamp is the client half of invariant I-M5. The server guarantees the
 * DEFAULT arrangement fits inside the viewBox; this guarantees a node the
 * visitor has dragged or arrow-keyed still does (FR-018).
 */

// T045.
test('clamp brings a position beyond any boundary back inside the box', () => {
  assert.equal(clamp(50, 0, 100), 50, 'a position already inside is untouched');
  assert.equal(clamp(0, 0, 100), 0, 'the lower bound itself is inside');
  assert.equal(clamp(100, 0, 100), 100, 'the upper bound itself is inside');

  assert.equal(clamp(-40, 0, 100), 0, 'a position past the left/top edge returns to it');
  assert.equal(clamp(140, 0, 100), 100, 'a position past the right/bottom edge returns to it');

  // Negative origins occur whenever a viewBox does not start at 0,0.
  assert.equal(clamp(-80, -50, 50), -50);
  assert.equal(clamp(80, -50, 50), 50);

  // A box narrower than the avatar collapses rather than inverting, which
  // would otherwise fling the node to the far side.
  assert.equal(clamp(10, 60, 40), 60, 'an impossible box pins to its minimum');

  // A bad coordinate must not propagate into the transform attribute.
  assert.equal(clamp(Number.NaN, 0, 100), 0, 'NaN resolves to the minimum, never to NaN');
});

// FR-020 is a prohibition, and the tempting "improvement" is to add
// persistence. Asserting on the source keeps that from slipping in quietly.
test('the drag script persists nothing anywhere', () => {
  // Comments are stripped first: this file explains the prohibition in prose,
  // and a scan that matched its own documentation would be useless.
  const source = fs.readFileSync(scriptFile, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  for (const forbidden of ['localStorage', 'sessionStorage', 'document.cookie', 'fetch(', 'XMLHttpRequest', 'history.pushState', 'history.replaceState']) {
    assert.ok(
      !source.includes(forbidden),
      `relationship-map.js uses ${forbidden}; FR-020 requires the map to reset on reload`,
    );
  }
});
