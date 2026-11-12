# Implementation Plan: Create Artists While Creating a Character

**Branch**: `007-artist-creation-on-new-character` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-artist-creation-on-new-character/spec.md`

## Summary

Extend the inline "Add a new artist…" pattern from the image upload form to the "Add a character" form, for both the designer (`artist_id`) and the first image's artist (`image_artist_id`). `createCharacterWithImage` resolves new artists inside its existing transaction (reusing case-insensitive matches and creating one artist when both selectors carry the same new name). The shared `characterFields` macro gets an opt-in flag so the edit form never shows the option, and `updateCharacter` ignores new-artist fields.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, Sharp; no new dependencies

**Storage**: SQLite via `node:sqlite`; no schema change (`artist` already has `name`, `website_url`)

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`

**Target Platform**: Self-hosted web app, responsive 320px to 1920px

**Project Type**: Single server-rendered web application

**Performance Goals**: No additional requests; a couple of lookups on submit

**Constraints**: Atomic (artist, image, character in one transaction; uploaded files removed on failure); field-named errors; all entered values redisplayed; new-artist fieldsets always visible (no JavaScript); image-upload behavior unchanged (it still rejects duplicate names)

**Scale/Scope**: One service, one route, two templates, tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Admin-only form; no media route change |
| II. Data Integrity Through Invariants | PASS | Artists created in the same transaction as the character and image; validation before any write; rollback removes files |
| III. Works Without JavaScript | PASS | Plain select plus always-present fieldsets |
| IV. Test-First Where It Counts | PASS | Failing tests first for atomic creation, reuse, shared name, errors, edit exclusion |
| V. Boring By Default | PASS | Reuses the `image-records.js` pattern; no new dependency |

### Post-Design Constitution Check

No gate changes after design; all principles remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/007-artist-creation-on-new-character/
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
├── lib/artists.js                              # shared parse/validate of a new-artist submission (new)
├── services/characters.js                      # resolve new designer / image artist in the transaction
├── services/image-records.js                   # reuse the shared website URL parsing (behavior unchanged)
├── routes/admin/characters.js                  # no logic change expected beyond redisplay
├── views/admin/character-new.njk               # image artist "new" option and fieldset
└── views/admin/partials/character-fields.njk   # opt-in designer "new" option and fieldset

tests/
├── integration/admin.test.js                   # creation, reuse, errors, atomicity, edit exclusion
└── (existing accessibility/route-audit tests stay green)
```

**Structure Decision**: Existing single-project layout; the only new file is a small helper shared with the image upload validation.

## Complexity Tracking

No violations.
