# Implementation Plan: Always Show Avatars in Listings

**Branch**: `015-always-show-avatars` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-always-show-avatars/spec.md`

## Summary

Character avatars become exempt from the NSFW switch. The avatar resolver stops filtering by rating (designated avatar, else oldest linked still image, else placeholder). The gated media route serves the **preview** of an NSFW image to everyone only when that image is currently some character's avatar; the full-size variant and every other NSFW image stay gated. The constitution is amended (MAJOR, since it permits what Principle I forbade) with the exact replacement protection. The admin avatar picker warns that NSFW avatars are public.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, `node:sqlite`; no new dependencies

**Storage**: No schema change

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`

**Target Platform**: Server-rendered responsive pages

**Constraints**: Safe default preserved: only the preview of a current avatar is exempt; not-found (never 403) for everything else; NSFW avatar responses keep `Cache-Control: private, no-store`

**Scale/Scope**: `.specify/memory/constitution.md`, `src/repositories/avatars.js`, `src/repositories/images.js`, `src/routes/public/media.js`, `src/views/admin/character-edit.njk`, tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | VIOLATION (justified) | The principle forbids adult content reaching non-opted-in visitors. This is an owner-requested exemption. Resolved by amendment before delivery (FR-007): avatars only, preview only, still through the single gated route, 404 for all else. |
| II. Data Integrity Through Invariants | PASS | "Is current avatar" is defined once (avatars module) and used by both listings and the media gate. |
| III. Works Without JavaScript | PASS | Server-rendered. |
| IV. Test-First Where It Counts | PASS | Tests first for the media gate: non-avatar NSFW still 404, avatar preview 200, full variant 404, avatar change re-hides. |
| V. Boring By Default | PASS | One SQL predicate; no new dependencies. |

### Post-Design Constitution Check

Principle I stays a justified violation until the amendment lands (task 1). All others PASS.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principle I exemption | Owner wants avatars visible in all listings | Hiding only in the HTML while serving bytes would be a client-side hide, which Principle I forbids; the gate itself must change |

## Project Structure

```text
specs/015-always-show-avatars/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/media-gate.md
└── tasks.md             # created by /speckit-tasks
```

```text
.specify/memory/constitution.md            # amend Principle I, version 2.0.0
src/repositories/avatars.js                # drop rating filter; add isCurrentAvatar
src/repositories/images.js                 # gate: allow avatar preview
src/routes/public/media.js                 # preview-only exemption
src/views/admin/character-edit.njk         # NSFW-avatar public warning
tests/                                     # new media-gate tests; update rating tests that assumed fallback
```

**Structure Decision**: Single project; changes are local to the avatar module and the media gate.
