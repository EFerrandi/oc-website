---

description: "Implementation tasks for relationship map focus and sizing"
---

# Tasks: Relationship Map Focus and Sizing

**Input**: Design documents from `specs/019-relationship-map-focus/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/map-view-and-focus.md`, `quickstart.md`

**Tests**: Included, written first, per the plan's test-first decision and constitution principle IV.

**Organization**: Tasks are grouped by user story. All stories edit the shared map module, stylesheet, and partial, so tasks that touch the same file are sequential.

## Phase 1: Setup

**Purpose**: Reuse the existing Node.js app, dependencies, and test harness. No setup or dependency changes are needed.

## Phase 2: Foundational

**Purpose**: Pure, unit-testable view and focus math that every story depends on (plan decision 10).

- [X] T001 Add failing unit tests in `tests/unit/relationship-map-script.test.js` for `fitView` (`fitScale = min(boxW / contentW, boxH / contentH)`, `initialScale = clamp(fitScale, 0.34, 1)`, `minScale = min(fitScale, initialScale)`, centered on the content), `clampView` (center stays inside the content bounds; scale stays within `[minScale, 3]`), `zoomAt` (the point under the pointer stays fixed; the result is always clamped), and `focusSet` (the character, every other endpoint of its edges, all parallel and self-relationship edges; an isolate yields only itself)
- [X] T002 Implement and export `fitView`, `clampView`, `zoomAt`, and `focusSet` as DOM-free helpers in `src/public/js/relationship-map.js`, with constants `MIN_READABLE_SCALE = 0.34` and `MAX_SCALE = 3` (satisfy T001)

**Checkpoint**: The view and focus math is verified in Node with no DOM.

## Phase 3: User Story 1 - See the whole map at a comfortable size (Priority: P1) 🎯 MVP

**Goal**: Both maps open centered at a natural size: fitted to the area, never enlarged beyond natural size, and never shrunk below the readable avatar size.

**Independent Test**: Open the global page and a profile at 320px, 375px, and desktop; the network is fully visible and centered with no horizontal scrolling, and a 100+ character network opens at a readable size centered and pannable.

- [X] T003 [US1] Add failing integration assertions in `tests/integration/relationship-map.test.js` that the SVG carries no fixed pixel `width`/`height` attributes, keeps its `viewBox`, and has an inline `max-width` equal to the layout width and an `aspect-ratio` equal to width / height, on both the global and profile maps
- [X] T004 [US1] Update the SVG element in `src/views/partials/relationship-map.njk`: remove the `width` and `height` attributes and add an inline `style` with `max-width` (layout width in px) and `aspect-ratio` (satisfy T003)
- [X] T005 [US1] Update `.relationship-map-frame`, `.relationship-map-viewport`, and `.relationship-map` in `src/public/css/main.css`: `width: 100%`, `height: auto`, `max-height: 75vh`, drop `min-width: 100%` and horizontal frame scrolling so the no-JavaScript view is fitted; keep the fullscreen frame rules working
- [X] T006 [US1] In `src/public/js/relationship-map.js`, introduce the view state (fixed content bounds separate from `{centerX, centerY, scale}`, with the `viewBox` derived from the rendered box) and apply `fitView` on attach, on a `ResizeObserver` (falling back to `resize` and `fullscreenchange`), re-clamping when the visitor has moved the view; stop overwriting `map.bounds` with the zoomed window so drag clamping and label placement always use the content bounds
- [X] T007 [US1] Add interaction tests in `tests/unit/relationship-map-script.test.js` that a small map opens at scale 1, a large map opens at the minimum readable scale and centered, and a box resize refits an unmoved view

**Checkpoint**: Both maps open fitted and centered; the baseline is fitted without JavaScript.

## Phase 4: User Story 2 - Zoom in and out without losing the map (Priority: P1)

**Goal**: Zoom and pan keep the map visible at every level.

**Independent Test**: Press + and − to both limits, use Ctrl/⌘+wheel and pinch, drag empty space to the edges, reset, and enter and leave fullscreen; part of the map is always visible.

