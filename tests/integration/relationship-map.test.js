import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { layoutGraph } from '../../src/lib/graph-layout.js';
import { findPlanarPositions } from '../../src/lib/planar-layout.js';
import { buildMapModel } from '../../src/lib/relationship-map-model.js';
import { listRelationshipCards } from '../../src/repositories/relationships.js';

import { createTestApp, NSFW_ON } from '../helpers/app.js';
import { NSFW_MARKERS, seedFixtures } from '../helpers/fixtures.js';
import { denseNetwork } from '../helpers/layout-metrics.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.resolve(here, '../../src/public/css/main.css'), 'utf8');
const mapTemplate = fs.readFileSync(
  path.resolve(here, '../../src/views/partials/relationship-map.njk'),
  'utf8',
);

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

function mapEdges(region) {
  return [...region.matchAll(/<g class="map-edge"([^>]*)>([\s\S]*?)<\/g>/g)].map(([, attrs, body]) => {
    const fromId = attrs.match(/\bdata-from="(\d+)"/)?.[1];
    const toId = attrs.match(/\bdata-to="(\d+)"/)?.[1];
    const path = body.match(/\bd="M (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+)"/);
    assert.ok(fromId && toId && path, `expected a straight edge with endpoint IDs: ${body}`);
    return {
      fromId,
      toId,
      from: { x: Number(path[1]), y: Number(path[2]) },
      to: { x: Number(path[3]), y: Number(path[4]) },
    };
  });
}

