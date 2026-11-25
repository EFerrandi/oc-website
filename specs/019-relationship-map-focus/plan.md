# Implementation Plan: Relationship Map Focus and Sizing

**Branch**: `019-relationship-map-focus` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-relationship-map-focus/spec.md`

## Summary

Fix the relationship maps (global and profile) so they open fitted and centered at a natural size, zoom and pan without ever losing the map, and gray out everything unrelated to the hovered or keyboard-focused character. The work is an enhancement of the existing server-rendered SVG and its browser module; layout, data, routes, and rating filtering do not change.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, pinned `@khalidsaidi/topoloom`; browser-native SVG and DOM APIs. No new dependency.

**Storage**: None; view state (zoom, pan, focus) is transient and never persisted

**Testing**: `node:test`, Supertest, VM-based map interaction tests in `tests/unit/relationship-map-script.test.js`, existing integration and NSFW suites; manual Chromium checks at 320px, 375px, and desktop

**Target Platform**: Responsive server-rendered website with progressive-enhancement SVG maps

**Project Type**: Single Node.js web application

**Performance Goals**: Focus applied and cleared within 100 ms in a 100-character, 300-relationship map; class toggling only, no layout recomputation

**Constraints**: Rating filtering stays server-side before graph construction; the no-JavaScript page stays complete; keyboard access and visible focus stay intact; no persistence of view state

**Scale/Scope**: Global SFW and NSFW maps and profile maps, up to 100 characters and 300 relationships

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No new route, data, or markup content. Focus and fit act only on already rating-filtered nodes and edges, and never read hidden content. |
| II. Data Integrity Through Invariants | PASS | No data or schema change. The view-state limits are stated once in the contract and enforced in a single helper. |
| III. Works Without JavaScript | PASS | The baseline SVG becomes responsive through CSS alone: it scales to the available width at no more than its natural size. Zoom, pan, and focus are enhancements; nothing is reachable only through them. Relationship details stay in the server-rendered list. |
| IV. Test-First Where It Counts | PASS | Add failing unit tests for view-state math and focus classes before the implementation; keep the HTTP-level NSFW tests untouched. |
| V. Boring By Default | PASS | Reuse the existing module, `viewBox` zoom, and CSS classes; no library. |

Post-design re-check: still PASS; the design adds no endpoint, dependency, or persisted state.

## Root Causes (from code review)

1. **Too big**: the partial writes `width`/`height` attributes equal to the full layout size, and the CSS uses `width: auto; min-width: 100%`, so the SVG renders at its intrinsic layout size inside a horizontally scrolling frame instead of fitting.
2. **Disappearing on zoom**: `updateZoom` rewrites the `viewBox` around the current center with no relationship to the rendered box, and also overwrites `map.bounds`, so later clamping and label placement use the zoomed window rather than the content. The scale is relative to the previous box, so the minimum and maximum are not absolute and the content can end up off-screen.
3. **Focus**: current emphasis only restyles edges; nodes and unrelated characters are never dimmed, and names are not revealed during focus.

## Design Decisions

1. **Fitted baseline in CSS**: drop the fixed pixel size from the SVG. Give it `width: 100%`, an inline `max-width` equal to the natural layout width (so small networks are never enlarged), an `aspect-ratio` from the layout, and a `max-height` of roughly 75vh. The frame stops scrolling horizontally. This also makes the no-JavaScript view fitted.
2. **Explicit view model**: keep a fixed `contentBounds` (the server viewBox, never overwritten) separate from the current view `{centerX, centerY, scale}`, where `scale` is rendered pixels per user unit measured against the actual rendered box. The `viewBox` is derived from the view and the box size, so it always matches the box aspect.
3. **Initial view**: `fitScale = min(boxWidth / contentWidth, boxHeight / contentHeight)`. Initial scale is `clamp(fitScale, MIN_READABLE_SCALE, 1)`, centered on the content center. `MIN_READABLE_SCALE` is chosen so the smallest avatar (48 user units radius) is at least about 16 px on screen (about 0.34). Larger networks therefore open at the readable scale, centered, and pan to the rest.
4. **Zoom limits**: minimum scale is `min(fitScale, initial scale)` so the whole network can always be shown; maximum scale is 3. Controls multiply the scale by a fixed step and zoom around the view center; Ctrl/⌘+wheel and two-finger pinch zoom around the pointer. Plain wheel is left alone so the page still scrolls.
5. **Pan**: dragging empty map space pans (avatar-face drags keep moving the avatar). The view center is clamped inside the content bounds, so at least part of the map is always visible.
6. **Reset and refit**: Reset returns to the initial view. A `ResizeObserver` (falling back to `resize` and `fullscreenchange`) recomputes the fit when the box changes; if the visitor has not moved the view, it follows the new fit, otherwise the current scale and center are re-clamped.
7. **Hover focus on the graph**: on pointer hover (mouse and pen only) or keyboard focus of a node, compute the focus set once from the edge list: the character, its neighbors (including through self-relationships), and every edge touching it. Toggle `is-focus` on those and `is-dimmed` on all other nodes and edges. CSS grays dimmed items with grayscale and reduced opacity and keeps them perceivable. Touch pointers do not enter focus, so a tap simply follows the profile link.
8. **Names during focus**: when labels are off, `is-focus` nodes and edges override the `labels-hidden` visibility so only their names and labels show.
9. **Accessibility and motion**: highlight is conveyed through opacity and stroke weight in addition to color; transitions are disabled under `prefers-reduced-motion`.
10. **Pure helpers**: put the math into exported helpers (`fitView`, `clampView`, `zoomAt`, `focusSet`) in the browser module so they are unit-testable in Node without a DOM, following the existing exported `clamp` pattern.

## Project Structure

### Documentation (this feature)

```text
specs/019-relationship-map-focus/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── map-view-and-focus.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
src/public/js/relationship-map.js               # view model, fit, zoom, pan, focus set
src/public/css/main.css                         # fitted baseline, gray and highlight states
src/views/partials/relationship-map.njk         # responsive svg sizing attributes
tests/unit/relationship-map-script.test.js      # view math and focus tests
tests/integration/relationship-map.test.js      # responsive baseline markup
```

**Structure Decision**: Single existing project; changes are confined to the shared map partial, its browser module, and map CSS, so both the global and profile maps are fixed together.

## Complexity Tracking

No constitution violations to justify.
