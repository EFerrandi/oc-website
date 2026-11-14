# Implementation Plan: Relationship Map Interaction and Layout

**Branch**: `016-relationship-map-layout` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-relationship-map-layout/spec.md`

## Summary

Update the existing server-rendered relationship maps so visitors can move a character only by dragging its avatar, and remove background panning and keyboard-based repositioning. Keep character links focusable and activatable by keyboard. Explicitly stack the SFW and NSFW sections and enlarge the map cards and text; on small screens dense maps may scroll inside their own frames so card details remain legible without making the page itself overflow horizontally.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, `node:sqlite`; no new dependencies

**Storage**: No persistent data or schema changes; positions remain transient in the browser

**Testing**: `node:test`, Supertest and existing VM-based relationship-map script tests; `npm test`

**Target Platform**: Server-rendered, responsive website with a progressive-enhancement SVG relationship map

**Project Type**: Single Node.js web application

**Performance Goals**: Pointer dragging updates only the moved node and its attached edges; no full-page navigation or persistent position writes are introduced

**Constraints**: Preserve SFW/NSFW server filtering, avatar preview routes, complete text, links without JavaScript, and keyboard focus/activation. No background-map pan or keyboard movement. Keep the document within viewport width; horizontal overflow, when needed for a dense diagram, belongs only to its map frame. Size the SVG from its computed layout dimensions to retain readable SVG units.

**Scale/Scope**: Existing two relationship maps and their current relationship data; adapt graph dimensions and responsive presentation without changing relationship records or rating behavior

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No rating, media route, or content-visibility changes. Each map remains built from server-filtered relationship rows; avatar media continues through its existing gated route. |
| II. Data Integrity Through Invariants | PASS | No persisted fields or relationships change. |
| III. Works Without JavaScript | CONDITIONAL — amendment required before implementation | Server-rendered maps, links, focus indication, and text remain available without JavaScript. However, the requested prohibition on keyboard repositioning conflicts with the current MUST that every interactive control be keyboard-operable. Before changing the interaction, amend the constitution with a narrowly scoped exception for relationship-map repositioning. Preserve Tab focus and Enter activation of each character link. |
| IV. Test-First Where It Counts | PASS | Add unit and integration coverage for pointer interaction, keyboard activation, empty-area gestures, section order, and responsive map framing. No safety-critical rating gate is changed. |
| V. Boring By Default | PASS | Reuse the existing SVG, graph layout and script; do not add dependencies, persistence, or a new rendering system. |

**Pre-implementation gate**: The implementation tasks must amend `.specify/memory/constitution.md` first. The user explicitly selected the exception; because it changes a MUST principle, use MAJOR versioning (2.0.0 → 3.0.0) and include a Sync Impact Report. Record that focus and keyboard link activation remain required, and reject the alternative of adding a second keyboard movement mode because the requested interaction is face-drag only.

**Post-design Constitution Check**: Conditional on that amendment being completed before code changes. Afterward, the specified interaction is an explicit exception; all other parts of Principle III continue to apply.

## Design Decisions

1. Reuse the current server-side `layoutGraph` and SVG contract. Keep positions request-local; reload restores the default layout.
2. Limit drag initiation to the avatar face's hit area. A drag on a name or empty canvas does not reposition anything; character names remain normal links.
3. Remove the background pan implementation and arrow-key/Shift+arrow movement handler. Keep pointer/touch face dragging and the existing post-drag click suppression.
4. Make the two map regions an explicit single-column layout. Increase the avatar diameter and name/relationship label typography from their current 68px / 13px baseline to approximately 96px / 16px, then adjust graph spacing, label clearance, and viewBox bounds so the larger cards do not collide.
5. Preserve readable map units on narrow viewports by sizing each SVG to its computed layout width and allowing its frame to scroll horizontally when wider than the viewport. Keep the outer page and its sections within the viewport width.
6. Keep the baseline map and its relationships server-rendered. Without JavaScript, navigation and reading work; only repositioning is unavailable.

## Project Structure

### Documentation (this feature)

```text
specs/016-relationship-map-layout/
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
.specify/memory/constitution.md            # record approved keyboard-movement exception (MAJOR)
src/lib/graph-layout.js                    # larger nodes, text and spacing
src/public/js/relationship-map.js          # face-only drag; remove pan and keyboard movement
src/public/css/main.css                    # stacked sections, larger cards, responsive map frame
src/views/pages/relationships.njk          # help text and explicit SFW/NSFW stacking
src/views/partials/relationship-map.njk    # avatar drag hit area, preserve text and link contract
tests/unit/graph-layout.test.js
tests/unit/relationship-map-script.test.js
tests/integration/relationship-map.test.js
tests/integration/accessibility.test.js
```

**Structure Decision**: Existing single-project layout. No new runtime module or external interface is needed. The public page contract is the server-rendered SVG and its links; client script behavior remains an enhancement.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principle III currently requires keyboard-operable interactive controls | The owner explicitly chose pointer/touch-only repositioning and rejected keyboard movement for this map. The amendment is narrowly scoped to moving map nodes; keyboard focus and link activation remain. | Keeping arrow-key movement would preserve the old alternative interaction mode and contradict the requested face-drag-only behavior. |
