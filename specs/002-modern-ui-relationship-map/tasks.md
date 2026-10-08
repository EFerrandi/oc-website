# Tasks: Modern Interface & Interactive Relationship Map

**Input**: Design documents from `/specs/002-modern-ui-relationship-map/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests ARE included. Constitution Principle IV makes them mandatory, and makes them **test-first** for rating enforcement, deletion semantics, and access control. Those tasks are marked âš ï¸ TEST-FIRST and must be written and observed failing before the implementation task that follows them.

**Organization**: Grouped by user story so each can be implemented, tested, and demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single project at repository root: `src/`, `tests/`. Paths below are exact.

---

## Phase 1: Setup

**Purpose**: Confirm a clean baseline so any later failure is attributable to this feature.

- [X] T001 Run `npm test` and `npm run test:nsfw` from the repository root and record the baseline counts (expected 129 and 25 passing); do not start any other task until both are green
- [X] T002 Verify `.env` exists with `SESSION_SECRET` and `ADMIN_PASSWORD_HASH`, then run `npm run migrate` and `npm run seed`; write `.env` with Node's `fs.writeFileSync`, never PowerShell `Set-Content`, which splits the 168-character scrypt hash across lines and corrupts it
- [X] T003 Confirm `.gitignore` already covers `node_modules/`, `*.log`, `.env*`, and the upload and preview directories; append only what is missing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure layout function and the view-model builder that every map story depends on.

**âš ï¸ CRITICAL**: No map user story (US1â€“US4) can begin until this phase completes. US5â€“US8 are independent of it and may start immediately.

- [X] T004 [P] Write `tests/unit/graph-layout.test.js` asserting that `layoutGraph(nodes, edges)` is pure and deterministic â€” identical input yields deep-equal output across 10 consecutive calls â€” and that empty input returns `{ nodes: [], edges: [], crossings: 0 }` with a valid non-zero `width`/`height` (invariant I-M3, FR-013, SC-004)
- [X] T005 Create `src/lib/graph-layout.js` exporting `layoutGraph(nodes, edges)` that places all nodes evenly on a single circle in the order given, sizes the radius from node count, computes `width`/`height` to contain every node and label, and returns `crossings: 0` as a placeholder; the module MUST import nothing â€” no clock, randomness, I/O, or environment access (invariant I-M3, research R-002)
- [X] T006 Add exact chord-crossing counting to `src/lib/graph-layout.js`: two chords `(a,b)` and `(c,d)` cross when exactly one of `c`,`d` lies strictly inside the arc from `a` to `b`; sum over all edge pairs, O(EÂ²), and return the real count in `crossings` (research R-004, needed to make FR-012 testable)
- [X] T007 Add edge geometry to `src/lib/graph-layout.js`: group edges by unordered node pair, assign `curveOffset` of `0` to the first and alternating increasing non-zero values to each additional edge of the same pair, and compute `labelX`/`labelY` as the closed-form midpoint of the resulting quadratic BÃ©zier (FR-003, FR-006, research R-005)
- [X] T008 Add `buildMapModel(relationshipRows)` to `src/routes/public/relationships.js` that derives `MapNode`s **only** from the endpoints of the rows it is given and never queries the character table, carrying `id`, `name`, `slug`, `avatarUrl`, `avatarAlt`; set `avatarUrl` to `/media/{imageId}` when an avatar is viewable and `/img/placeholder-avatar.svg` otherwise â€” never `/media/:id/full`, never a static upload path, never a data URI (invariant I-M1, FR-004, FR-010, FR-011, guarantee G-4)
- [X] T009 Extend `listRelationshipCards` in `src/repositories/relationships.js` to include each endpoint's effective avatar image id alongside the existing name and slug, reusing `resolveEffectiveAvatar` from `src/repositories/characters.js` so the avatar is rating-filtered by the same code path the gallery already uses; keep the existing SQL rating filter untouched
- [X] T010 Wire `src/routes/public/relationships.js` to call `buildMapModel` then `layoutGraph` **twice with disjoint inputs** â€” once for `cards.sfw`, once for `cards.nsfw` â€” holding no state between calls, and pass both `MapLayout` objects to the template (invariant I-M2, guarantee G-5)

**Checkpoint**: `layoutGraph` is pure, deterministic, counts crossings exactly, and the route produces two independent view models. No template change yet.

---

## Phase 3: User Story 2 - Keep the SFW and NSFW maps separate (Priority: P1) ðŸŽ¯ MVP SAFETY GATE

**Goal**: Guarantee that changing the relationship page's presentation cannot leak NSFW data.

**Independent Test**: Request `/relationships` without the opt-in cookie and inspect the entire response body; no NSFW character name, slug, avatar URL, image id, label, or coordinate is present anywhere.

> **This story is sequenced before User Story 1 deliberately.** Constitution Principle I is non-negotiable and Principle IV mandates test-first for rating enforcement. The gate must be proven before the thing it gates exists.

### Tests for User Story 2 âš ï¸ TEST-FIRST â€” write these and watch them fail first

- [X] T011 [P] [US2] Write `tests/integration/relationship-map.test.js` asserting that before opt-in the NSFW layout's `nodes` and `edges` are empty **before the template renders**, by checking the response contains no element carrying a `data-node` or `data-edge` attribute inside the NSFW map region (guarantee G-1)
- [X] T012 [P] [US2] In `tests/integration/relationship-map.test.js`, assert that before opt-in none of the `NSFW_MARKERS` from `tests/helpers/fixtures.js` appear anywhere in the `/relationships` response body (guarantee G-2, FR-009)
- [X] T013 [P] [US2] In `tests/integration/relationship-map.test.js`, assert a character appearing **only** in NSFW relationships has neither their name, slug, nor avatar image id anywhere in the response before opt-in, and that they appear after opt-in (invariant I-M1, guarantee G-3, FR-004)
- [X] T014 [P] [US2] In `tests/integration/relationship-map.test.js`, assert the SFW map's node coordinates are byte-identical with and without the opt-in cookie, so the arrangement cannot become a side channel revealing how many NSFW relationships exist (invariant I-M2, guarantee G-5)
- [X] T015 [P] [US2] In `tests/integration/relationship-map.test.js`, assert every avatar URL in the response matches `/media/{id}` or `/img/placeholder-avatar.svg` and that `/media/{id}/full` appears nowhere (guarantee G-4, FR-011)
- [X] T016 [P] [US2] In `tests/integration/relationship-map.test.js`, assert `/relationships` responds `200` with `Vary: Cookie` both with and without the opt-in (guarantee G-6)

### Implementation for User Story 2

- [X] T017 [US2] Add `tests/integration/relationship-map.test.js` to the `test:nsfw` script in `package.json` so the project's central promise stays runnable in isolation (Constitution Principle IV)
- [X] T018 [US2] Run `npm run test:nsfw` and confirm the new rating tests now pass against the Phase 2 view model without any template existing yet; if any pass trivially because the page renders nothing, strengthen the assertion rather than accepting it

**Checkpoint**: The rating gate is proven at the view-model level before any map markup exists.

---

## Phase 4: User Story 1 - Read relationships as a visual map (Priority: P1) ðŸŽ¯ MVP

**Goal**: Replace the two text lists with two drawn SVG maps â€” avatars, connecting lines, labels at midpoints.

**Independent Test**: Load `/relationships` with the seeded cast; every character involved in a visible relationship appears once as an avatar, every relationship is a line between the correct two avatars, and every label sits at its line's midpoint.

### Tests for User Story 1

- [X] T019 [P] [US1] In `tests/integration/relationship-map.test.js`, assert the response contains literal numeric coordinates â€” `transform="translate(` with numbers, and `map-edge-label` elements with numeric `x`/`y` â€” proving the map arrives already drawn rather than being computed in the browser (FR-021, SC-006, research R-001)
- [X] T020 [P] [US1] In `tests/integration/relationship-map.test.js`, assert each `.map-edge` group carries `data-from` and `data-to` matching real `data-node` values, and that edges are emitted before nodes in document order so avatars paint above lines (contract: rendered SVG)
- [X] T021 [P] [US1] In `tests/integration/relationship-map.test.js`, assert every node is an `<a>` with `href="/characters/{slug}"` and an `aria-label` carrying the character name (FR-005, Constitution III)
- [X] T022 [P] [US1] In `tests/integration/relationship-map.test.js`, assert the visually-hidden `.map-text-equivalent` list is present after each `<svg>` and contains one entry per visible relationship naming both characters and the label (FR-021a)
- [X] T023 [P] [US1] In `tests/integration/relationship-map.test.js`, assert a map with no visible relationships renders the existing empty-state message rather than an empty frame (FR-007, edge case)

