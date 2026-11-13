# Implementation Plan: Prominent Admin Actions and Designer as First-Image Artist

**Branch**: `013-admin-actions-designer-artist` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-admin-actions-designer-artist/spec.md`

## Summary

Two small, independent changes. (1) Move the three creation actions to the top of the admin home page and restyle them as large accent-colored buttons using the existing palette. (2) Add a "Same artist as the designer" checkbox to the new-character form; when set, the first image's artist is the designer (existing or newly entered, deduplicated into one artist record) and the separate image-artist fields are not required.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks; no new dependencies

**Storage**: No schema change

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`

**Target Platform**: Self-hosted web application, responsive

**Constraints**: Works without JavaScript (plain checkbox); failed submission saves nothing (existing transaction and file cleanup); admin-only screens; text contrast for buttons must meet WCAG AA

**Scale/Scope**: `src/views/admin/dashboard.njk`, `src/public/css/main.css`, `src/views/admin/character-new.njk`, `src/services/characters.js`, optional small enhancement in `src/public/js/enhance.js`, tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No change to rating logic or media serving. |
| II. Data Integrity Through Invariants | PASS | Image still always has a valid artist (the designer); creation stays in one transaction with file cleanup on failure. |
| III. Works Without JavaScript | PASS | Checkbox is submitted with the form; JS only optionally hides the artist fields. |
| IV. Test-First Where It Counts | PASS | Tests first for validation and artist deduplication on the create path. |
| V. Boring By Default | PASS | Plain markup, CSS, existing helpers; no new packages. |

### Post-Design Constitution Check

All principles remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/013-admin-actions-designer-artist/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── admin-ui.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── services/characters.js          # same-as-designer handling in validation and create
├── views/admin/dashboard.njk       # actions first, as buttons
├── views/admin/character-new.njk   # checkbox, state preserved on redisplay
└── public/
    ├── css/main.css                # .admin-actions / .btn-action styling
    └── js/enhance.js               # optional: hide image-artist fields when ticked
tests/integration/                  # dashboard order/markup, create-with-same-artist
```

**Structure Decision**: Existing single-project layout; touch only the files above.

## Complexity Tracking

No constitution violations to justify.
