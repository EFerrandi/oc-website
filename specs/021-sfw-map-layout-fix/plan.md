# Implementation Plan: Readable SFW Relationship Map

**Branch**: `021-sfw-map-layout-fix` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/021-sfw-map-layout-fix/spec.md`

## Summary

The SFW global map in the real database (35 characters, 68 relationships, 57 unique pairs, not planar) is drawn at about 8600 x 8900 px, so avatars vanish once the view is fitted. The compact layout from feature 020 produces good drawings for this network (about 2000 x 2000 px, 17 crossings), but its acceptance guard rejects every one of them and falls back to a rescaled copy of the old ring. The fix replaces that guard with a repair step plus a best-candidate choice, so a dense network always ends with the most compact drawing that has no link over an unrelated avatar. Crossings are allowed for such networks (FR-009).

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing only (Express 5, Nunjucks, pinned `@khalidsaidi/topoloom`). No new dependency.

**Storage**: None (the reproduction reads `data/oc.db` read-only)

**Testing**: `node:test` unit tests (`tests/unit/compact-layout.test.js`), integration test (`tests/integration/relationship-map.test.js`), existing NSFW suite; manual Chromium check

**Target Platform**: Server-rendered SVG with the unchanged 019 browser module

**Project Type**: Single Node.js web application

**Performance Goals**: 100+ characters under 1 s (FR-008)

**Constraints**: Deterministic; SFW and NSFW computed independently; planar networks keep zero crossings unless too large (FR-009); profile maps untouched

**Scale/Scope**: Up to about 150 characters / 300 relationships per map

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Layout input stays the rating-filtered rows; no cross-rating state. |
| II. Data Integrity Through Invariants | PASS | No data change; clearance invariants (no overlap, no link over an unrelated avatar) stay enforced in one module and tested. |
| III. Works Without JavaScript | PASS | Positions remain server-computed. |
| IV. Test-First Where It Counts | PASS | A failing regression test built on the real network's shape comes first. |
| V. Boring By Default | PASS | One guard changes inside `compact-layout.js`; no library. |

Post-design re-check: still PASS.

## Root Cause (reproduced with the real data)

For the SFW map `findPlanarPositions` returns nothing (not planar), so the baseline is the ring: 20700 x 16700 px, 121 crossings (98 as straight lines), and 0 links over avatars because the ring is huge. In `arrangeComponent` every compact candidate is rejected by `linksOverAvatars(candidate) <= startOver` (0): the candidates have 4 to 64 such links, while their crossings (17 to 364) are only partly above the 98 allowed. With no candidate left, `rescaled()` returns the baseline scaled down (about 8600 px). The NSFW map (16 characters, 22 relationships) passes because its baseline already has few links over avatars.

The guard is wrong in kind: it compares a candidate with an artificially sparse baseline instead of asking whether the drawing is clean. See [research.md](research.md).

## Design

All changes are in `src/lib/compact-layout.js`.

1. **Repair step** `clearLinks(members, x, y, pairs, nameLines)`: for each link that passes over an unrelated avatar (distance to the segment below `radius + MIN_CLEARANCE`), move that avatar perpendicular to the link until clear, then run `separate`. Bounded iterations, deterministic order by node id. Applied inside `relax` before the guard.
2. **Guard**: accept a candidate when clearance is ok and links over avatars are 0 (or not above the baseline). Crossings are no longer capped by the baseline for non-planar components; a dense network keeps crossings (FR-009).
3. **Best candidate instead of first**: for non-planar components, relax all seeds (baseline-stressed, radial-stressed, tightened radial scales) and pick the accepted one with the fewest links over avatars, then fewest crossings, then smallest area.
4. **Last resort**: if nothing is accepted, take the candidate with the fewest links over avatars (smallest area on ties) rather than the rescaled baseline. `rescaled()` stays only for the planar case, where the zero-crossing rule applies.
5. **2x rule (FR-009)**: a planar component keeps its crossing-free drawing when its area is at most about 2x the best compact candidate's; otherwise the compact candidate is used and crossings are accepted.

`graph-layout.js`, the route, the model and the client do not change. Contract: [contracts/compact-layout.md](contracts/compact-layout.md).

## Project Structure

```text
specs/021-sfw-map-layout-fix/
  plan.md  research.md  data-model.md  quickstart.md
  contracts/compact-layout.md
src/lib/compact-layout.js                   # repair step, guard, candidate choice
tests/helpers/layout-metrics.js             # add denseNetwork fixture (35 nodes / 57 pairs)
tests/unit/compact-layout.test.js           # regression and area tests
tests/integration/relationship-map.test.js  # SFW readable, independent of NSFW toggle
```

**Structure Decision**: Keep the single-module layout from feature 020; extend it in place.