### Implementation for User Story 1

- [X] T024 [US1] Create `src/views/partials/relationship-map.njk` exporting a macro that renders one `MapLayout` as the SVG structure defined in `contracts/relationship-map.md`: `<svg class="relationship-map" viewBox="0 0 {width} {height}" role="group" aria-labelledby>` containing `<title>`, a `.map-edges` group emitted first, then a `.map-nodes` group; edges carry `data-edge`/`data-from`/`data-to`, nodes carry `data-node` and `transform="translate(x,y)"`
- [X] T025 [US1] In `src/views/partials/relationship-map.njk`, render each node as `<a class="map-node" href="/characters/{slug}" aria-label="{name}">` containing a `<circle class="map-node-ring">`, an `<image class="map-node-avatar" href="{avatarUrl}">` clipped by a `<clipPath>`, and a `<text class="map-node-name">` (FR-001, FR-005, research R-006)
- [X] T026 [US1] In `src/views/partials/relationship-map.njk`, render each edge as a `<path class="map-edge-line">` using `curveOffset` to pick a straight line or a quadratic arc, with a `<text class="map-edge-label">` anchored at `labelX`/`labelY` (FR-002, FR-003, FR-006)
- [X] T027 [US1] In `src/views/partials/relationship-map.njk`, emit the visually-hidden `<ul class="visually-hidden map-text-equivalent">` after each `<svg>`, one `<li>` per edge reading "{fromName} â€” {label} â€” {toName}" (FR-021a)
- [X] T028 [US1] Rewrite `src/views/pages/relationships.njk` to render two maps via the macro, keeping the existing section headings and the existing empty-state messages â€” including the unchanged invitation to tick "Show NSFW content" when the visitor has not opted in (FR-007, FR-008)
- [X] T029 [US1] Add map styling to `src/public/css/main.css`: `.relationship-map` scaling to its container via the `viewBox` with no minimum width, readable label text with a contrast-providing backdrop, and a `.visually-hidden` utility that **clips rather than using `display:none`**, or screen readers will skip the text equivalent (FR-021a, SC-011)
- [X] T030 [US1] Add long-label handling to `src/public/css/main.css` and `src/views/partials/relationship-map.njk` so a very long relationship label is shortened or wrapped without covering neighbouring avatars, with the full text available via the node's accessible text (edge case: long labels)
- [X] T031 [US1] Run `npm test` and `npm run test:nsfw`; all US1 and US2 tests pass and every pre-existing test still passes **unchanged**

