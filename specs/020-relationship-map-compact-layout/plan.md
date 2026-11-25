# Implementation Plan: Compact, Readable Relationship Map Layout

**Branch**: `020-relationship-map-compact-layout` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/020-relationship-map-compact-layout/spec.md`

## Summary

Replace the starting arrangement of the **global** relationship maps (SFW and NSFW cards) with a compact, structure-reflecting layout. Today the global map either scales a planar drawing until its closest pair satisfies a 240px gap (so the whole drawing is inflated) or, for non-planar graphs, puts every component on a ring. The new layout stays deterministic and server-side: it starts from the existing planar drawing (or the existing ordering ring), relaxes it with stress minimisation toward graph-distance targets, removes overlaps with a small gap, and packs components into a compact area. Crossings never exceed the previous layout. Profile maps, data, routes, rating filtering, and the 019 client behaviour do not change.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, pinned `@khalidsaidi/topoloom` (planarity test and initial planar drawing). No new dependency.

**Storage**: None

**Testing**: `node:test` unit tests for the new module and `layoutGraph`; existing integration, NSFW and accessibility suites; manual Chromium check of a 30-character and a 120-character network

**Target Platform**: Server-rendered SVG with progressive-enhancement browser module (unchanged)

**Project Type**: Single Node.js web application

**Performance Goals**: Layout of 100+ characters / 300 relationships under 1 s server-side (SC-005)

**Constraints**: Deterministic (no random numbers, no clock); layout input is the rating-filtered rows only; SFW and NSFW maps computed independently; profile maps untouched

**Scale/Scope**: Global maps up to about 150 characters and 300 relationships

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | The layout takes only nodes and edges built from already filtered rows; the SFW and NSFW maps stay independently computed, so hidden relationships cannot influence positions (FR-007). |
| II. Data Integrity Through Invariants | PASS | No data or schema change. Layout invariants (finite coordinates, no overlap, crossings not above baseline, everything inside the box) are enforced in one place and checked by `fitToBox` and tests. |
| III. Works Without JavaScript | PASS | Positions are computed on the server and rendered into the SVG; the details list is unchanged. |
| IV. Test-First Where It Counts | PASS | Failing unit tests for compactness, non-ring, crossings, determinism and performance come before the implementation. |
| V. Boring By Default | PASS | Plain stress majorization and shelf packing in a small module; no library. |

Post-design re-check: still PASS.

## Root Causes (from code review)

1. **Over-spaced planar drawings**: `src/lib/planar-layout.js` scales the topoloom drawing by `max(requiredDistance / closestDistance)` with `NODE_GAP = 240` and the largest radius. One tight pair inflates every distance, and the 240px gap is far above the 36px gap used elsewhere.
2. **Ring**: for non-planar graphs `layoutGraph` places each component on a circle (`placeOnRing`) whose radius grows with the member count and label clearance, so every link crosses the interior and big components are huge.
3. **Component packing** uses square cells sized by each ring, wasting space.

## Design

New module `src/lib/compact-layout.js` exporting `compactPositions(nodes, edges, { seed })`, used only by the global route:

1. Group nodes into connected components (existing `buildAdjacency` / `findComponents` logic, exported from `graph-layout.js`).
2. Per component, take starting coordinates: the planar drawing for that component when the whole graph is planar, otherwise the ring from the best ordering. Isolated pairs and singletons are trivial.
3. Relax with stress majorization toward target distance `hops * (avg radius * 2 + labelGap)`, a fixed iteration count, deterministic ordering by node id.
4. Remove overlaps: push apart pairs closer than `r_i + r_j + NODE_GAP_COMPACT` (about 56px) and leave room for names and the longest label on short edges; fixed iteration cap.
5. Accept the relaxed drawing only if its crossing count is not above the baseline (planar: must be 0; non-planar: not above the ring's count) and no link passes over an unrelated avatar when the baseline does not; otherwise keep the scaled baseline with the smaller gap.
6. Pack components with a shelf packer sorted by area, choosing the row width that minimises the packed bounding box area; finish with the existing `fitToBox`.

`layoutGraph` gains a `placed` option (a Map of final positions). When provided it skips the ring and planar branches, keeps curve-offset and label handling, and reports crossings measured from straight segments. The planar crossing-reduction loop stays for the planar case.

`src/routes/public/relationships.js` `buildMap` calls `compactPositions` and passes the result. `src/routes/public/character.js` is unchanged.

Known limit: a graph that is a single pure cycle of 4 or more characters is naturally circular; the "not on one circle" check is verified on networks that contain a hub, chain, or branch, and cycles keep the smallest circle that fits.

## Project Structure

### Documentation (this feature)

```text
specs/020-relationship-map-compact-layout/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/compact-layout.md
└── tasks.md   # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── compact-layout.js        # new: relax, de-overlap, pack
│   ├── graph-layout.js          # `placed` option; export component helpers
│   └── planar-layout.js         # smaller gap, returns baseline for compact-layout
└── routes/public/relationships.js

tests/
├── unit/compact-layout.test.js  # new
├── unit/graph-layout.test.js
├── unit/planar-layout.test.js
└── integration/relationship-map*.test.js
```

**Structure Decision**: Single project; one new pure library module next to the existing layout modules, wired only into the global relationships route.

## Complexity Tracking

No constitution violations.
