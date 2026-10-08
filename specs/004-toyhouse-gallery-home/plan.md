# Implementation Plan: ToyHouse-Inspired Home Gallery

**Branch**: `004-toyhouse-gallery-home` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-toyhouse-gallery-home/spec.md`

## Summary

Redesign only the public home gallery at `/` as a modern, ToyHouse-inspired character listing: a fixed collection header with the visible-character count, a compact horizontal filter bar above the grid, removable active-filter chips, and a dense grid of uniform square tiles showing only the avatar, name, and job titles. The page remains server-rendered with ordinary links and GET forms. Native `<details>` elements provide tag and sin/virtue sections without JavaScript. The route adds only presentation data (active-filter chips with removal URLs); character queries, facets, filter semantics, and NSFW gating stay unchanged.

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+; Nunjucks templates; CSS3

**Primary Dependencies**: Existing Express, Nunjucks, and plain CSS; no new dependencies

**Storage**: N/A — no schema or stored-data changes

**Testing**: Existing `node:test` + Supertest suites (`npm test`, `npm run test:nsfw`); targeted gallery, accessibility, and route-audit tests

**Target Platform**: Server-rendered website in modern desktop browsers; responsive from 320px to 1920px

**Project Type**: Single Node.js web application

**Performance Goals**: No additional queries per character, no client-side runtime, and no layout shift caused by thumbnails; at 1280px, at least 10 tiles fit on the first screen when available (SC-002)

**Constraints**: Server-side NSFW gating unchanged; filter query names and semantics unchanged; works without JavaScript; keyboard-operable with visible focus; WCAG 2.1 AA contrast; no page-level horizontal scrolling; no ToyHouse branding or assets

**Scale/Scope**: One public page (`src/views/pages/gallery.njk`), its filter partial, gallery route presentation data, home-page CSS, and related tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | The existing `listCharacters` and facet queries remain the only source of visible characters, counts, and options. Counts are derived from already-filtered results. No route serving media is added. |
| II. Data Integrity Through Invariants | PASS | No data writes, schema changes, or invariants are affected. |
| III. Works Without JavaScript | PASS | Filtering stays a GET form; active-filter removal uses ordinary links; collapsible sections use native `<details>`. Tiles remain single links with visible focus. |
| IV. Test-First Where It Counts | PASS | No safety-critical behaviour changes. Rating tests remain unchanged; a gallery-specific NSFW-count check is added before markup changes to guard the new count. |
| V. Boring By Default | PASS | Reuses current templates, route, and stylesheet. No package, build step, framework, or new endpoint. |

### Post-Design Gate

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | The contract requires `count = characters.length` from the rating-filtered list, and removal URLs contain only filter parameters already supplied by the visitor. |
| II. Data Integrity Through Invariants | PASS | `ActiveFilter` is a transient view model, not stored data. |
| III. Works Without JavaScript | PASS | Every filter action is a link or form submission, and URLs remain shareable. Native disclosure and focus behaviour need no script. |
| IV. Test-First Where It Counts | PASS | The quickstart and contract identify HTTP-level checks for count gating, removal URLs, and unchanged filtering before implementation. |
| V. Boring By Default | PASS | A small pure helper in the gallery route is the simplest correct way to build removal URLs; template-only URL building would be harder to test and encode safely. |

No constitution violations or unresolved clarifications remain.

## Project Structure

### Documentation (this feature)

```text
specs/004-toyhouse-gallery-home/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── home-gallery.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Produced by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── routes/
│   └── public/
│       └── gallery.js            # Adds active-filter view model; queries unchanged
├── views/
│   ├── pages/
│   │   └── gallery.njk           # Collection header, results bar, tile grid, empty state
│   └── partials/
│       └── filters.njk           # Horizontal filter bar with native disclosure sections
└── public/
    └── css/
        └── main.css              # Home-page header, filter bar, chip, and tile styles

tests/
├── contract/
│   └── gallery.test.js           # Header, count, chips, filter bar, tile content
└── integration/
    ├── accessibility.test.js     # Labels, focus, responsive CSS assertions
    ├── nsfw-*.test.js            # Unchanged rating guarantees
    └── route-audit.test.js       # Unchanged public route inventory
```

**Structure Decision**: Keep the single server-rendered application. Query and filtering logic stays in repositories; the route builds HTTP-facing removal URLs; templates render semantic markup; CSS owns the ToyHouse-inspired presentation.

## Complexity Tracking

No constitutional violations require justification.