**Checkpoint**: The map is readable, correct, rating-safe, and fully functional with JavaScript unavailable. This is the MVP.

---

## Phase 5: User Story 4 - Get a readable arrangement by default (Priority: P2)

**Goal**: Replace the placeholder single-circle ordering with a crossing-reduced, component-aware arrangement.

**Independent Test**: Load `/relationships` for a seeded cast and count line crossings; the selected arrangement has the lowest count among deterministic layouts evaluated, is no worse than the naive name-ordered arrangement, and is identical on every load.

> Sequenced after US1 because US1 delivers a working map with a simple arrangement. This story improves readability without changing the contract.

### Tests for User Story 4

- [X] T032 [P] [US4] In `tests/unit/graph-layout.test.js`, assert the chosen arrangement's `crossings` is less than or equal to the crossings of the name-ordered arrangement of the same input, across several hand-built graphs including a dense one (FR-012, invariant I-M4)
- [X] T033 [P] [US4] In `tests/unit/graph-layout.test.js`, retain a crossing-free forest case as evidence that zero crossings are achieved when the layout search finds one; this is a preferred outcome, not a universal requirement (SC-003, research R-011)
- [X] T034 [P] [US4] In `tests/unit/graph-layout.test.js`, assert that two groups of characters with no relationships between them occupy disjoint bounding regions (FR-014)
- [X] T035 [P] [US4] In `tests/unit/graph-layout.test.js`, assert every node centre plus its radius and every label anchor lies within `[0,width] Ã— [0,height]` (FR-015, invariant I-M5)
- [X] T036 [P] [US4] In `tests/unit/graph-layout.test.js`, assert a 100-node / 300-edge input completes in under 150 ms (SC-007)

