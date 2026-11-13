# Tasks: Autoplaying, Looping GIF and Video Media

**Input**: Design documents from `specs/012-animated-gif-video/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/media-routes.md`

**Tests**: Included (Constitution IV): written first and confirmed failing before implementation.

## Phase 1: Setup

No setup tasks are required; no new dependencies.

## Phase 2: Foundational

**Purpose**: Schema and type detection shared by all stories.

- [X] T001 Add forward-only migration `src/db/migrations/006_video_media.sql` (with `-- @requires-foreign-keys-off`) rebuilding `image`: `mime_type` CHECK allows `'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'`; `preview_file_name`, `width`, `height` nullable (`preview_file_name` stays UNIQUE); table CHECK: if `mime_type` starts with `video/` then `preview_file_name`, `width`, `height` are all NULL, otherwise all NOT NULL; preserve ids, data and FKs from `character.avatar_image_id` and `character_image.image_id`
- [X] T002 [P] Write unit tests in `tests/unit/media-type.test.js` for content sniffing (MP4 `ftyp` at bytes 4-8, WebM EBML `1A 45 DF A3`, text file renamed `.mp4` rejected, client MIME ignored) and `isVideo`
- [X] T003 Create `src/lib/media-type.js` exporting `sniffVideoType(buffer)` returning `video/mp4`, `video/webm` or null, and `isVideoMime(mime)`; make T002 pass
- [X] T004 [P] Add a migration test in `tests/integration/migrations.test.js` (or the existing migration test file) that existing images, avatars and links survive 006 and that a video row with a preview name or a non-video row without one is rejected

**Checkpoint**: schema and sniffing ready.

## Phase 3: User Story 1 - Animated GIFs play and loop everywhere (Priority: P1) 🎯 MVP

**Goal**: Animated GIFs animate and loop in previews and original.

**Independent Test**: Upload a multi-frame GIF; preview is a multi-frame looping WebP and full view serves the original GIF.

- [X] T005 [P] [US1] Write `tests/integration/animated-gif.test.js`: upload a generated multi-frame GIF, assert preview metadata has more than 1 page and `loop` 0, `/media/:id/full` returns the identical `image/gif` bytes, and a static GIF still works
- [X] T006 [US1] In `src/services/images.js` set `loop: 0` on the animated WebP preview output and keep `animated: true` for GIFs only; make T005 pass
- [X] T007 [US1] Confirm the gallery, character page and image page render GIF previews through `src/views/partials/image-preview.njk` and `src/views/pages/image.njk` unchanged, and add an assertion for it in T005's test file

**Checkpoint**: GIF behaviour verified.

## Phase 4: User Story 2 - Upload and view video files (Priority: P1)

**Goal**: MP4/WebM upload, autoplaying muted looping display, controls in full view, streaming.

**Independent Test**: Upload MP4 and WebM; they appear as autoplaying muted looping videos and the image page has controls and Range seeking.

### Tests for User Story 2

- [X] T008 [P] [US2] Write `tests/integration/video-media.test.js` upload cases: MP4 and WebM accepted with alt text and artist; stored with NULL preview and dimensions; invalid content with a video extension rejected with a file-field error and no files left in `uploadDir`; oversize rejected; deleting removes the file; a video cannot be chosen as an avatar
- [X] T009 [P] [US2] In the same file add markup cases: grid and character page contain `<video` with `autoplay`, `muted`, `loop`, `playsinline`, `preload="metadata"`, fallback download link; `/images/:id` has `controls`; `/media/:id` and `/media/:id/full` return `video/*` with `Accept-Ranges: bytes`; a `Range: bytes=0-9` request returns 206 with `Content-Range`; artist grouping page lists the video

### Implementation for User Story 2

