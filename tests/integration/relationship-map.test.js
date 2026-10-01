import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { NSFW_MARKERS, seedFixtures } from '../helpers/fixtures.js';

/**
 * Constitution Principle I — Content Rating Safety (NON-NEGOTIABLE), applied
 * to the relationship map.
 *
 * The map is the riskiest surface in the feature, because a node carries a
 * character's NAME and AVATAR. Rendering a node for a character the visitor
 * may not see discloses that character even if the avatar image itself
 * answers 404 — the node is the leak, not the picture. These tests are
 * written before the template exists and must be seen failing first.
 *
 * Fixture shape this suite relies on:
 *   - Aria ↔ Brann  "childhood friends"  (SFW)
 *   - Aria ↔ Shadow "lovers"             (NSFW)
 * so Shadow appears ONLY through an NSFW relationship and must be absent from
 * the page entirely before opt-in.
 */

function withApp(t) {
  const ctx = createTestApp();
  const ids = seedFixtures(ctx.db);
  t.after(() => ctx.cleanup());
  return { ...ctx, ids };
}

const get = (app, { nsfw = false } = {}) => {
  const req = request(app).get('/relationships');
  return nsfw ? req.set('Cookie', NSFW_ON) : req;
};

/**
 * Pull every `data-node` / `data-edge` attribute value out of the markup.
 * Regex rather than a parser is deliberate: it sees the bytes actually sent,
 * so markup that a DOM would discard (a node inside a hidden container, a
 * stray duplicate) is still caught.
 */
function mapItems(html, attribute) {
  return [...html.matchAll(new RegExp(`data-${attribute}="([^"]*)"`, 'g'))].map((m) => m[1]);
}