### Implementation for User Story 4

- [X] T037 [US4] Add connected-component detection to `src/lib/graph-layout.js`, grouping node ids reachable through edges (FR-014, data-model `Component`)
- [X] T038 [US4] Add candidate ordering generation to `src/lib/graph-layout.js`: naive name order, depth-first pre-order seeded from the lowest-named node, and breadth-first order from the same seed â€” all deterministic, no randomness (research R-003, FR-013)
- [X] T039 [US4] Add bounded barycentre refinement to `src/lib/graph-layout.js`, repositioning each node to the circular median of its neighbours for a fixed iteration count, keeping the result only when it scores strictly better (research R-003)
- [X] T040 [US4] Select the candidate with the lowest exact crossing count in `src/lib/graph-layout.js`, breaking ties on candidate index; the naive ordering MUST always be in the candidate set so "no worse than naive" holds by construction rather than by tuning (invariant I-M4, FR-012)
- [X] T041 [US4] Pack components onto a grid in `src/lib/graph-layout.js`, ordered by descending node count, sizing each circle from its component's size and recomputing `width`/`height` to contain every component (FR-014, FR-015)
- [X] T042 [US4] Run `npm test`; confirm the map at `/relationships` is visibly more readable and that `tests/integration/relationship-map.test.js` still passes without modification â€” the SVG contract is unchanged by this story

**Checkpoint**: The default arrangement is readable, deterministic, and provably no worse than naive.

---

## Phase 6: User Story 3 - Rearrange the map (Priority: P2)

**Goal**: Let the visitor drag avatars, with lines and labels following.

**Independent Test**: Drag an avatar; it settles where released and every attached line is redrawn to the new position with its label re-centred.

### Tests for User Story 3

- [X] T043 [P] [US3] In `tests/integration/relationship-map.test.js`, assert `/js/relationship-map.js` is referenced with `defer` in the rendered layout and that removing it leaves the map markup complete â€” the enhancement is additive only (Constitution III, FR-021)
- [X] T044 [P] [US3] In `tests/integration/relationship-map.test.js`, assert the visible keyboard-help text naming the repositioning keys is present in the page, not hidden in a tooltip or `title` attribute (FR-019)
- [X] T045 [P] [US3] Add a unit test in `tests/unit/graph-layout.test.js` or a new `tests/unit/clamp.test.js` for the shared clamp helper, asserting a position beyond any boundary is brought back inside the box (FR-018, invariant I-M5)

### Implementation for User Story 3

- [X] T046 [US3] Create `src/public/js/relationship-map.js` that exits immediately when no `.relationship-map` element is present, and attaches handlers only to markup that already conveys the full meaning (Constitution III)
- [X] T047 [US3] Implement pointer dragging in `src/public/js/relationship-map.js` using `pointerdown`/`pointermove`/`pointerup` with `setPointerCapture`, converting client coordinates through the SVG's own `viewBox` transform so dragging stays correct at every screen width and zoom level (FR-016, research R-007)
- [X] T048 [US3] On each pointer move in `src/public/js/relationship-map.js`, update the dragged node's `transform` and redraw every edge whose `data-from` or `data-to` matches the node id, recomputing the path and repositioning the label to the new midpoint (FR-017)
- [X] T049 [US3] Clamp the dragged position to the `viewBox` bounds on every move and on release in `src/public/js/relationship-map.js`; this duplicates the server-side bound from T041 deliberately â€” document at the clamp that the two enforcement points are intentional and neither covers the other (FR-018, invariant I-M5)
- [X] T050 [US3] Add keyboard repositioning in `src/public/js/relationship-map.js`: arrow keys move a focused node by a fixed step, Shift+Arrow by a larger step, with the same clamping (FR-019)
- [X] T051 [US3] Add visible keyboard-help text near each map in `src/views/pages/relationships.njk` naming the repositioning keys (FR-019)
- [X] T052 [US3] Implement click-versus-drag discrimination in `src/public/js/relationship-map.js`: suppress navigation on `pointerup` **only** when the pointer moved beyond a small threshold; suppressing unconditionally breaks FR-005 for everyone, never suppressing navigates away at the end of every drag
- [X] T053 [US3] Verify `src/public/js/relationship-map.js` writes to no persistent store â€” no `localStorage`, `sessionStorage`, cookie, URL mutation, or server request â€” so the map resets to the default arrangement on reload (FR-020, a prohibition stated in the contract)
- [X] T054 [US3] Reference `/js/relationship-map.js` with `defer` from `src/views/layout.njk`, alongside the existing enhancement scripts
- [X] T055 [US3] Add drag-affordance styling to `src/public/css/main.css` â€” grab cursor, a dragging state, and a visible `:focus-visible` ring on `.map-node` (FR-019, FR-034)
- [X] T056 [US3] Manually validate quickstart Scenario 5 in a browser, including touch at phone width and the drag-past-the-edge and drag-then-release-without-navigating cases

