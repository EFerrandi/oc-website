# Implementation Plan: Modern Interface & Interactive Relationship Map

**Branch**: `002-modern-ui-relationship-map` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-modern-ui-relationship-map/spec.md`

## Summary

Four changes to the existing OC gallery, all presentation-layer:

1. **Relationship map** — replace the two text lists on `/relationships` with two SVG maps (SFW, NSFW), each drawing every character as a circular avatar, every relationship as a line between two avatars, and every label at the line's midpoint. The layout is computed **on the server** and delivered already drawn; the browser script adds dragging only.
2. **Character detail page** — avatar at top left with the basic-information summary beside it, then the image gallery, then the story gallery, with each story's text collapsed to a native `<details>` that expands in place.
3. **Admin controls** — a delete control in the admin character list and on the character edit page (the route already exists but nothing reaches it), and a return-to-admin control in the site header.
4. **Interface refresh** — a design-token system in `main.css` applied consistently across public and admin pages.

**No new routes, no new tables, no new dependencies.** The layout algorithm is ~150 lines of hand-rolled deterministic JavaScript in a new `src/lib/graph-layout.js`; the drag behaviour is ~120 lines in a new `src/public/js/relationship-map.js`.

The load-bearing consequence of clarification FR-021 is that **crossing minimisation runs server-side**, not in the browser. This is what keeps Constitution Principle III satisfiable without downgrading non-interactive visitors to a list.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node.js >= 22 (developed on v26.10.0)

**Primary Dependencies**: express 5, nunjucks 3, better-sqlite3 (via `src/db`), sharp, multer, zod, express-session, express-rate-limit. **This feature adds none.**

**Storage**: SQLite, single file, forward-only migrations in `src/db/migrations/`. **This feature adds no migration** — map positions are computed for display and never persisted (FR-020).

**Testing**: `node --test` with supertest. Suites in `tests/unit`, `tests/contract`, `tests/integration`. Current baseline 129 passing.

**Target Platform**: Self-hosted Linux/Windows server, server-rendered HTML to any browser.

**Project Type**: Server-rendered web application, single project.

**Performance Goals**: Map readable within 3s of page appearing for 100 characters / 300 relationships (SC-007). Server-side layout for that size must stay within the existing page-render budget — target < 150 ms.

**Constraints**: Every page 320–1920 px without horizontal scrolling (SC-011). Map fully readable with JavaScript unavailable (FR-021). No NSFW data of any kind in a page served to a visitor who has not opted in (FR-009, Constitution I).

**Scale/Scope**: Single admin, tens to low hundreds of characters. 7 public pages, 10 admin pages. This feature touches 2 public page templates, 2 admin templates, 1 partial, the stylesheet, and adds 2 JavaScript modules.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1.*

### Principle I — Content Rating Safety (NON-NEGOTIABLE)

| Check | Assessment |
|-------|------------|
| Enforcement server-side | **PASS.** The map is built from `listRelationshipCards(db, { showNsfw })`, which already filters in SQL. When the visitor has not opted in, the NSFW map's node and edge arrays are *empty before the template runs* — no names, labels, avatars, or coordinates are serialised. |
| No new route serving stored content | **PASS.** Avatars reuse the existing gated `/media/:imageId`. No data endpoint is added, so `tests/integration/route-audit.test.js` continues to pass unchanged. This was a deliberate design constraint, not a coincidence. |
| Uploads not served statically | **PASS.** Unchanged; `<image href="/media/:id">` inside the SVG goes through the same gate as an `<img>`. |
| 404 not 403 | **PASS.** No new refusal paths. |
| Safe state is the default | **PASS.** The map renders from whatever the gated query returned; an absent or malformed opt-in yields the SFW map only. |

**Re-verification required**: Principle I mandates re-verification whenever a route serving stored content is added. None is added. The audit test's derived route list is unchanged — confirmed by inspection of `src/routes/public/`.

**Specific risk recorded**: a character hidden from the map must be hidden *including their avatar URL*. Because a node carries `/media/:id`, emitting a node for a character the visitor cannot see would leak the character's existence even if the image itself 404s. Mitigation: nodes are derived **only** from the already-filtered edge list (FR-004), never from `listCharacters`.

### Principle II — Data Integrity Through Invariants

**PASS, trivially.** This feature adds no entity, no constraint, and no write path. The only new write-adjacent work is surfacing the existing `deleteCharacter` service, whose confirmation and cascade rules are untouched.

### Principle III — Works Without JavaScript

| Check | Assessment |
|-------|------------|
| Usable with JS unavailable | **PASS.** The SVG map, including positions, lines, and labels, is in the HTML the server sends. Dragging — and only dragging — requires script. |
| Enhancement layered on working markup | **PASS.** `relationship-map.js` attaches pointer handlers to elements that already exist and already convey the full meaning. |
| Keyboard-operable, visible focus | **PASS by design.** Avatars are `<a>` elements inside the SVG, focusable natively; arrow-key repositioning is added on top (FR-019). |
| Meaningful alt text | **PASS.** Each node carries an accessible name; each map carries a visually-hidden relationship list (FR-021a) so assistive technology is not asked to interpret geometry. |
| No horizontal scrolling 320–1920 px | **PASS by design.** The SVG uses `viewBox` with `preserveAspectRatio`, scaling to the container rather than forcing a minimum width. |

**This is the principle that drove the architecture.** Computing the layout in the browser would have been easier and is the conventional approach; it was rejected because it makes the server no longer the authority on what was delivered.

### Principle IV — Test-First Where It Counts

Mandatory test-first areas touched by this feature:

- **Rating enforcement** — the map is a new presentation of rated content. Tests asserting the NSFW map is empty before opt-in, and that no NSFW character name or avatar id appears anywhere in the response, **MUST be written and failing before the map renders.**
- **Deletion semantics** — surfacing the delete control. Tests for confirmation-by-name, for the control being absent to non-admins, and for a deleted character vanishing from the map **MUST precede** the template change.
- **Access control** — the return-to-admin control must not appear for anonymous visitors. Test first.

Not test-first (tests may follow): the layout algorithm's crossing counts, the CSS refresh, the `<details>` story presentation. These fail loudly and visibly rather than silently.

**Dedicated suite**: `npm run test:nsfw` must be extended to include the new relationship-map rating test so the central promise stays runnable in isolation.

### Principle V — Boring By Default

| Decision | Justification |
|----------|---------------|
| No graph library (d3, cytoscape, vis) | A library would be a new dependency, most would pull a client-side rendering model that breaks Principle III, and force-directed layouts are **non-deterministic**, directly violating FR-013. The needed algorithm — circular placement with crossing-reduced ordering — is ~150 lines. The dependency would replace less code than it adds friction. |
| No client-side framework | Nothing here needs one. The map is server-rendered SVG. |
| No build step | SVG and vanilla JS are served as-is, matching the existing project. |
| Hand-rolled drag instead of a drag library | Pointer Events are a platform built-in and cover mouse, touch, and pen in one API. |
| `<details>`/`<summary>` for story collapse | Platform built-in; satisfies FR-041b (works without script) with zero code. |
| CSS custom properties for the refresh | Platform built-in; no preprocessor, no tooling. |

**Scope deliberately excluded** (recorded so it is not mistaken for oversight): zooming and panning the map, persisting positions, exporting the map as an image, editing relationships from the map, and animated transitions.

### Gate result

**PASS.** No violations requiring justification. One feasibility tension with a success criterion is recorded in [Complexity Tracking](#complexity-tracking) below — it is a specification wording issue, not a constitutional deviation.

## Project Structure

### Documentation (this feature)

```text
specs/002-modern-ui-relationship-map/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── relationship-map.md   # View-model contract + rating guarantees
│   └── ui-controls.md        # Admin delete + return-to-admin control contract
├── checklists/
│   └── requirements.md  # 18/18 passing
└── tasks.md             # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

