# Implementation Plan: Gallery and Admin Enhancements

**Branch**: `005-gallery-admin-enhancements` | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-gallery-admin-enhancements/spec.md`

## Summary

Consolidate designers, image artists, and sins/virtues into the existing artist and tag taxonomies through a forward-only data migration; update shared selection controls to accessible, keyboard-operable bubbles; create artists inline during image upload; improve character profile information placement and access control; add image-association statistics and an accessible pie chart to the admin dashboard; and add per-character square avatar crop settings without changing originals or other characters' crops.

The implementation remains in the existing server-rendered Express/Nunjucks/SQLite application. Preserve existing routes and semantics where possible, use native controls and server submissions as the complete no-JavaScript baseline, derive dashboard statistics from image-character associations, and avoid new dependencies.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, SQLite (`node:sqlite`), Sharp; no new dependencies planned

**Storage**: SQLite schema migration and existing upload storage; no change to original image bytes

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`, focused integration/contract suites

**Target Platform**: Existing self-hosted web application, responsive from 320px to 1920px

**Project Type**: Single server-rendered web application

**Performance Goals**: Dashboard statistics use a bounded aggregate query rather than per-character image queries; no additional public-media routes; gallery and character listing query counts do not grow per row.

**Constraints**: Forward-only migration; preserve creator names, links, credit associations, tags, and trait associations; artist link conflicts prefer the existing artist row; SFW gating remains server-side; ownership and dashboard statistics are admin-only; uploads and records are atomic; original media is immutable; selection and crop flows work without JavaScript; keyboard focus and contrast remain accessible.

**Scale/Scope**: One migration and updates to artist/tag data access, character/image services and routes, public/admin templates, shared CSS, and automated tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Existing public media gate remains the sole path to stored uploads. Artist groupings continue to be rating-filtered. Admin-only statistics can include all ratings only behind the existing admin route gate. No crop derivative is required or served. |
| II. Data Integrity Through Invariants | PASS | Migration, taxonomy consolidation, artist creation with image upload, and crop persistence are transactional. Preserve image-character links and tag/trait character links. File cleanup follows existing upload-service rollback behavior. |
| III. Works Without JavaScript | PASS | Bubble controls are native radio/checkbox inputs styled as text pills; form submission and filtering remain standard GET/POST behavior. Crop fields save through a regular form; JavaScript may enhance preview interaction but cannot be required to set or save values. |
| IV. Test-First Where It Counts | PASS | Add failing tests before implementation for migration integrity, anonymous ownership/statistics exclusion, upload rollback, and avatar ownership/crop isolation; verify access rules at HTTP level. |
| V. Boring By Default | PASS | Reuse SQLite, server rendering, existing Sharp and CSS/SVG; no chart, cropper, or frontend-framework dependency. Keep the chart static and accessible. |

No pre-design gate failures.

## Phase 0: Research

Research decisions and alternatives are recorded in [research.md](research.md). They resolve the implementation details for data migration, bubble semantics, crop selection, chart rendering, and upload atomicity.

## Phase 1: Design & Contracts

The persistence changes and validation rules are specified in [data-model.md](data-model.md). User-facing and admin-facing behavior is specified in [contracts/gallery-admin-enhancements.md](contracts/gallery-admin-enhancements.md). End-to-end verification is in [quickstart.md](quickstart.md). Each forward-only migration is implemented with the story that first consumes its changed schema so no incomplete taxonomy removal is treated as a finished increment.

### Post-Design Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No new public media URL is introduced. Avatar display uses the already-resolved rating-visible image and crop parameters; anonymous pages never render ownership values. Dashboard is served only behind `requireAdmin`. |
| II. Data Integrity Through Invariants | PASS | Migration handles duplicate case-insensitive identities and merged associations within a transaction. Artist creation and image record creation share one transaction with cleanup of stored files on failure. Avatar crop values are validated and saved atomically with the character update. |
| III. Works Without JavaScript | PASS | Radio/checkbox bubble groups, form submission, and crop values all work through ordinary HTML forms. Optional scripting is limited to preview convenience. |
| IV. Test-First Where It Counts | PASS | Migration, access control, and transactional failure tests are required before the corresponding changes; HTTP checks cover anonymous/admin views and NSFW visibility. |
| V. Boring By Default | PASS | No dependencies or client rendering framework; SVG chart generation and CSS bubble/crop presentation use existing platform capabilities. |

No constitutional violations or unresolved design decisions remain.

## Project Structure

### Documentation (this feature)

```text
specs/005-gallery-admin-enhancements/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── gallery-admin-enhancements.md
```

### Source Code (repository root)

```text
src/
├── db/migrations/                 # Add forward-only schema/data migration
├── repositories/
│   ├── credits.js                 # Unified artist credits and artist listings
│   ├── tags.js                    # Unified tag lookup/filtering
│   ├── characters.js              # Rating-aware profiles, optional admin ownership, crop
│   └── image-statistics.js        # Aggregate image-character counts
├── services/
│   ├── taxonomy.js                # Artist/tag CRUD after consolidation
│   ├── image-records.js           # Atomic artist creation and upload record
│   └── characters.js              # Validate and persist avatar crop
├── routes/
│   ├── public/                    # Character and gallery view models
│   └── admin/                     # Upload, taxonomy, and dashboard
├── views/
│   ├── partials/                  # Shared bubble controls and navigation
│   ├── pages/                     # Character and artist views
│   └── admin/                     # Upload, character edit, taxonomy, dashboard
└── public/css/main.css            # Bubble, profile, crop preview, chart styles

tests/
├── unit/                          # Migration/data aggregation where appropriate
├── contract/                      # Public gallery and character output contracts
└── integration/                   # Admin, auth, migration, upload, NSFW, accessibility
```

**Structure Decision**: Retain the single existing Node.js application and its repository/service/route separation. SQL remains in repositories and migrations; cross-table writes remain in services; routes adapt request and authorization context; server-rendered templates provide the no-JavaScript behavior.

## Complexity Tracking

No constitutional violations require justification.
