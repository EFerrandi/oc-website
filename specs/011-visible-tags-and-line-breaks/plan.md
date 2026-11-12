# Implementation Plan: Visible Tags and Preserved Line Breaks

**Branch**: `011-visible-tags-and-line-breaks` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-visible-tags-and-line-breaks/spec.md`

## Summary

Keep the existing single-select gender and multi-select tag filters, but display all choices together without a collapsed disclosure and immediately submit the existing GET form when either kind of choice changes. Preserve the no-JavaScript submit path and URL-based selected state. Render every line break in character personality/physical descriptions, full story bodies, and terms of use, while retaining paragraph spacing, safe text escaping, and existing NSFW gating.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, SQLite; no new dependencies

**Storage**: No data or schema changes; existing gender, tag, description, story, and terms fields are reused

**Testing**: `node:test` and Supertest; `npm test` and `npm run test:nsfw`

**Target Platform**: Existing self-hosted web application, responsive mobile and desktop

**Project Type**: Single server-rendered web application

**Performance Goals**: Filter changes issue one normal GET navigation; text rendering adds no requests or retrieval work

**Constraints**: Gender remains single-select; tags remain multi-select; all filter choices are visible without expanding a control; selected filter state remains encoded in the URL; changes work through the existing form without JavaScript; preserve single and blank-line breaks for CRLF, LF, and CR input; text remains escaped; do not reformat short image descriptions, labels, or truncated previews; do not bypass NSFW gates

**Scale/Scope**: Gallery filter partial and progressive-enhancement script, public character and story templates, shared stylesheet, and focused gallery/profile/story tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Only changes rendering of already-gated character/story content. No new route, media path, or client-side hiding of rated content is introduced. Existing story access and rating decisions remain server-side. |
| II. Data Integrity Through Invariants | PASS | No entity or persistence changes; existing gender and reusable tag models remain distinct. |
| III. Works Without JavaScript | PASS | All filter inputs are present in server-rendered markup and submit through the existing GET form. JavaScript only submits on selection changes; the manual submit remains when enhancement is unavailable. Native controls remain keyboard-operable. |
| IV. Test-First Where It Counts | PASS | Add regression tests for filter interaction and line-break rendering, including story views at the HTTP layer. No new safety-critical path is added; NSFW test suite verifies existing gates remain intact. |
| V. Boring By Default | PASS | Reuse existing controls, query handling, templates, CSS, and enhancement script. No dependency, data migration, API, or client-side filtering engine is introduced. |

### Post-Design Constitution Check

All principles remain PASS. Existing server-side filters and rated-content gates remain authoritative. Line breaks are rendered as text rather than interpreted as markup.

## Project Structure

### Documentation (this feature)

```text
specs/011-visible-tags-and-line-breaks/
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
│   ├── css/main.css                       # visible, responsive filter choices and text layout
│   └── js/enhance.js                      # submit filter form on gender or tag changes
└── views/
    ├── partials/filters.njk               # all choices rendered expanded
    ├── pages/character.njk                # description and inline-story line breaks
    └── pages/story.njk                    # standalone story line breaks

tests/
├── contract/gallery.test.js               # visible controls and selected GET state
├── integration/accessibility.test.js      # keyboard/focus and responsive controls
├── integration/character-profile.test.js  # descriptions, inline stories, and terms
├── integration/story.test.js               # standalone story body and NSFW gate
└── integration/enhance.test.js             # immediate gender/tag form submission
```

**Structure Decision**: Use the existing single-project layout. No server routes, repositories, services, database schema, or external interface need to change. Apply newline normalization and rendering behavior at the public presentation boundary.

## Complexity Tracking

No violations.