- [X] T010 [US2] In `src/services/images.js` accept MP4/WebM via `sniffVideoType` (ignoring the client MIME), write the file only, skip sharp and the preview, return `previewFileName: null`, `width: null`, `height: null`; keep the existing error messages style and update the accepted-types message to list MP4 and WebM
- [X] T011 [US2] In `src/services/image-records.js` handle null preview/dimensions on create, and in `deleteImageFiles` (`src/services/images.js`) skip a null preview file; update the avatar auto-assignment queries (image-records.js) to skip videos
- [X] T012 [US2] In `src/services/characters.js` refuse a video as avatar with a clear `avatar_image_id` message, skip videos for the initial avatar choice, and keep the placeholder when a character has no still image; also check the avatar select in `src/views/admin/character-edit.njk` lists only non-video images
- [X] T013 [US2] In `src/repositories/images.js` expose `isVideo` on image rows (computed from `mimeType`) and make `src/routes/public/media.js` serve the original video bytes on both routes for videos (no preview file), keeping the rating check first, the `private, no-store` rule for NSFW, and Range support from `sendFile`
- [X] T014 [P] [US2] Update `src/views/partials/image-preview.njk` to render the `<video>` variant (`autoplay muted loop playsinline preload="metadata"`, `aria-label` from alt text, fallback text and download link) inside `a.preview-link`
- [X] T015 [P] [US2] Update `src/views/pages/image.njk` to render `<video controls autoplay muted loop playsinline>` from `/media/:id/full` for videos, and `src/views/admin/image-edit.njk` to preview a video; update the admin upload form hint and `accept` attribute in the image upload template under `src/views/admin/`
- [X] T016 [P] [US2] Update `src/public/js/lightbox.js` to open a `<video controls autoplay muted loop playsinline>` when the link's media is a video (add a `data-video` attribute in T014), and `src/public/css/main.css` so `video.card-thumb` matches image sizing and never overflows horizontally
- [X] T017 [US2] Run T008 and T009 and make them pass

**Checkpoint**: video upload and playback work.

## Phase 5: User Story 3 - Rating rules, accessibility and comfort (Priority: P2)

**Goal**: Rating gate applies to video; reduced motion respected.

**Independent Test**: NSFW video is 404 without opt-in (including Range); reduced motion disables autoplay.

- [X] T018 [P] [US3] Add to `tests/integration/video-media.test.js` (and `tests/nsfw/` suite if that is where gate tests live): NSFW video returns identical 404 on `/media/:id`, `/media/:id/full` and `/images/:id` without opt-in, including with a `Range` header; with opt-in it returns 200/206 with `Cache-Control: private, no-store`
- [X] T019 [P] [US3] Add to `tests/integration/enhance.test.js` a test that with `prefers-reduced-motion: reduce` videos are paused and gain `controls`, and with no preference they are untouched
- [X] T020 [US3] Add reduced-motion handling to `src/public/js/enhance.js`: when `matchMedia('(prefers-reduced-motion: reduce)')` matches, remove `autoplay`, pause every `video[autoplay]`, and set `controls`; also apply in the lightbox video
- [X] T021 [US3] Verify alt text is announced for videos (`aria-label` and fallback text) and that the video link stays keyboard-focusable with a visible focus outline; add an accessibility assertion in `tests/integration/accessibility.test.js`

**Checkpoint**: all stories functional.

## Phase 6: Polish

- [X] T022 Update README or docs mentioning supported upload types, if present
- [X] T023 Run `npm test`, `npm run test:nsfw` and `git diff --check`, then walk through `specs/012-animated-gif-video/quickstart.md`

## Dependencies & Execution Order

- Phase 2 blocks all stories. T003 depends on T002; T001 is needed by every upload test.
- US1 is independent of US2. US3 depends on US2 (video exists).
- Within a story: tests first and failing, then implementation. T010 → T011 → T012 → T013; T014–T016 parallel after T013.

## Parallel Examples

- T002 and T004 together; T005 with T008/T009; T014, T015, T016 together.

## Implementation Strategy

MVP is Phase 2 plus US1 (GIF); then US2 (video, the core new capability); then US3 hardening. Validate each checkpoint before continuing.


## Phase 6: Convergence

- [X] T024 Make the lightbox video in src/public/js/lightbox.js skip autoplay and show controls when prefers-reduced-motion is reduce, with a test in tests/integration/enhance.test.js, per FR-009 / SC-004 / US3/AC2 (partial)
- [X] T025 Resolve animated GIF handling under prefers-reduced-motion: either freeze GIF previews/originals in src/public/js/enhance.js and src/public/css/main.css, or document the limitation in specs/012-animated-gif-video/spec.md Assumptions, per FR-009 / SC-004 (partial)
