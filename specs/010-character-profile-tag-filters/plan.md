# Implementation Plan: Character Profile and Tag Filters

**Branch**: `010-character-profile-tag-filters` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-character-profile-tag-filters/spec.md`

## Summary

Reorder the character profile so Personality and Physical Description precede Relationships, and align the description paragraphs with the existing story text width and spacing without making descriptions collapsible. Enhance the existing character-listing GET filter form so tag changes submit the current filters immediately when JavaScript is available, while retaining the form’s manual-submit fallback and URL-based state without JavaScript.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, SQLite; no new dependencies

**Storage**: No data or schema changes

**Testing**: `node:test` and Supertest; `npm test` and `npm run test:nsfw`

**Target Platform**: Existing self-hosted web application, responsive mobile and desktop

**Project Type**: Single server-rendered web application

**Performance Goals**: Tag selection submits one ordinary GET request; profile rendering adds no requests or data retrieval

**Constraints**: Preserve GET query parameters and other selected filters; retain no-JavaScript form submission; keep tag controls keyboard-accessible with visible focus; descriptions remain visible escaped plain text and preserve paragraphs; no schema, API, or dependency changes

**Scale/Scope**: Character profile template and styles, existing progressive-enhancement script, tag-filter partial, and focused profile/filter tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No rating logic, media serving, or narrative access path changes. |
| II. Data Integrity Through Invariants | PASS | No stored data, cross-entity invariant, or database operation changes. |
| III. Works Without JavaScript | PASS | The existing GET filter form remains the baseline; script behavior only submits it on tag changes. URL state and native submit remain available without JavaScript. Tag inputs and their existing visible focus styling remain keyboard-operable. |
| IV. Test-First Where It Counts | PASS | Add integration/contract assertions for section order and filtering behavior. No safety-critical path is introduced. |
| V. Boring By Default | PASS | Reuse the existing progressive-enhancement script and markup; no dependency, framework, endpoint, or abstraction is added. |

### Post-Design Constitution Check

All principles remain PASS. The filter enhancement is layered on the existing form and does not change server-side filtering or add a new content access path. Profile descriptions remain escaped plain text.

## Project Structure

### Documentation (this feature)

```text
specs/010-character-profile-tag-filters/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-changes.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── public/
│   ├── css/main.css                       # description typography and section spacing
│   └── js/enhance.js                      # submit listing form when a tag changes
└── views/
    ├── pages/character.njk                # profile section order
    └── partials/filters.njk               # preserve GET form fallback

tests/
├── contract/gallery.test.js               # existing filter contract and query state
├── integration/accessibility.test.js      # keyboard and focus affordances
└── integration/character-profile.test.js  # profile order and paragraph styling
```

**Structure Decision**: Use the existing single-project layout. The profile view, shared listing filter partial, global progressive-enhancement script, and their established tests are the only application surfaces in scope. No route, repository, service, or database changes are needed.

## Complexity Tracking

No violations.