**Checkpoint**: The map is draggable and keyboard-repositionable, and still complete without script.

---

## Phase 7: User Story 8 - Read a character's page as a single profile (Priority: P2)

**Goal**: Avatar top-left with the summary beside it, then images, then stories with their text on the page.

**Independent Test**: Open a character with an avatar, images, and a story; the layout order is correct and each story's full text is readable without leaving the page.

> Independent of every map story. **No repository, service, or route change** â€” `findCharacterBySlug` already returns `character.avatar`, and `listStoriesForCharacter` already selects `s.body`; both are currently fetched and discarded by the template (research R-008).

### Tests for User Story 8

- [X] T057 [P] [US8] âš ï¸ TEST-FIRST â€” Write `tests/integration/character-profile.test.js` asserting that without the opt-in, neither the title nor any fragment of a non-viewable story's body appears in the character page response, using the seeded NSFW story (FR-042, SC-015, Constitution I and IV)
- [X] T058 [P] [US8] In `tests/integration/character-profile.test.js`, assert the avatar is rendered from `/media/{id}` or the placeholder, and that `/media/{id}/full` never appears on the page (FR-039, FR-011)
- [X] T059 [P] [US8] In `tests/integration/character-profile.test.js`, assert document order: the `.profile-header` block precedes `.profile-images`, which precedes `.profile-stories` (FR-040)
- [X] T060 [P] [US8] In `tests/integration/character-profile.test.js`, assert each visible story renders as a `<details>` containing its full body text, and that no `href="/stories/` link is required to read it (FR-041, FR-041a, SC-014)
- [X] T061 [P] [US8] In `tests/integration/character-profile.test.js`, assert the summary contains name, gender, job titles, short description, tags, sins and virtues, designer, terms of use, and all three permissions (FR-038)

### Implementation for User Story 8

- [X] T062 [US8] Restructure `src/views/pages/character.njk` into `<article class="character-profile">` containing a `.profile-header` with `.profile-avatar` and `.profile-summary`, then `.profile-images`, then `.profile-stories`, then the existing relationships section (FR-037, FR-040)
- [X] T063 [US8] Render the avatar in `src/views/pages/character.njk` from `character.avatar`, falling back to `/img/placeholder-avatar.svg` when it is absent or not viewable, with meaningful alternative text (FR-039, Constitution III)
- [X] T064 [US8] Move the existing name, gender, job titles, description, tags, sins and virtues, designer, terms, and permissions markup into `.profile-summary`, preserving every existing link and chip so no content is lost (FR-038, SC-013)
- [X] T065 [US8] Replace the story link list in `src/views/pages/character.njk` with `<details class="story">` per story: `<summary>` carrying the title and NSFW badge, the opening lines always visible, and the full `s.body` inside â€” native `<details>` satisfies FR-041b with no script (FR-041, FR-041a, FR-041b, research R-008)
- [X] T066 [US8] Add profile styling to `src/public/css/main.css`: a two-column grid placing the avatar top-left with the summary beside it at wide widths, collapsing to a single stacked column at narrow widths (FR-037, FR-043)
- [X] T067 [US8] Verify `/stories/:slug` remains a working route and remains linked from the story, since removing it would change navigation structure, which clarification FR-032 forbids
- [X] T068 [US8] Run `npm test`; confirm the existing character-page tests still pass unchanged

