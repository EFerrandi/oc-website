# Implementation Plan: Fix Listing Text Overlap and Chart Rating Colors

**Branch**: `006-fix-listing-and-chart-colors` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-fix-listing-and-chart-colors/spec.md`

## Summary

Two small fixes in the existing server-rendered app. (1) In the character listing, the avatar `<img>` is scaled with an inline `transform: scale()` for the crop but has no clipping wrapper, so the enlarged image paints over `.card-body` (name and jobs). Wrap the image in a clipping frame that keeps the square aspect ratio. (2) The dashboard pie chart colors slices by character index; split each character's slice into an SFW arc and an NSFW arc using two fixed rating colors, and add a legend. The text table stays as the accessible alternative.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks; no new dependencies

**Storage**: None; no schema change

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`

**Target Platform**: Self-hosted web app, responsive 320px to 1920px

**Project Type**: Single server-rendered web application

**Performance Goals**: No additional queries; chart data derived from the existing statistics result

**Constraints**: Keep the `.character-tile .card-thumb` rule (aspect-ratio 1/1, object-fit cover) asserted by the accessibility test; keep the tile structure asserted by the gallery contract test; keep dashboard text assertions; works without JavaScript; the two colors must differ from each other and from the chart background, and not rely on color alone (legend and table)

**Scale/Scope**: One template, one route, one stylesheet, and test updates

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No new media route or variant; listing still uses the rating-resolved avatar; dashboard stays behind `requireAdmin` |
| II. Data Integrity Through Invariants | PASS | No data change |
| III. Works Without JavaScript | PASS | Pure HTML/CSS/SVG; legend and table are text |
| IV. Test-First Where It Counts | PASS | Add failing tests for the clipping frame and the SFW/NSFW chart arcs before implementing |
| V. Boring By Default | PASS | CSS clipping and static SVG arcs; no chart library |

### Post-Design Constitution Check

No gate changes after design; all principles remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-listing-and-chart-colors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-changes.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── routes/admin/dashboard.js        # build per-rating arcs
├── views/admin/dashboard.njk        # render arcs and legend
├── views/pages/gallery.njk          # clipping frame around avatar
└── public/css/main.css              # tile frame, rating colors, legend

tests/
├── contract/gallery.test.js
├── integration/admin.test.js
└── integration/accessibility.test.js
```

**Structure Decision**: Existing single-project layout; edit only the files above.

## Complexity Tracking

No violations.
