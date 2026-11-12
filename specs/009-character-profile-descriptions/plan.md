# Implementation Plan: Character Profile Descriptions

**Branch**: `009-character-profile-descriptions` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-character-profile-descriptions/spec.md`

## Summary

Add two optional multiline text values to each character: Personality and Physical Description. Store them through a new forward-only SQLite migration, expose them in the existing admin create/edit forms, and render non-empty sections after Relationships and immediately before Stories on the public character profile. Preserve paragraph breaks without interpreting stored text as HTML.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, SQLite; no new dependencies

**Storage**: SQLite `character` table; new migration `005_character_profile_descriptions.sql`

**Testing**: `node:test` and Supertest; `npm test` and `npm run test:nsfw`

**Target Platform**: Existing self-hosted web application, responsive mobile and desktop

**Project Type**: Single server-rendered web application

**Performance Goals**: No additional requests or queries beyond the character profile's existing data retrieval

**Constraints**: Both fields are optional plain text; existing characters remain valid with null values; retain user-entered paragraph breaks; escape text in rendered HTML; admin submission remains usable without JavaScript; all database access stays in repositories and multi-step rules in services; migration is forward-only

**Scale/Scope**: One migration, character repository/service, admin forms, character profile template, focused tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Adds only descriptive character text; no media or narrative endpoint or content-rating behavior changes. |
| II. Data Integrity Through Invariants | PASS | Optional fields are stored on the character; migration adds nullable columns and does not change existing invariants. Writes remain in the existing character service. |
| III. Works Without JavaScript | PASS | Native textareas and server-rendered profile output work without JavaScript. |
| IV. Test-First Where It Counts | PASS | Standard behavior tests cover persistence, editing, display, blank values, and paragraph breaks. No new safety-critical path is introduced. |
| V. Boring By Default | PASS | Reuses existing CRUD and server-rendered template patterns; no dependencies or abstractions are added. |

### Post-Design Constitution Check

No gate changes after design; all principles remain PASS. Migration is forward-only, profile output remains escaped plain text, and no new content access path is introduced.

## Project Structure

### Documentation (this feature)

```text
specs/009-character-profile-descriptions/
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
├── db/migrations/005_character_profile_descriptions.sql
├── repositories/characters.js                 # select and expose the two fields
├── services/characters.js                      # accept and persist optional values
└── views/
    ├── admin/partials/character-fields.njk    # fields shared by create/edit
    └── pages/character.njk                     # ordered profile sections

tests/
└── integration/
    ├── admin.test.js                            # create/edit persistence and clearing
    └── character-profile.test.js                # display order, optional and paragraphs
```

**Structure Decision**: Existing single-project layout. Schema is extended by a new migration; repository/service/template boundaries remain unchanged.

## Complexity Tracking

No violations.