function segmentsCross(a, b) {
  if ([a.fromId, a.toId].some((id) => id === b.fromId || id === b.toId)) return false;
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return orient(a.from, a.to, b.from) * orient(a.from, a.to, b.to) < 0
    && orient(b.from, b.to, a.from) * orient(b.from, b.to, a.to) < 0;
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

test('the global route renders a crossing-free planar K4 while preserving all relationships', async (t) => {
  const { app, db, ids } = withApp(t);
  const at = new Date().toISOString();
  const extraId = db.prepare(
    `INSERT INTO character
       (name, slug, gender_id, short_description, terms_of_use,
        can_regift, can_retrade, can_resell, artist_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?)`,
  ).run('Dusk', 'dusk', ids.genderFemale, 'Dusk short description',
    'Do not resell without permission.', ids.designer, at, at).lastInsertRowid;
  const pairs = [
    [ids.aria, ids.shadow],
    [ids.aria, extraId],
    [ids.brann, ids.shadow],
    [ids.brann, extraId],
    [ids.shadow, extraId],
  ];
  const addRelationship = db.prepare(
    `INSERT INTO relationship
       (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
  );
  for (const [index, [fromId, toId]] of pairs.entries()) {
    addRelationship.run(fromId, toId, `planar relation ${index + 1}`, at, at);
  }

  const response = await get(app);
  assert.equal(response.status, 200);
  const region = mapRegion(response.text, 'sfw');
  const edges = mapEdges(region);

  assert.equal(mapItems(region, 'node').length, 4, 'all four K4 characters remain represented');
  assert.equal(edges.length, 6, 'every K4 relationship remains represented');
  assert.equal(edges.filter((a, i) => edges.slice(i + 1).some((b) => segmentsCross(a, b))).length, 0);
});

test('the global map is laid out compactly and the NSFW toggle never moves SFW nodes', async (t) => {
  const { app, db } = withApp(t);
  const sfw = mapRegion((await get(app)).text, 'sfw');
  const box = sfw.match(/viewBox="([\d.\s-]+)"/);
  const [, , width, height] = box[1].trim().split(/\s+/).map(Number);

  const { nodes, edges } = buildMapModel(listRelationshipCards(db, { showNsfw: false }).sfw);
  const old = layoutGraph(nodes, edges, { planarPositions: findPlanarPositions(nodes, edges) });
  assert.ok(width * height < old.width * old.height, `compact map (${width}x${height}) is smaller than the old layout`);
  const again = mapRegion((await get(app, { nsfw: true })).text, 'sfw');
  assert.equal(again, sfw, 'SFW map is identical with NSFW on');
});
// T020 � edges reference real nodes, and paint beneath them.
test('every edge joins two rendered nodes and all edges precede all nodes', async (t) => {
  const { app } = withApp(t);

  const response = await get(app, { nsfw: true });

  for (const rating of ['sfw', 'nsfw']) {
    const map = mapRegion(response.text, rating);
    const nodeIds = new Set(mapItems(map, 'node'));
    const froms = mapItems(map, 'from');
    const tos = mapItems(map, 'to');

    assert.ok(nodeIds.size > 0, `the ${rating} map rendered no nodes`);
    assert.ok(froms.length > 0, `the ${rating} map has no edges`);
    assert.equal(froms.length, tos.length, `every ${rating} edge needs both endpoints`);
    for (const id of [...froms, ...tos]) {
      assert.ok(nodeIds.has(id), `${rating} edge endpoint ${id} has no matching data-node`);
    }

    // Avatars must paint above the lines; SVG has no z-index.
    assert.ok(
      map.lastIndexOf('data-edge=') < map.indexOf('data-node='),
      `a ${rating} node was emitted before an edge`,
    );
    assert.equal(
      (map.match(/class="map-edge-label"/g) ?? []).length,
      mapItems(map, 'edge').length,
      `the ${rating} map must retain every relationship label`,
    );
  }
});

// T021 � FR-005, Constitution III: navigable with no JavaScript.
test('global maps size avatars by distinct visible neighbors and link every path to its details', async (t) => {
  const { app } = withApp(t);
  const region = mapRegion((await get(app)).text, 'sfw');
  const nodes = [...region.matchAll(/<a class="map-node"([\s\S]*?)<\/a>/g)];
  const edges = [...region.matchAll(/<a class="map-edge-link"[^>]*data-relationship-link="(\d+)"[^>]*>[\s\S]*?<g class="map-edge"([\s\S]*?)<\/g>/g)];

  assert.ok(nodes.length > 0);
  for (const [, markup] of nodes) {
    const neighborCount = Number(markup.match(/data-neighbor-count="(\d+)"/)?.[1]);
    const radius = Number(markup.match(/class="map-node-face"[^>]*r="([\d.]+)"/)?.[1]);
    assert.ok(Number.isInteger(neighborCount));
    assert.ok(radius >= 64 && radius <= 104);
    assert.ok(Math.abs(radius - (64 + 4 * Math.sqrt(neighborCount))) < 0.001);
  }

  assert.equal(edges.length, mapItems(region, 'edge').length);
  for (const [, relationshipId, edgeMarkup] of edges) {
    assert.ok(region.includes(`id="map-sfw-relationship-${relationshipId}"`));
    assert.match(edgeMarkup, /marker-start="url\(#map-sfw-arrow\)"/);
    assert.match(edgeMarkup, /marker-end="url\(#map-sfw-arrow\)"/);
  }
});

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
test('each map is followed by a readable list of its relationships', async (t) => {
  const { app } = withApp(t);

  const res = await get(app, { nsfw: true });
  const region = mapRegion(res.text, 'sfw');

  const svgEnd = region.indexOf('</svg>');
  assert.notEqual(svgEnd, -1, 'no <svg> was rendered');

  const after = region.slice(svgEnd);
  assert.ok(
    after.includes('map-details'),
    'relationship details must follow the SVG and remain available without JavaScript',
  );

  const items = [...after.matchAll(/<li id="map-sfw-relationship-\d+"[^>]*>([\s\S]*?)<\/li>/g)]
    .map((m) => m[1].replace(/<[^>]*>/g, ' '));
  assert.equal(items.length, mapItems(region, 'edge').length, 'one list entry per drawn relationship');

  const joined = items.join(' | ');
  assert.match(joined, /Aria/);
  assert.match(joined, /Brann/);
  assert.match(joined, /childhood friends/);
});

test('the relationship map keeps its visual and keyboard focus hooks', () => {
  assert.match(css, /\.map-edge-label\s*\{/, 'edge labels need a shared, readable style');
  assert.match(css, /\.map-node:focus-visible/, 'focused avatar links need a visible node-specific ring');
  assert.match(css, /\.relationship-map\.has-focus \.map-edge\.is-focus \.map-edge-line/, 'incident lines need a visible highlight');
  assert.match(css, /\.relationship-map\.has-focus \.is-dimmed\s*\{[^}]*grayscale\(1\)[^}]*opacity:\s*0\.[1-9]/s, 'unrelated nodes and lines must be grayed but remain visible');
  assert.doesNotMatch(css, /\.is-dimmed[^}]*display:\s*none/, 'unrelated relationships must not be hidden');
  assert.match(css, /\.relationship-map\.labels-hidden\.has-focus \.map-node\.is-focus \.map-node-name/, 'focused names show even with labels off');
  assert.doesNotMatch(css, /has-emphasis|is-subdued|is-emphasized/, 'old emphasis hooks must be gone');
  assert.match(mapTemplate, /class="map-details"/, 'complete relationships must have a server-rendered details list');
  assert.match(css, /\.map-controls\s*\{[^}]*position:\s*absolute/s, 'map controls must overlay the lower-right map frame');
  assert.match(css, /\.relationship-map\.labels-hidden \.map-node-name/, 'the labels control must affect names only');
});

test('relationship paths have keyboard links and each non-empty map has native controls', async (t) => {
  const { app } = withApp(t);
  const response = await get(app);
  const region = mapRegion(response.text, 'sfw');

  assert.match(region, /class="map-controls"[^>]*hidden/, 'enhancement controls stay hidden until handlers are attached');
  for (const selector of ['data-map-labels', 'data-map-zoom-in', 'data-map-zoom-out', 'data-map-reset', 'data-map-fullscreen']) {
    assert.ok(region.includes(selector), `missing map control ${selector}`);
  }

  const links = [...region.matchAll(/<a class="map-edge-link"[^>]*href="#(map-sfw-relationship-\d+)"/g)];
  assert.equal(links.length, mapItems(region, 'edge').length);
  for (const [, target] of links) assert.ok(region.includes(`id="${target}"`));
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
  assert.ok(region.includes('map-details'), 'the relationship details are not in the delivered HTML');
});

// US1: movement instructions must match the face-only interaction.
test('relationship help documents face dragging and keyboard link navigation, not keyboard movement', async (t) => {
  const { app } = withApp(t);

  const res = await get(app);

  const helpMatch = res.text.match(/<p class="map-help[^"]*"[^>]*>([\s\S]*?)<\/p>/g);
  assert.ok(helpMatch, 'no map help text was rendered');

  const help = helpMatch.join(' ');
  assert.match(help, /drag.*face|face.*drag/i, 'the help text must explain face dragging');
  assert.match(help, /Tab/i, 'the help text must explain keyboard navigation');
  assert.match(help, /Enter/i, 'the help text must explain keyboard activation');
  assert.match(help, /reload/i, 'the help text must explain that positions reset');
  assert.doesNotMatch(help, /arrow keys?.{0,30}mov|Shift.{0,30}mov/i, 'the help must not advertise keyboard movement');

  const mapNode = res.text.match(/<a\b[^>]*class="[^"]*map-node[^"]*"[^>]*>/);
  assert.ok(mapNode, 'character links must remain in the document');
  assert.match(mapNode[0], /href="\/characters\//, 'character link destination must remain available');
  assert.match(mapNode[0], /aria-label="[^"]+"/, 'character link must retain an accessible name');
});

test('relationship areas are stacked and the map frame owns any horizontal scrolling', async (t) => {
  const { app } = withApp(t);
  const res = await get(app);

  const sfw = res.text.indexOf('data-map-region="sfw"');
  const nsfw = res.text.indexOf('data-map-region="nsfw"');
  assert.ok(sfw >= 0 && nsfw > sfw, 'SFW relationship area must precede NSFW');
  assert.match(css, /\.relationship-cards\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s, 'relationship areas must be explicitly stacked');
  assert.doesNotMatch(css, /\.relationship-map-frame\s*\{[^}]*overflow-x:\s*auto/s, 'the map fits its frame instead of scrolling');
  assert.match(css, /\.relationship-map\s*\{[^}]*width:\s*100%[^}]*max-height:\s*75vh/s, 'the map is fitted to the frame and capped in height');
  assert.match(css, /\.relationship-map-viewport\s*\{[^}]*width:\s*100%/s, 'controls must anchor to the visible frame width on narrow screens');

  const svg = mapRegion(res.text, 'sfw').match(/<svg\b[^>]*class="relationship-map"[^>]*>/);
  assert.ok(svg, 'map SVG must render');
  assert.doesNotMatch(svg[0], /\swidth="|\sheight="/, 'SVG must not carry fixed pixel dimensions');
  assert.match(svg[0], /viewBox="0 0 [\d.]+ [\d.]+"/, 'SVG keeps its viewBox');
  assert.match(svg[0], /style="max-width: [\d.]+px; aspect-ratio: [\d.]+ \/ [\d.]+"/, 'SVG caps its natural size and keeps its aspect ratio');
  const width = Number(svg[0].match(/viewBox="0 0 ([\d.]+)/)[1]);
  assert.ok(width > 400, `computed map width ${width} must allow the enlarged layout`);
  assert.match(mapRegion(res.text, 'sfw'), /data-neighbor-count="\d+"/, 'node sizing must expose its visible-neighbor count');
  assert.match(mapRegion(res.text, 'sfw'), /clip-path="url\(#map-sfw-clip-\d+\)"/, 'each avatar must use its own radius-matched clip path');
  assert.match(css, /\.map-edge-label\s*\{[^}]*font-size:\s*16px/s, 'relationship text must be enlarged');
  assert.match(css, /\.map-node-name\s*\{[^}]*font-size:\s*16px/s, 'character names must be enlarged');
});

test('relationship areas stay in one column after all stylesheet overrides', () => {
  const gridRules = [...css.matchAll(/\.relationship-cards\s*\{([^}]*)\}/g)];
  assert.ok(gridRules.length > 0, 'relationship cards need a layout rule');

  const finalColumns = [...gridRules.at(-1)[1].matchAll(/grid-template-columns:\s*([^;]+);/g)].at(-1)?.[1].trim();
  assert.equal(finalColumns, 'minmax(0, 1fr)', 'no later theme rule may place SFW and NSFW side by side');
});

test('fullscreen targets the frame containing both the map controls and relationship details', async (t) => {
  const { app } = withApp(t);
  const html = (await get(app)).text;
  const region = mapRegion(html, 'sfw');

  assert.match(
    region,
    /class="relationship-map-frame">[\s\S]*class="relationship-map-viewport"[\s\S]*class="map-details"/,
    'the fullscreen frame must contain the map viewport and its complete relationship details',
  );
  assert.match(
    css,
    /\.relationship-map-frame:fullscreen\s*\{[^}]*overflow:\s*auto/s,
    'the fullscreen frame must keep the map and its details scrollable within the viewport',
  );
});

test('each character link has a separate circular face drag target', async (t) => {
  const { app } = withApp(t);
  const region = mapRegion((await get(app)).text, 'sfw');

  assert.match(region, /<circle\b[^>]*class="map-node-face"[^>]*data-drag-handle="face"/);
  assert.match(css, /\.map-node-face\s*\{[^}]*touch-action:\s*none[^}]*pointer-events:\s*all/s);
  assert.match(css, /\.relationship-map\s*\{[^}]*touch-action:\s*pan-y/s, 'vertical page scrolling stays native while horizontal drags pan the map');
});

test('character links remain keyboard-focusable with a visible focus indicator', async (t) => {
  const { app } = withApp(t);
  const region = mapRegion((await get(app)).text, 'sfw');
  const anchors = [...region.matchAll(/<a\b[^>]*class="[^"]*map-node[^"]*"[^>]*>/g)].map((match) => match[0]);

  assert.ok(anchors.length > 0);
  for (const anchor of anchors) {
    assert.match(anchor, /href="\/characters\//);
    assert.doesNotMatch(anchor, /tabindex="-1"/, 'character links must remain in the tab order');
  }
  assert.match(css, /\.map-node:focus-visible/, 'keyboard focus must remain visible on character links');
});
test('a dense SFW network is drawn compactly and never moves with the NSFW toggle', async (t) => {
  const { app, db, ids } = withApp(t);
  const at = new Date().toISOString();
  const { edges } = denseNetwork();
  const insertCharacter = db.prepare(
    `INSERT INTO character
       (name, slug, gender_id, short_description, terms_of_use,
        can_regift, can_retrade, can_resell, artist_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?, ?)`,
  );
  const characterIds = Array.from({ length: 35 }, (_, i) => insertCharacter.run(
    `Dense ${i + 1}`, `dense-${i + 1}`, ids.genderFemale, 'Dense short description',
    'Do not resell without permission.', ids.designer, at, at,
  ).lastInsertRowid);
  const addRelationship = db.prepare(
    `INSERT INTO relationship
       (from_character_id, to_character_id, label, is_nsfw, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
  );
  const seen = new Set();
  for (const edge of edges) {
    const key = [edge.fromId, edge.toId].sort((a, b) => a - b).join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    addRelationship.run(characterIds[edge.fromId - 1], characterIds[edge.toId - 1], edge.label, at, at);
  }

  const sfw = mapRegion((await get(app)).text, 'sfw');
  const [, , width, height] = sfw.match(/viewBox="([\d.\s-]+)"/)[1].trim().split(/\s+/).map(Number);
  const nodes = mapItems(sfw, 'node').length;

  assert.ok(nodes >= 35, `${nodes} nodes rendered`);
  assert.ok(width * height < 25 * 35 * 96 * 136, 'SFW map area stays bounded');
  assert.ok(Math.max(width, height) < 4500, `SFW map is ${width}x${height}`);
  assert.equal(mapRegion((await get(app, { nsfw: true })).text, 'sfw'), sfw);
  assert.equal(mapRegion((await get(app)).text, 'sfw'), sfw);
});