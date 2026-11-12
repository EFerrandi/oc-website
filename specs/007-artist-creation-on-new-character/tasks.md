# Tasks: Create Artists While Creating a Character

**Input**: Design documents from `specs/007-artist-creation-on-new-character/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-changes.md

**Tests**: Included, per the plan's test-first gate (constitution principle IV).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup needed; no new dependencies, schema or routes.

---

## Phase 2: Foundational

- [X] T001 Create `src/lib/artists.js` exporting a `parseArtistWebsite(raw)` helper that returns `{ websiteUrl }` or `{ error }`: blank is allowed (null); otherwise it must parse as an absolute `http:` or `https:` URL, error text "Enter a full web address starting with http:// or https://, or leave it blank."
- [X] T002 Update `src/services/image-records.js` to use `parseArtistWebsite` instead of its inline URL parsing, with unchanged behavior (including rejecting duplicate names). Run `node --test tests/integration/admin.test.js` to confirm no regression.

**Checkpoint**: Shared helper in place.

---

## Phase 3: User Story 1 - Add a new artist from the "Add a character" form (Priority: P1) 🎯 MVP

**Goal**: Both the designer and the first-image artist can be created inline while creating a character, atomically.

**Independent Test**: POST `/admin/characters` with `artist_id=new` and `image_artist_id=new` plus names; the character, image and artists exist.

### Tests for User Story 1

- [X] T003 [P] [US1] In `tests/integration/admin.test.js`, add failing tests: (a) new designer and new image artist (`new_designer_name`, `new_image_artist_name`, optional website fields) are created and linked to the character and image; (b) the same new name (different case) for both creates exactly one artist; (c) a new name matching an existing artist (case-insensitive, trimmed) reuses it and creates no duplicate; (d) a blank website creates the artist with a null `website_url`.
- [X] T004 [P] [US1] In `tests/integration/admin.test.js`, add failing tests: an empty `new_designer_name` or `new_image_artist_name` returns 422 naming that field; an invalid website returns 422 naming `new_designer_website_url` or `new_image_artist_website_url`; the redisplayed form keeps all entered values and the `new` selections; a failure (for example a missing image file) leaves no new artist, character, image row or uploaded file.
- [X] T005 [P] [US1] In `tests/integration/admin.test.js`, add a failing test that GET `/admin/characters/new` has an `Add a new artist…` option (value `new`) in both `artist_id` and `image_artist_id`, plus the four new-artist inputs rendered without JavaScript.

### Implementation for User Story 1

- [X] T006 [US1] In `src/services/characters.js`, validate new-artist input before storing the file: when `artist_id === 'new'` or `image_artist_id === 'new'`, require a normalised name (field `new_designer_name` / `new_image_artist_name`), parse the website with `parseArtistWebsite` (fields `new_designer_website_url` / `new_image_artist_website_url`), and skip the existing-artist checks for the `new` selection. Keep all errors in one `ValidationError`.
- [X] T007 [US1] In `createCharacterWithImage` (`src/services/characters.js`), inside the existing transaction resolve each new artist before inserting the image and character: reuse an existing artist whose `nameKey` matches, otherwise insert (`name`, `website_url`, timestamps); the same key in both selectors resolves to one row. Use the resolved ids for `image.artist_id` and `character.artist_id`.
- [X] T008 [US1] In `src/views/admin/partials/character-fields.njk`, add an `allowNewArtist` macro parameter (default false). When true, add the `Add a new artist…` option (value `new`, selected when `values.artist_id == "new"`) to the designer select and a designer fieldset with `new_designer_name` and `new_designer_website_url`, always visible, values redisplayed.
- [X] T009 [US1] In `src/views/admin/character-new.njk`, pass `allowNewArtist=true` to `characterFields`, add the `Add a new artist…` option to `image_artist_id`, and add the image-artist fieldset with `new_image_artist_name` and `new_image_artist_website_url`, values redisplayed.

**Checkpoint**: T003–T005 pass.

---

## Phase 4: User Story 2 - Editing a character does not create artists (Priority: P2)

**Goal**: The edit form and edit submissions never create artists.

**Independent Test**: The edit form shows no new-artist option; a crafted `artist_id=new` edit creates nothing.

### Tests for User Story 2

- [X] T010 [P] [US2] In `tests/integration/admin.test.js`, add tests: GET `/admin/characters/:id/edit` contains no `Add a new artist…` and no `new_designer_name`; a POST edit with `artist_id=new`, `new_designer_name` set returns 422 "Choose an artist." and the `artist` row count is unchanged.

### Implementation for User Story 2

- [X] T011 [US2] Confirm `src/views/admin/character-edit.njk` does not pass `allowNewArtist` and that `updateCharacter` / `validateCharacterInput` still require an existing artist; fix only if T010 fails.

**Checkpoint**: Both stories work.

---

## Phase 5: Polish

- [X] T012 Run `npm test`, `npm run test:nsfw`, and `git diff --check`; all must pass.
- [X] T013 Walk through `specs/007-artist-creation-on-new-character/quickstart.md` manual steps, including with JavaScript disabled.

---

## Dependencies & Execution Order

- T001 → T002; T001 → T006.
- T003–T005 before T006–T009 (they must fail first). T006 → T007; T008 → T009.
- US2 (T010–T011) depends on T008. Polish last.

## Parallel Opportunities

- T003, T004, T005 and T010 are in the same file but independent additions; write them together.
- T006/T007 (service) and T008/T009 (templates) can proceed in parallel after the tests.

## Implementation Strategy

MVP is US1 (Phases 2–3). Then US2 guards, then polish.
