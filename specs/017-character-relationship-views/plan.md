# Implementation Plan: Character Relationship Views

**Branch**: `017-character-relationship-views` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-character-relationship-views/spec.md`

## Summary

Add a server-rendered, character-centered relationship diagram to each character profile, using the existing rating-filtered relationship rows and avatar resolution. Improve the shared graph layout so it finds crossing-free arrangements when possible and otherwise selects the best deterministic candidate without exceeding the input-order baseline. Reuse the global map's node/edge markup and enhance all maps with hover and keyboard-focus highlighting of only the active character's incident relationships.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, `node:sqlite`; validate `@khalidsaidi/topoloom` for planar embedding and coordinate drawing

**Storage**: No schema or persisted data changes; relationship positions remain computed per response

**Testing**: `node:test`, Supertest, existing graph-layout tests, and VM-based interaction tests; run targeted suites and `npm test`

**Target Platform**: Server-rendered responsive website with progressive-enhancement SVG diagrams

**Project Type**: Single Node.js web application

**Performance Goals**: Preserve the existing graph-layout test budget of under 150 ms for 100 characters and 300 relationships; avoid additional per-pointer layout work

**Constraints**: Preserve server-side NSFW filtering before nodes, labels, accessible text, or avatar URLs are rendered; preserve gated avatar preview URLs; keep profile diagrams readable without JavaScript; retain normal keyboard focus and link activation; allow diagrams to use additional space without page-level horizontal overflow; ensure non-planar layout fallback is no worse than the input-order baseline

**Scale/Scope**: Existing global SFW/NSFW relationship displays and character profile pages; current graph-layout performance fixture is 100 characters and 300 relationships; profile diagrams include only the profile character and its directly related characters

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Profile relationship rows are already filtered by `showNsfw` in the repository. The profile graph must be built only from those rows, with endpoint avatars resolved through the shared gated preview helper. No client-side hiding or new media route is introduced. |
| II. Data Integrity Through Invariants | PASS | The feature adds no persisted fields or relationship records. It transforms existing rating-filtered rows into request-local graph view models. |
| III. Works Without JavaScript | PASS | Profile SVGs, names, links, labels, and text equivalents are emitted in the response. JavaScript only adds hover/focus emphasis; related-character links remain native links with visible focus. |
| IV. Test-First Where It Counts | PASS | Add HTTP-level tests for profile/global rating filtering and rendered relationships before implementation. Cover crossing behavior and hover/focus state with unit/integration tests. |
| V. Boring By Default | PASS WITH VALIDATION GATE | The current in-house circle-order search cannot meet the zero-crossing requirement for every planar graph. TopoLoom is an ESM-compatible candidate with no runtime dependencies and provides planarity, embedding, and straight-line layout. Its young release and limited adoption require fixture and performance validation before integration; retain the in-house bounded search for non-planar graphs. |

**Pre-research gate**: No constitution MUST principle is relaxed. Preserve Principle I's server-side filtering and Principle III's non-JavaScript baseline. Research confirmed that circular-order optimization cannot guarantee zero crossings for every planar graph. Validate TopoLoom against nontrivial planar, disconnected, and parallel-relationship fixtures and the existing performance budget before integration; if it fails, replace it with a reliable planar embedding/drawing method rather than silently weakening FR-007. The dependency is justified only by the otherwise-unmet zero-crossing requirement.

**Post-design Constitution Check**: Planar placement is computed server-side and remains deterministic. The dependency validation gate is a required implementation task, not permission to ship a heuristic that misses available crossing-free arrangements. The profile and global pages remain complete without JavaScript, and no content excluded by the current rating may enter the view model.

## Design Decisions

1. Reuse the existing `layoutGraph`, SVG map partial, and relationship-map enhancement script for global maps and profile diagrams. Add a root-centered profile layout with the profile character in the center and directly related characters around it.
2. Derive profile diagram nodes exclusively from the profile's already rating-filtered relationship rows. Reuse the avatar enrichment pattern in `listRelationshipsWithAvatars` and the same effective-avatar resolver and crop fields used by existing maps. Related-character faces and names are native links to their profile pages; the center character is identified as the current profile.
3. Keep the existing textual relationship list as a complementary accessible/readable representation. The diagram and any text equivalent contain only visible relationships and do not replace directionality or multi-edge semantics.
4. Treat each relationship display's input-order arrangement as its non-regression baseline. Use a deterministic planar embedding and straight-line layout when the simple graph admits one. For non-planar graphs, use the existing bounded candidate search, explicitly include the input-order baseline, and return the lowest crossing count found.
5. Allow the layout bounds to grow in either dimension to retain node, name, edge, and label geometry. Existing map-frame-local scrolling continues to contain any width growth on narrow screens.
6. On hover or keyboard focus of a character link, emphasize every edge incident to its ID and subdue non-incident edges without removing them. Clear the emphasis on pointer exit or blur unless the same node remains focused. Keep native anchor activation intact.
7. Leave filtering, avatar routing, schemas, relationship direction, and persisted data unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/017-character-relationship-views/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── relationship-views.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/lib/graph-layout.js                       # deterministic crossing-aware and root-centered layout
src/lib/planar-layout.js                       # validated planar embedding and coordinate adapter
src/repositories/characters.js                # rating-filtered profile relationships
src/repositories/relationships.js             # shared effective-avatar resolution
src/routes/public/character.js                # request-local profile diagram model
src/routes/public/relationships.js            # existing global diagrams use improved layout
src/views/partials/relationship-map.njk        # shared server-rendered SVG node/edge contract
src/views/pages/character.njk                  # profile relationship diagram and empty state
src/views/pages/relationships.njk              # global SFW/NSFW diagrams retain shared behavior
src/public/js/relationship-map.js              # shared hover/focus emphasis enhancement
src/public/css/main.css                        # active/related and subdued relationship styles
tests/unit/graph-layout.test.js
tests/unit/relationship-map-script.test.js
tests/integration/character-profile.test.js
tests/integration/nsfw-character-relationships.test.js
tests/integration/relationship-map.test.js
tests/integration/relationship-map-avatar.test.js
tests/integration/relationship-map-text.test.js
```

**Structure Decision**: Extend the existing single-project Express/Nunjucks application. Keep graph computation in pure layout modules, rating and avatar resolution in the repository layer, and render through existing server-side page and SVG patterns. No schema migration or new external API is required.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| A graph-layout dependency is required to meet the zero-crossing guarantee reliably | The spec requires a planar embedding and coordinates, which are outside the current circle-order optimizer. TopoLoom is an ESM package with no runtime dependencies and directly supplies those capabilities; its output must pass application-specific fixtures and performance checks. | Implementing a planarity test, embedding, and coordinate assignment in-house would add more bespoke code and algorithmic risk. Retaining only the current bounded circular heuristic cannot guarantee zero crossings for all planar graphs. |
