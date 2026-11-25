# Implementation Plan: Relationship Map Redesign

**Branch**: `018-relationship-map-redesign` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-relationship-map-redesign/spec.md`

## Summary

Redesign the existing server-rendered SVG relationship maps to match the supplied reference: dark teal canvas, curved gold paths, circular avatars sized by distinct visible neighbors, and a compact lower-right control panel. Keep the global rating-separated maps and profile-centered map, add character-name toggling, zoom, full-screen, and selectable relationship details, while retaining a readable no-JavaScript baseline.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, `node:sqlite`, and pinned `@khalidsaidi/topoloom`; browser-native SVG, DOM, and Fullscreen APIs

**Storage**: No schema or persisted data changes; map node sizing and coordinates are derived per request from rating-filtered relationship rows

**Testing**: `node:test`, Supertest, existing graph-layout tests, VM-based map interaction tests, and HTTP-level rating safety tests

**Target Platform**: Server-rendered responsive website with progressive-enhancement SVG maps

**Project Type**: Single Node.js web application

**Performance Goals**: Preserve the graph layout budget under 150 ms for 100 characters and 300 relationships; avoid per-interaction layout recomputation

**Constraints**: Keep server-side NSFW filtering before graph construction; use gated preview URLs; preserve profile centering, ordinary profile links, and face-only pointer/touch dragging; provide accessible controls; retain all visible nodes and relationships and readable relationship details without JavaScript; keep narrow-screen page width bounded

**Scale/Scope**: Existing global SFW and NSFW maps and profile maps; up to 100 characters and 300 relationships in the layout performance fixture

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Both existing relationship queries apply the visitor’s rating before view-model construction. The redesign adds no content route; all character avatar previews continue through the shared gated media route. Any accessible labels and relationship details must be generated from the same filtered rows. |
| II. Data Integrity Through Invariants | PASS | Relationship records and avatar metadata remain unchanged. Visible relationship counts and node radii are request-local derived values, not persisted invariants. |
| III. Works Without JavaScript | PASS WITH REQUIREMENTS | The server continues to emit the complete map, character identities, profile links, and relationship details. JavaScript only reveals controls, toggles names, zooms, enters full-screen, and opens an on-map detail view. Provide a usable visible relationship-details listing and visible character names in the baseline. |
| IV. Test-First Where It Counts | PASS | Preserve and extend HTTP-level NSFW tests before changing map data flow. Add regression tests for visible-edge-derived node sizes, controls and interaction behavior, keyboard operation, and no-JavaScript details. |
| V. Boring By Default | PASS | Use the existing SVG and interaction module with browser-native DOM and Fullscreen APIs. No new dependency, framework, route, or persisted schema is required. |

**Pre-research gate**: No MUST principle is relaxed. NSFW filtering remains server-side; static map markup is complete and readable before enhancement; all links and controls retain visible keyboard focus.

## Design Decisions

1. Reuse the shared `relationship-map.njk` partial for global and profile views. Keep the current global SFW/NSFW separation, profile-centered layout, no-JavaScript SVG output, and existing native character links.
2. Derive a visible neighbor count for each character from the map’s already-filtered relationship records. Count each distinct other endpoint once, regardless of parallel or reverse-direction records; self-relationships do not increase the count. Map the count monotonically to a bounded avatar-radius range so characters connected to more distinct others are visibly larger without allowing a hub to consume the canvas. Isolates in a profile map remain included and use the minimum radius.
3. Give each SVG avatar its own clipping geometry and radius; the current shared clip path assumes every avatar has the same radius. Pass per-node radius through layout and its bounds, spacing, edge endpoints, labels, and pointer-drag constraints.
4. Preserve every relationship as a separate path. Continue to show existing direction semantics with arrow markers; draw a second arrow direction for two-sided records. Curve paths sufficiently for parallel records to remain distinguishable, and keep each relationship detail anchored to its own route.
5. Add a shared, server-rendered control panel to each non-empty map. Character names are on by default so the no-JavaScript rendering stays understandable; JavaScript enhances the visible “Labels” toggle, zoom in/out, and fullscreen controls. Place the control panel as an overlay at the lower right of the map frame and keep it available in fullscreen.
6. Make each relationship path a keyboard-focusable native SVG link to its corresponding visible relationship detail in a server-rendered details list. JavaScript may also show a map-local detail panel and highlight the selected path. Keep relationship text available when scripts fail, and do not put excluded rating content in hidden or accessible markup.
7. Keep existing hover/focus emphasis and pointer/touch face dragging. Zoom changes the SVG viewBox rather than recomputing layout, and drag coordinates continue to use the current screen transform. Fullscreen is requested on the map frame with the controls inside it; if unsupported or rejected, retain normal map operation.
8. Use a dark blue/teal map surface and border, muted-gold curved paths and arrows, circular cropped avatars, and distinct packing for disconnected global components. Keep text contrast and node focus indicators accessible.
9. Keep the existing planar adapter and deterministic fallback. Crossing checks include final paths; if avatar-radius or routing geometry requires more room, grow map bounds rather than dropping visible map content.

## Project Structure

### Documentation (this feature)

```text
specs/018-relationship-map-redesign/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── relationship-map.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/lib/relationship-map-model.js              # visible relationship view model and node counts
src/lib/graph-layout.js                        # variable-radius geometry and labels
src/lib/planar-layout.js                       # crossing-free global coordinates
src/routes/public/relationships.js             # rating-specific global maps
src/routes/public/character.js                 # profile-centered map
src/views/partials/relationship-map.njk         # shared SVG paths, nodes, controls, details
src/views/pages/relationships.njk              # global map surfaces
src/views/pages/character.njk                  # profile map surface
src/public/js/relationship-map.js              # drag, emphasis, zoom, labels, selection, fullscreen
src/public/css/main.css                        # reference palette, nodes, paths, controls
tests/unit/relationship-map-model.test.js
tests/unit/graph-layout.test.js
tests/unit/planar-layout.test.js
tests/unit/relationship-map-script.test.js
tests/integration/relationship-map.test.js
tests/integration/character-profile.test.js
tests/integration/nsfw-character-relationships.test.js
tests/integration/accessibility.test.js
```

**Structure Decision**: Extend the existing single-project Express/Nunjucks application. Keep ratings and avatar resolution in the repository layer, graph-derived counts and geometry in pure libraries, server markup in shared templates, and interaction enhancement in the existing map module. No schema migration or new external API is required.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Add map-local state for names, zoom, selected relationship, and fullscreen | These are the controls explicitly shown by the supplied reference and requested in the specification. | Requiring a new route or persisted visitor state would add unnecessary machinery; a small browser-native enhancement preserves the static map baseline. |