**Checkpoint**: The character page is a real profile and stories read in place.

---

## Phase 8: User Story 5 - Admin deletes a character (Priority: P2)

**Goal**: Surface the already-implemented delete route, which no template currently reaches.

**Independent Test**: Sign in, delete a character from the admin area with name confirmation, and verify it is gone from every public page including both maps.

> `POST /admin/characters/:id/delete` is fully implemented and tested. **This story is presentation only** â€” no route, service, or repository change unless T074 proves one is needed.

### Tests for User Story 5 âš ï¸ TEST-FIRST â€” deletion semantics and access control are mandatory test-first

- [X] T069 [P] [US5] Write `tests/integration/admin-controls.test.js` asserting the admin character list page contains a delete control for each character pointing at that character's edit page delete section (FR-022)
- [X] T070 [P] [US5] In `tests/integration/admin-controls.test.js`, assert the character edit page contains a delete form posting to `/admin/characters/{id}/delete` with a `confirm_name` input and the CSRF field, and that it is **not nested inside the edit form** â€” nested forms are invalid HTML and the inner one is dropped by the parser, silently turning the delete button into a save (FR-023)
- [X] T071 [P] [US5] In `tests/integration/admin-controls.test.js`, assert a wrong `confirm_name` returns `422`, names the field in the message, and leaves the character present (FR-024)
- [X] T072 [P] [US5] In `tests/integration/admin-controls.test.js`, assert a correct `confirm_name` returns `303` to `/admin/characters` and that the character then appears on no public page â€” gallery, artists, character page, and **both relationship maps** (FR-025); hoist each `await tokenFrom(...)` into its own `const` before `.send({})`, never inline it in the object literal, which causes `ECONNREFUSED` under supertest
- [X] T073 [P] [US5] In `tests/integration/admin-controls.test.js`, assert no delete control appears on any public page and that the delete route is unreachable without an admin session (FR-026, SC-009)
- [X] T074 [P] [US5] In `tests/integration/admin-controls.test.js`, assert deleting a character id that no longer exists reports clearly rather than failing opaquely; document the current behaviour first, and only change `src/routes/admin/characters.js` if the observed result is genuinely unhelpful to an admin (FR-027)

### Implementation for User Story 5

- [X] T075 [US5] Add a clearly marked delete control to each row of `src/views/admin/characters-list.njk` linking to `/admin/characters/{id}/edit#delete` rather than embedding a name field per row, keeping confirmation and its error rendering in exactly one place (FR-022, research R-010)
- [X] T076 [US5] Add a delete section with `id="delete"` at the end of `src/views/admin/character-edit.njk`: its own heading, a `confirm_name` text input, the CSRF hidden field, and a destructive-styled submit â€” as a sibling of the edit form, never nested inside it (FR-023, FR-024)
- [X] T077 [US5] Confirm `src/routes/admin/characters.js` re-renders `admin/character-edit.njk` with `fieldErrors.confirm_name` on mismatch and that the new delete section displays that error next to its input (FR-024)
- [X] T078 [US5] Add destructive-action styling to `src/public/css/main.css`, visually distinguishing the delete control from the save action while meeting AA contrast (FR-023, FR-035)

**Checkpoint**: Character deletion is reachable, confirmed by name, and admin-only.

---

## Phase 9: User Story 6 - Return to the admin area (Priority: P3)

**Goal**: A header control taking a signed-in admin back to `/admin`.

**Independent Test**: Signed in, the control is visible on any public page and works in one action; signed out, it is absent.

### Tests for User Story 6 âš ï¸ TEST-FIRST â€” access control is mandatory test-first

- [X] T079 [P] [US6] In `tests/integration/admin-controls.test.js`, assert an anonymous visitor sees no return-to-admin control on any public page and that nothing beyond the existing "Admin sign in" link reveals the admin area (FR-029, SC-010)
- [X] T080 [P] [US6] In `tests/integration/admin-controls.test.js`, assert a signed-in admin sees the control in the header on the gallery, a character page, `/relationships`, and `/artists`, and that it targets `/admin` (FR-028)
- [X] T081 [P] [US6] In `tests/integration/admin-controls.test.js`, assert the NSFW checkbox remains the first control in `.site-controls` and the sign-out control is still present, so the new control displaces neither (FR-030)