Existing single-project layout; this feature adds three files and modifies eight.

```text
src/
├── lib/
│   └── graph-layout.js         # NEW — deterministic, crossing-reduced layout
├── public/
│   ├── css/
│   │   └── main.css            # MODIFIED — design tokens + map + profile layout
│   └── js/
│       └── relationship-map.js # NEW — drag + keyboard reposition, enhancement only
├── routes/
│   └── public/
│       └── relationships.js    # MODIFIED — builds the view model, no new route
└── views/
    ├── layout.njk              # MODIFIED — load the map script
    ├── partials/
    │   ├── header.njk          # MODIFIED — return-to-admin control
    │   └── relationship-map.njk  # NEW — SVG map macro
    ├── pages/
    │   ├── character.njk       # MODIFIED — avatar + summary, galleries, <details> stories
    │   └── relationships.njk   # MODIFIED — renders two maps
    └── admin/
        ├── characters-list.njk # MODIFIED — delete control per row
        └── character-edit.njk  # MODIFIED — delete form with name confirmation

tests/
├── unit/
│   └── graph-layout.test.js    # NEW — determinism, crossing counts, components
├── integration/
│   ├── relationship-map.test.js  # NEW — rating gate, structure, no-JS completeness
│   ├── character-profile.test.js # NEW — layout order, story text present
│   └── admin-controls.test.js    # NEW — delete control, return-to-admin visibility
└── ...                          # existing suites must continue to pass unchanged
```

