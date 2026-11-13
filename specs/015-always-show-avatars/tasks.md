# Tasks: Always Show Avatars in Listings

**Input**: `specs/015-always-show-avatars/` (plan.md, spec.md, research.md, data-model.md, contracts/media-gate.md, quickstart.md)

**Tests**: Written first (constitution IV) for the media gate and the resolver.

## Phase 1: Foundational (blocking)

- [X] T001 Amend `.specify/memory/constitution.md` Principle I to version 2.0.0 (MAJOR): add the avatar-preview exemption (only the preview of a current avatar, served through the single gated route, 404 for everything else), add a Sync Impact Report, and update the Version / Last Amended lines
- [X] T002 Add `isCurrentAvatar(db, imageId)` to `src/repositories/avatars.js` per data-model.md: true iff the image is the resolved avatar (designated non-video, else oldest linked non-video image) of at least one character

## Phase 2: User Story 1 - Avatars always visible in the gallery (P1) 🎯 MVP

**Independent Test**: NSFW avatar with NSFW off: gallery card shows it, and `GET /media/<id>` returns 200.

- [X] T003 [P] [US1] Write failing tests in `tests/integration/avatar-always-visible.test.js`: NSFW designated avatar shown in the gallery with NSFW off and identical with NSFW on; no designated avatar falls back to the oldest image even if NSFW; placeholder only when there is no image; avatar change does not alter the result between ratings
- [X] T004 [P] [US1] Write failing media-gate tests in `tests/integration/avatar-media-gate.test.js` per contracts/media-gate.md: current NSFW avatar preview 200 with `Cache-Control: private, no-store`; `/media/:id/full` 404; other NSFW image 404; image that stops being the avatar returns 404 again; refusals are 404 never 403
- [X] T005 [US1] Remove the rating filter from `resolveEffectiveAvatar` in `src/repositories/avatars.js` (designated avatar and fallback), updating its doc comment
- [X] T006 [US1] In `src/routes/public/media.js`, let the preview variant serve a rating-hidden image when `isCurrentAvatar` is true; the full variant keeps the normal check; keep `private, no-store` for NSFW (uses `findVisibleImageById` in `src/repositories/images.js`, adding an avatar-aware lookup there if cleaner)
- [X] T007 [US1] Update existing tests that assumed rating-filtered avatars (`tests/integration/nsfw-gating.test.js`, `tests/integration/nsfw-placeholder.test.js`, `tests/contract/gallery.test.js`, `tests/integration/relationship-map-avatar.test.js`) to the new rule

## Phase 3: User Story 2 - Same avatars on the map and other listings (P1)

**Independent Test**: With NSFW off the relationship map shows the gallery's avatar; NSFW-only characters/relationships remain hidden.

- [X] T008 [US2] Add tests to `tests/integration/relationship-map-avatar.test.js`: NSFW avatar shown on the map with NSFW off and equal to the gallery avatar; a character only in NSFW relationships is still not listed
- [X] T009 [US2] Verify `src/repositories/relationships.js` and `src/routes/public/relationships.js` use the updated resolver with no extra rating filter; fix if any remains

## Phase 4: User Story 3 - Nothing else becomes visible (P1)

**Independent Test**: With NSFW off, no other NSFW picture, story or relationship appears anywhere.

- [X] T010 [P] [US3] Add tests in `tests/integration/avatar-media-gate.test.js`: character page with NSFW off shows the NSFW avatar in the header but not in the picture list; other images of that character return 404; NSFW stories and relationships stay hidden
- [X] T011 [US3] Confirm the character page picture list, artist and image listings still filter by rating in `src/repositories/characters.js` and `src/repositories/images.js`; fix any leak found
- [X] T012 [US3] Add a notice to the avatar picker in `src/views/admin/character-edit.njk` that an NSFW avatar is visible to everyone (FR-008), with a test in `tests/integration/admin.test.js`

## Phase 5: Polish

- [X] T013 [P] Update the README section on NSFW handling to describe the avatar exemption
- [X] T014 Run `npm test`, `npm run test:nsfw`, `git diff --check`, then walk through `specs/015-always-show-avatars/quickstart.md`

## Dependencies

- T001 and T002 first. T003 and T004 (tests) before T005 and T006. T007 after T005.
- US2 and US3 depend on T005 and T006; T010 and T008 are independent of each other.
- T014 last.

## Implementation Strategy

MVP is US1 (T001 to T007). US2 and US3 then mostly verify and lock the behaviour with tests. Parallel: T003 with T004, T010 with T008, T013 anytime.

## Phase 7: Convergence

- [X] T015 Update the stale doc comment above the relationship avatar attachment in src/repositories/relationships.js (lines 53-56): it still says a NSFW designated avatar falls back to a visible image for non-opted-in visitors, which contradicts FR-001/FR-002/FR-003 (partial)
