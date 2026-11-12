# Implementation Plan: Merged Rating Chart and Prefilled Permissions on Edit

**Branch**: `008-chart-rating-merge-and-permissions-prefill` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-chart-rating-merge-and-permissions-prefill/spec.md`

## Summary

Two small fixes in the existing server-rendered app. (1) The statistics chart currently emits SFW and NSFW arcs per character; build exactly two arcs from the overall totals (SFW then NSFW) so only two continuous colored regions show. (2) The character edit form passes the stored `character` (camelCase `canRegift`, `canRetrade`, `canResell`) as the field values, but the permission radios read `can_regift`, `can_retrade`, `can_resell`, so nothing is preselected; the edit form also ignores the submitted values after a validation error. Make the permission radios read both the submitted value and the stored value, with the submitted value winning.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks; no new dependencies

**Storage**: None; no schema change (`can_regift`, `can_retrade`, `can_resell` already stored)

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`

**Target Platform**: Self-hosted web app, responsive 320px to 1920px

**Project Type**: Single server-rendered web application

**Performance Goals**: No additional queries

**Constraints**: Stored `0` must count as a real value (not empty); creation form preselects nothing; keep existing dashboard text, legend, table and accessibility assertions; update the feature 006 tests that expect per-character arcs; works without JavaScript

**Scale/Scope**: One route, two templates, tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Admin-only dashboard; no media route change |
| II. Data Integrity Through Invariants | PASS | No data change; permissions still required and validated on save; unchanged values round-trip |
| III. Works Without JavaScript | PASS | Native radios and static SVG |
| IV. Test-First Where It Counts | PASS | Failing tests first for the two-region chart and permission prefill (including value 0 and error redisplay) |
| V. Boring By Default | PASS | Template and route logic only |

### Post-Design Constitution Check

No gate changes after design; all principles remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/008-chart-rating-merge-and-permissions-prefill/
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
├── routes/admin/dashboard.js                  # two arcs from totals
├── routes/admin/characters.js                 # pass submitted values to the edit form
├── views/admin/dashboard.njk                  # arc titles and description
├── views/admin/character-edit.njk             # fields receive submitted-over-stored values
└── views/admin/partials/character-fields.njk  # permission radios read both name styles

tests/
├── integration/admin.test.js                  # chart and edit-form prefill
└── integration/accessibility.test.js          # chart color rule stays
```

**Structure Decision**: Existing single-project layout; edit only the files above.

## Complexity Tracking

No violations.