**Structure Decision**: The existing single-project layout is kept. The layout algorithm goes in `src/lib/` because it is pure and dependency-free — it takes nodes and edges and returns coordinates, with no knowledge of the database, HTTP, or rating. That purity is what makes it unit-testable without a server and is why it does not belong in a repository or service.

The route handler stays thin: it calls the existing gated repository function, hands the result to the pure layout function, and renders. No database access moves out of the repository layer, and no invariant moves into a route handler.

## Phase 0 — Research

See [research.md](./research.md). Decisions reached:

- **R-001** Server-side layout, delivered as SVG — the only approach satisfying FR-021 and Principle III simultaneously.
- **R-002** Circular-per-component layout with crossing-reduced ordering; components packed on a grid (FR-014).
- **R-003** Ordering chosen as the best of several deterministic candidates, with the naive name-order ordering always among them — this makes FR-012 ("no worse than naive") a guarantee rather than a hope.
- **R-004** Exact chord-crossing counting, O(E²); fine at 300 edges.
- **R-005** Parallel edges drawn as offset quadratic arcs, labels at the arc midpoint (FR-006).
- **R-006** Avatars as `<image>` in a circular `clipPath`, sourced from the gated `/media/:id`.
- **R-007** Pointer Events for dragging; arrow keys for keyboard repositioning.
- **R-008** Native `<details>`/`<summary>` for story collapse.
- **R-009** CSS custom properties as design tokens; no preprocessor.
- **R-010** Admin list delete control links to the confirmation form on the edit page rather than embedding a name field in every row.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — no schema change; defines the in-memory `MapNode`, `MapEdge`, `MapLayout` view-model shapes and the invariants binding them to the rating gate.
- [contracts/relationship-map.md](./contracts/relationship-map.md) — the view-model contract, the SVG structure contract the drag script depends on, and the rating guarantees.
- [contracts/ui-controls.md](./contracts/ui-controls.md) — the admin delete and return-to-admin controls, their visibility rules, and status codes.
- [quickstart.md](./quickstart.md) — runnable validation scenarios.

### Post-design Constitution re-check

Re-evaluated after the artifacts above were written.

- **Principle I**: still PASS. The data-model invariant **I-M1** ("every node is derived from an edge endpoint, never from the character table") is the formal statement of the leak risk identified pre-design, and it now has exactly one enforcement point — the view-model builder in `src/routes/public/relationships.js`. The contract additionally forbids emitting a `data-character-id` or avatar URL for any character absent from the filtered edge list.
- **Principle II**: still PASS. No persisted invariant added. The three view-model invariants are documented with their enforcement point.
- **Principle III**: still PASS, and now concretely testable — the contract requires that the full map, including coordinates, exists in the server's response body, which a test can assert directly against the HTML.
- **Principle IV**: unchanged; the test-first obligations are carried into the task list.
- **Principle V**: still PASS. Design added no dependency. One simplification was adopted during design (R-010), removing a per-row name input from the admin list.

**No new violations. No Complexity Tracking entries required for constitutional reasons.**

## Complexity Tracking

No constitutional violations require justification. The crossing objective was clarified on 2026-10-02: select the lowest-crossing arrangement among the deterministic layouts evaluated, preferring zero crossings when found but not requiring it. The name-ordered arrangement remains among the candidates, so the chosen arrangement cannot score worse than that baseline.
