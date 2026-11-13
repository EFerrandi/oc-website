# Implementation Plan: Relationship Map Improvements

**Branch**: `014-relationship-map-improvements` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-relationship-map-improvements/spec.md`

## Summary

Four changes to the relationships page and its data. (1) Make mouse press-drag reliable for characters and add panning of the whole view on empty space (mouse only; touch keeps scrolling the page). (2) Show labels and names in full by wrapping text onto several lines and growing the map height, instead of truncating. (3) Add a one-sided/two-sided attribute to relationships, stored in the database, editable in the admin, drawn with an arrowhead for one-sided ones and stated in the text equivalent and on the character page. (4) Use the character's designated avatar with its saved crop on the map.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, `node:sqlite`; no new dependencies

**Storage**: One new migration `007_relationship_sidedness.sql`: `relationship.is_one_sided` column (default 0) and a replacement unique index that compares direction for one-sided rows

**Testing**: `node:test` and Supertest; `vm`-based tests for the client script; `npm test`, `npm run test:nsfw`

**Target Platform**: Server-rendered pages, responsive; the map is SVG drawn on the server and enhanced by a module script

**Constraints**: Map fully readable without JavaScript; positions never stored (FR-004); rating gate unchanged, nodes derived only from visible relationships; avatar still served through the gated media route

**Scale/Scope**: `src/db/migrations`, `src/services/relationships.js`, `src/repositories/relationships.js`, `src/routes/public/relationships.js`, `src/lib/graph-layout.js`, `src/views/partials/relationship-map.njk`, `src/views/admin/relationships.njk`, `src/views/pages/character.njk`, `src/public/js/relationship-map.js`, `src/public/css/main.css`

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Sidedness does not touch rating filtering; nodes are still built only from visible relationship rows; avatar crop uses the same rating-aware resolution. |
| II. Data Integrity Through Invariants | PASS | Migration backfills existing rows as two-sided; the unique index and the service both enforce the duplicate rule; self-relationship check kept. |
| III. Works Without JavaScript | PASS | Arrows, wrapped text and avatars are server-rendered; dragging and panning are enhancement only. |
| IV. Test-First Where It Counts | PASS | Tests first for migration, duplicate rules, rating gate with one-sided rows, and full-text rendering. |
| V. Boring By Default | PASS | Plain SVG markers and `tspan` wrapping; no libraries. |

### Post-Design Constitution Check

All principles remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/014-relationship-map-improvements/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── relationship-map.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/migrations/007_relationship_sidedness.sql
├── services/relationships.js        # sidedness input, direction-aware duplicate rule
├── repositories/relationships.js    # select sidedness and avatar crop
├── routes/public/relationships.js   # carry sidedness, avatar crop into the model
├── lib/graph-layout.js              # wrapped label lines, taller map, direction flag
├── views/partials/relationship-map.njk  # arrowhead marker, tspans, cropped avatar
├── views/admin/relationships.njk    # sidedness choice, direction swap on edit
├── views/pages/character.njk        # sidedness text
└── public/
    ├── js/relationship-map.js       # reliable drag, mouse panning, arrow-aware redraw
    └── css/main.css                 # touch-action, arrow and label styles
tests/integration/ and tests/unit/
```

**Structure Decision**: Existing single-project layout; touch only the files above.

## Complexity Tracking

No constitution violations to justify.