- [X] T008 [US2] Add failing interaction tests in `tests/unit/relationship-map-script.test.js`: repeated zoom in and out stays within `[minScale, 3]` and the viewBox always intersects the content bounds; Reset restores the initial view; panning clamps the center inside the content bounds; a drag that starts on an avatar moves only that avatar
- [X] T009 [US2] Rewrite `updateZoom` in `src/public/js/relationship-map.js` to use the view state and `zoomAt`: the zoom-in and zoom-out buttons step the scale by a fixed factor around the view center, and Ctrl/⌘+wheel and two-finger pinch zoom around the pointer; plain wheel is not intercepted (satisfy T008)
- [X] T010 [US2] Add pointer-drag panning on empty map space in `src/public/js/relationship-map.js`, clamped by `clampView`; avatar-face dragging and the click-suppression rule from the existing drag code stay unchanged
- [X] T011 [US2] Add a Reset control button (`data-map-reset`) to the controls group in `src/views/partials/relationship-map.njk`, wire it to the initial view in `src/public/js/relationship-map.js`, and style it with the other controls in `src/public/css/main.css`; assert the button in `tests/integration/relationship-map.test.js`
- [X] T012 [US2] Set `touch-action` in `src/public/css/main.css` so a one-finger drag on empty space still scrolls the page while pinch zoom is handled by the map, and verify fullscreen enter and exit refits the view

**Checkpoint**: Zoom, pan, reset, and fullscreen never lose the map.

## Phase 5: User Story 3 - Focus on one character's relationships on hover (Priority: P1)

**Goal**: Hovering or keyboard-focusing a character highlights only it, its links, and its direct neighbors; everything else is grayed.

**Independent Test**: In a map with several clusters, hover and Tab to characters; only the focus set stays colored, the rest is gray, names of the focus set show even with Labels off, and a tap opens the profile with no focus state.

- [X] T013 [US3] Add failing interaction tests in `tests/unit/relationship-map-script.test.js`: hover and keyboard focus set `has-focus`, `is-focus`, and `is-dimmed` on exactly the `focusSet` result for nodes and edges; leave and blur clear them; touch pointers set nothing; self-relationships and parallel edges stay in the set; an isolate dims everything else
- [X] T014 [US3] Replace the edge-only emphasis in `src/public/js/relationship-map.js` with `focusSet`-driven class toggles on nodes and edge groups, ignoring `pointerType === 'touch'`, preserving the existing keyboard focus handling (satisfy T013)
- [X] T015 [US3] In `src/public/css/main.css`, style `.has-focus .is-dimmed` (grayscale plus reduced opacity, still visible), `.is-focus` (existing gold emphasis and stronger stroke so the state does not rely on color alone), and the override that shows `.is-focus` node names and edge labels while `.labels-hidden` is set; remove the old `has-emphasis`, `is-emphasized`, and `is-subdued` rules and their JavaScript references
- [X] T016 [US3] Disable the new focus, dimming, and fit transitions under `prefers-reduced-motion` in `src/public/css/main.css`

**Checkpoint**: Focus works for mouse, pen, and keyboard, and touch taps open profiles.

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Update `specs/018-relationship-map-redesign/contracts/relationship-map.md` with a pointer to `specs/019-relationship-map-focus/contracts/map-view-and-focus.md`, and remove the obsolete `has-emphasis` notes from it and from `specs/018-relationship-map-redesign/quickstart.md`
- [X] T018 Run `npm test`, `npm run test:nsfw`, and `git diff --check`
- [X] T019 Run the manual checks in `specs/019-relationship-map-focus/quickstart.md` in Chromium at 320px, 375px, and desktop, including a 100+ character network, fullscreen, touch emulation, no-JavaScript, and reduced motion; confirm focus applies within 100 ms on the 100-character map

---

## Dependencies & Execution Order

- Phase 2 (T001, T002) blocks all stories.
- US1 (T003–T007) establishes the view state in the shared module; US2 (T008–T012) builds on that state; US3 (T013–T016) depends only on `focusSet` from Phase 2 but edits the same files, so run it after US2.
- Polish follows all stories.
- Within each story, the test task precedes its implementation tasks.

## Parallel Opportunities

- Little parallelism: the stories share `relationship-map.js` and `main.css`.
- T017 can run in parallel with T018 and T019.
- T003 (integration test) can be written alongside T001 because they touch different files.

## Implementation Strategy

- **MVP**: Phase 2 plus US1, so maps open at a sensible size.
- **Incremental**: add US2 so zoom is safe, then US3 for focus, then polish and manual verification.