### Implementation for User Story 6

- [X] T082 [US6] Add `<a class="admin-entry" href="/admin">Admin</a>` to the `isAdmin` branch of `src/views/partials/header.njk`, beside the existing sign-out form and after the NSFW checkbox (FR-028, FR-029, FR-030)
- [X] T083 [US6] Verify that when an admin session expires the control stops being shown and following a stale one leads to the sign-in page (edge case: expired session)

**Checkpoint**: The admin can return to the admin area in one action from anywhere.

---

## Phase 10: User Story 7 - A more modern interface (Priority: P2)

**Goal**: One consistent visual system across every public and admin page.

**Independent Test**: Load every page type at 320, 768, 1024, and 1920 px; presentation is consistent, nothing overflows or overlaps, and every existing control is still present and operable.

> Clarification FR-032 permits reorganising layout within a page; routes and navigation structure must not change.

### Tests for User Story 7

- [X] T084 [P] [US7] Extend `tests/integration/accessibility.test.js` to assert every page still exposes its existing landmarks, headings, labelled controls, and image alternative text after the refresh (FR-036, SC-013)
- [X] T085 [P] [US7] Add an assertion to `tests/integration/accessibility.test.js` that the `.visually-hidden` utility clips rather than using `display:none`, so text equivalents remain available to screen readers (FR-021a)

### Implementation for User Story 7

- [X] T086 [US7] Define design tokens as CSS custom properties on `:root` in `src/public/css/main.css` â€” colour ramp, spacing scale, radii, shadows, and a `clamp()`-based type scale â€” chosen to meet WCAG 2.1 AA contrast: 4.5:1 for body text, 3:1 for large text and interactive boundaries (FR-031, FR-035, research R-009)
- [X] T087 [US7] Restyle the shared chrome in `src/public/css/main.css` â€” `.site-header`, `.site-nav`, `.site-main`, `.site-footer`, `.site-controls` â€” to consume the tokens, keeping the NSFW checkbox's position (FR-031, FR-030)
- [X] T088 [US7] Restyle the gallery and cards in `src/public/css/main.css` using CSS Grid with fluid columns so the layout adapts from 320 px to 1920 px with no horizontal scrolling (FR-033, SC-011)
- [X] T089 [US7] Restyle forms, chips, filters, badges, and empty states in `src/public/css/main.css` to the token system, covering both public and admin pages (FR-031)
- [X] T090 [US7] Restyle the admin layout in `src/public/css/main.css` and `src/views/admin/layout.njk` to the same token system, so admin pages are not visually orphaned (FR-031)
- [X] T091 [US7] Extend â€” do not replace â€” the existing `:focus-visible` and `overflow-wrap` rules in `src/public/css/main.css`; they close a real accessibility gap and removing them regresses FR-034 (FR-034, SC-012)
- [X] T092 [US7] Verify every page remains readable and operable in document order with styling disabled (FR-036)
- [X] T093 [US7] Run `npm test` and confirm all 129 pre-existing tests pass **without editing any existing assertion**; needing to edit them means the refresh exceeded what FR-032 permits â€” this is the practical enforcement of SC-013