/** The slice of the page belonging to one map, located by its region marker. */
function mapRegion(html, rating) {
  const start = html.indexOf(`data-map-region="${rating}"`);
  if (start === -1) return '';

  const next = html.indexOf('data-map-region="', start + 1);
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

// T011 — guarantee G-1: nothing is rendered and then hidden.
test('before opt-in the NSFW map region contains no nodes or edges at all', async (t) => {
  const { app } = withApp(t);

  const res = await get(app);
  assert.equal(res.status, 200);

  const region = mapRegion(res.text, 'nsfw');

  assert.deepEqual(
    mapItems(region, 'node'), [],
    'NSFW map emitted node elements to a visitor who did not opt in',
  );
  assert.deepEqual(
    mapItems(region, 'edge'), [],
    'NSFW map emitted edge elements to a visitor who did not opt in',
  );

  // Positive control. Without this the assertions above would also hold for a
  // page that draws nothing at all, which is not what is being promised.
  assert.ok(
    mapItems(mapRegion(res.text, 'sfw'), 'node').length > 0,
    'the SFW map drew no nodes, so the NSFW assertions above proved nothing',
  );
});

// T012 — guarantee G-2, FR-009.
test('before opt-in no NSFW marker appears anywhere in the response', async (t) => {
  const { app } = withApp(t);

  const res = await get(app);
  assert.equal(res.status, 200);

  for (const marker of NSFW_MARKERS) {
    assert.ok(
      !res.text.includes(marker),
      `/relationships leaked ${JSON.stringify(marker)} with no cookie set`,
    );
  }
});

// T013 — invariant I-M1, guarantee G-3, FR-004.
test('a character reachable only through an NSFW relationship is wholly absent before opt-in', async (t) => {
  const { app, ids } = withApp(t);

  const before = await get(app);
  assert.equal(before.status, 200);

  assert.ok(!before.text.includes('Shadow'), 'leaked the name of an NSFW-only character');
  assert.ok(!before.text.includes('/characters/shadow'), 'leaked a link to an NSFW-only character');
  assert.ok(
    !before.text.includes(`/media/${ids.imageNsfwShadow}`),
    'leaked the avatar image id of an NSFW-only character',
  );

  // The converse: opting in must actually reveal them, otherwise the
  // assertions above would pass on a page that renders nothing.
  const after = await get(app, { nsfw: true });
  assert.equal(after.status, 200);
  assert.ok(after.text.includes('Shadow'), 'NSFW-only character stayed hidden after opt-in');
  assert.ok(after.text.includes('lovers'), 'NSFW relationship label stayed hidden after opt-in');
});

// T014 — invariant I-M2, guarantee G-5: the layout is not a side channel.
test('the SFW map is byte-identical with and without the opt-in cookie', async (t) => {
  const { app } = withApp(t);

  const [off, on] = [await get(app), await get(app, { nsfw: true })];
  assert.equal(off.status, 200);
  assert.equal(on.status, 200);

  const sfwOff = mapRegion(off.text, 'sfw');
  const sfwOn = mapRegion(on.text, 'sfw');

  assert.notEqual(sfwOff, '', 'the SFW map region was not found — fix the locator, not the test');
  assert.equal(
    sfwOff, sfwOn,
    'the SFW map changed when NSFW was enabled, so its arrangement reveals how much NSFW data exists',
  );
});

// T015 — guarantee G-4, FR-011.
test('every avatar URL is a gated preview and the full-size route is never linked', async (t) => {
  const { app } = withApp(t);

  for (const nsfw of [false, true]) {
    const res = await get(app, { nsfw });
    assert.equal(res.status, 200);

    assert.ok(
      !res.text.includes('/full'),
      `the full-size media route was linked from the map (nsfw=${nsfw})`,
    );
    assert.ok(
      !res.text.includes('/uploads/'),
      `a raw upload path was linked from the map (nsfw=${nsfw})`,
    );

    const sources = [...res.text.matchAll(/(?:src|href|xlink:href)="([^"]*)"/g)]
      .map((m) => m[1])
      .filter((url) => url.startsWith('/media/') || url.includes('placeholder-avatar'));

    for (const url of sources) {
      assert.match(
        url,
        /^(?:\/media\/\d+|\/img\/placeholder-avatar\.svg)$/,
        `unexpected avatar URL ${JSON.stringify(url)} (nsfw=${nsfw})`,
      );
    }

    // Positive control: a page with no avatars at all would satisfy every
    // assertion above without proving anything.
    assert.ok(sources.length > 0, `no avatar URLs were rendered at all (nsfw=${nsfw})`);
  }
});

// T016 — guarantee G-6: the response must stay correctly cacheable per cookie.
test('/relationships answers 200 with Vary: Cookie in both rating states', async (t) => {
  const { app } = withApp(t);

  for (const nsfw of [false, true]) {
    const res = await get(app, { nsfw });

    assert.equal(res.status, 200, `/relationships should render (nsfw=${nsfw})`);
    assert.match(
      res.headers.vary ?? '',
      /\bCookie\b/i,
      `Vary: Cookie missing — a shared cache could serve the wrong rating (nsfw=${nsfw})`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * US1 � the map is drawn, server-side, and reachable without JS.
 * ------------------------------------------------------------------ */

// T019 � FR-021, SC-006: the map arrives already drawn.
test('the SFW map ships literal coordinates rather than being computed in the browser', async (t) => {
  const { app } = withApp(t);

  const region = mapRegion((await get(app)).text, 'sfw');

  const translates = [...region.matchAll(/transform="translate\((-?[\d.]+)[ ,]+(-?[\d.]+)\)"/g)];
  assert.ok(translates.length > 0, 'no node carried a numeric translate � the map was not laid out server-side');

  for (const [, x, y] of translates) {
    assert.ok(Number.isFinite(Number(x)) && Number.isFinite(Number(y)), `non-numeric translate (${x}, ${y})`);
  }

  const labels = [...region.matchAll(/<text[^>]*class="[^"]*map-edge-label[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.ok(labels.length > 0, 'no edge label was rendered');

  for (const label of labels) {
    assert.match(label, /\bx="-?[\d.]+"/, `edge label has no numeric x: ${label}`);
    assert.match(label, /\by="-?[\d.]+"/, `edge label has no numeric y: ${label}`);
  }
});

// T020 � edges reference real nodes, and paint beneath them.
test('every edge joins two rendered nodes and all edges precede all nodes', async (t) => {
  const { app } = withApp(t);

  const region = mapRegion((await get(app, { nsfw: true })).text, 'sfw');
  const nodeIds = new Set(mapItems(region, 'node'));

  assert.ok(nodeIds.size > 0, 'no nodes were rendered');

  const froms = mapItems(region, 'from');
  const tos = mapItems(region, 'to');
  assert.ok(froms.length > 0, 'no edge carried data-from');
  assert.equal(froms.length, tos.length, 'every edge needs both data-from and data-to');

  for (const id of [...froms, ...tos]) {
    assert.ok(nodeIds.has(id), `edge endpoint ${id} has no matching data-node`);
  }

  // Avatars must paint above the lines, and SVG has no z-index: the only
  // control is document order, so this ordering is load-bearing, not cosmetic.
  assert.ok(
    region.lastIndexOf('data-edge=') < region.indexOf('data-node='),
    'a node was emitted before an edge, so lines will paint over the avatars',
  );
});

// T021 � FR-005, Constitution III: navigable with no JavaScript.
test('each node is a plain link to the character with an accessible name', async (t) => {
  const { app } = withApp(t);

  const region = mapRegion((await get(app)).text, 'sfw');
  const anchors = [...region.matchAll(/<a\b[^>]*class="[^"]*map-node[^"]*"[^>]*>/g)].map((m) => m[0]);

  assert.ok(anchors.length > 0, 'the map rendered no node links');

  for (const anchor of anchors) {
    assert.match(anchor, /href="\/characters\/[a-z0-9-]+"/, `node is not a usable link: ${anchor}`);
    assert.match(anchor, /aria-label="[^"]+"/, `node link has no accessible name: ${anchor}`);
  }

  assert.ok(region.includes('href="/characters/aria"'), 'Aria was not linked from the map');
});

// T022 � FR-021a: a text equivalent for anyone who cannot read the drawing.
test('each map is followed by a visually hidden list of its relationships', async (t) => {
  const { app } = withApp(t);

  const res = await get(app, { nsfw: true });
  const region = mapRegion(res.text, 'sfw');

  const svgEnd = region.indexOf('</svg>');
  assert.notEqual(svgEnd, -1, 'no <svg> was rendered');

  const after = region.slice(svgEnd);
  assert.ok(
    after.includes('map-text-equivalent'),
    'the text equivalent must follow the svg, so it is announced in the same place',
  );

  const items = [...after.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]*>/g, ' '));
  assert.equal(items.length, mapItems(region, 'edge').length, 'one list entry per drawn relationship');

  const joined = items.join(' | ');
  assert.match(joined, /Aria/);
  assert.match(joined, /Brann/);
  assert.match(joined, /childhood friends/);
});

// T023 � FR-007: an empty map is a message, not a blank frame.
test('a map with no visible relationships shows the empty-state message', async (t) => {
  const { app } = withApp(t);

  const region = mapRegion((await get(app)).text, 'nsfw');

  assert.ok(!region.includes('<svg'), 'an empty map should not draw an empty frame');
  assert.ok(
    region.includes('Show NSFW content'),
    'the empty NSFW map should still invite the visitor to opt in',
  );
});

/* ------------------------------------------------------------------ *
 * US3 � dragging is an enhancement layered on complete markup.
 * ------------------------------------------------------------------ */

// T043 � Constitution III, FR-021: the script is additive only.
test('the drag script is deferred and the map is complete without it', async (t) => {
  const { app } = withApp(t);

  const res = await get(app);

  // A module script is deferred by definition, so either spelling satisfies
  // the real requirement: the map must never wait on this file.
  assert.match(
    res.text,
    /<script[^>]*src="\/js\/relationship-map\.js"[^>]*(?:\bdefer\b|type="module")/,
    'the drag script must be deferred so it never blocks the already-drawn map',
  );

  // Strip every script tag and confirm the map still carries its full meaning:
  // positioned nodes, labelled edges, working links, and the text equivalent.
  const withoutScripts = res.text.replace(/<script[\s\S]*?<\/script>/g, '');
  const region = mapRegion(withoutScripts, 'sfw');

  assert.ok(mapItems(region, 'node').length > 0, 'no nodes survive without JavaScript');
  assert.ok(mapItems(region, 'edge').length > 0, 'no edges survive without JavaScript');
  assert.match(region, /transform="translate\(-?[\d.]+/, 'nodes lost their server-computed positions');
  assert.ok(region.includes('childhood friends'), 'edge labels are not in the delivered HTML');
  assert.ok(region.includes('href="/characters/aria"'), 'nodes are not navigable without JavaScript');
  assert.ok(region.includes('map-text-equivalent'), 'the text equivalent is not in the delivered HTML');
});

// T044 � FR-019: the keys must be discoverable, not hidden in a tooltip.
test('the keyboard repositioning help is visible page text', async (t) => {
  const { app } = withApp(t);

  const res = await get(app);

  const helpMatch = res.text.match(/<p class="map-help[^"]*"[^>]*>([\s\S]*?)<\/p>/g);
  assert.ok(helpMatch, 'no map help text was rendered');

  const help = helpMatch.join(' ');
  assert.match(help, /arrow key/i, 'the help text must name the arrow keys');
  assert.match(help, /shift/i, 'the help text must mention the larger Shift step');

  // It must be real text, not an attribute a pointer user has to hover to find.
  assert.ok(
    !/title="[^"]*arrow key/i.test(res.text),
    'keyboard help belongs in the page, not in a title attribute',
  );
});