**Checkpoint**: The interface is consistent and modern, with no page, control, or link lost.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T094 [P] Update `README.md` to describe the relationship map, its keyboard controls, and the fact that it works without JavaScript
- [X] T095 [P] Run `node --test tests/integration/route-audit.test.js` and confirm the derived public route list is **unchanged** â€” no new route was added; if this fails, the design drifted from research R-001 and the map data belongs in the HTML, not a second request (Constitution I re-verification)
- [X] T096 [P] Extend `tests/integration/scale.test.js` with a 100-character / 300-relationship relationship-page render, asserting it completes within the page-render budget (SC-007)
- [X] T097 Walk every scenario in `specs/002-modern-ui-relationship-map/quickstart.md`, including the PC-browser-only checks for mouse/pointer dragging, keyboard movement, and responsive layout; touch-specific manual checks are not required
- [X] T098 Verify the determinism check from quickstart Scenario 3 â€” 10 consecutive requests yield exactly one distinct set of coordinates (FR-013, SC-004)
- [X] T099 Run `npm test` and `npm run test:nsfw` a final time; both green, with the pre-existing 129 and 25 still passing plus every new test
- [X] T100 Remove any temporary files, scratch scripts, or seeded large-scale data created during validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup â€” **blocks US1, US2, US3, US4 only**
- **US2 (Phase 3)**: depends on Foundational. Deliberately before US1 â€” the rating gate is proven before the markup it gates exists
- **US1 (Phase 4)**: depends on Foundational and US2
- **US4 (Phase 5)**: depends on US1 (improves the arrangement without changing the SVG contract)
- **US3 (Phase 6)**: depends on US1 (drags markup that must already exist)
- **US8, US5, US6, US7 (Phases 7â€“10)**: depend on **Setup only**. They touch different files from the map stories and may start immediately and run in parallel with Phase 2 onward
- **Polish (Phase 11)**: depends on all desired stories

### Critical path

`T001 â†’ T004â€“T010 â†’ T011â€“T018 (US2) â†’ T019â€“T031 (US1) â†’ T032â€“T042 (US4) â†’ T043â€“T056 (US3)`

### Within each user story

- Tasks marked âš ï¸ TEST-FIRST must be written and observed **failing** before the implementation tasks beneath them
- The layout function before the template that consumes it
- The template before the script that enhances it

### Parallel opportunities

- T004 is parallel with nothing in Phase 2 after it â€” T005 through T010 form a chain on two files
- All of T011â€“T016 are parallel (same new file, independent cases â€” write together, run together)
- All of T019â€“T023, T032â€“T036, T057â€“T061, T069â€“T074, T079â€“T081 are parallel within their groups
- **Phases 7, 8, 9, and 10 are independent of the entire map track** and of each other except that T090 and T078 both edit `main.css`, so run them sequentially

---

## Parallel Example: User Story 2 (the rating gate)

```bash
# All six rating assertions target one new file and are independent:
Task: "T011 NSFW layout empty before template renders"
Task: "T012 no NSFW_MARKERS anywhere in the response"
Task: "T013 NSFW-only character fully absent before opt-in"
Task: "T014 SFW coordinates identical with and without the cookie"
Task: "T015 avatar URLs never /media/:id/full"
Task: "T016 Vary: Cookie present"
```

---

## Implementation Strategy

### MVP (User Story 2 + User Story 1)

1. Phase 1 Setup, Phase 2 Foundational
2. Phase 3 â€” prove the rating gate first
3. Phase 4 â€” the drawn map
4. **STOP and VALIDATE**: `/relationships` shows avatars joined by labelled lines, works with JavaScript disabled, and leaks nothing before opt-in

That is the feature's core. Everything after it is improvement.

### Incremental delivery

1. MVP above â†’ the map exists and is safe
2. US4 â†’ the arrangement becomes readable
3. US3 â†’ the map becomes draggable
4. US8 â†’ the character page becomes a profile
5. US5, US6 â†’ the admin gaps close
6. US7 â†’ the whole site is refreshed

### Independent track

US5, US6, and US8 touch no map file and need no part of Phase 2. If map work stalls on the layout algorithm, those three still ship.

---

## Notes

- `[P]` means different files and no dependency on an unfinished task
- **Supertest cannot interleave requests**: always hoist `await tokenFrom(...)` into its own `const` before building a `.send({})` object; inlining it causes `ECONNREFUSED`
- Fixture id keys are flat â€” `ids.aria`, `ids.imageNsfwA`, `ids.storySfw`; there is no nested `ids.characters.*`
- Route params are `:imageId`, not `:id`
- Status conventions: `303` success, `422` validation, `409` dependency conflict, `403` CSRF, `401` credentials, `429` throttled, `404` unknown
- **No new dependency may be added by any task in this list.** If one seems necessary, the design drifted from Constitution Principle V â€” stop and re-plan
- **No new route may be added.** T095 enforces this
- Commit after each task or coherent group
