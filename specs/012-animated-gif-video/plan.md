# Implementation Plan: Autoplaying, Looping GIF and Video Media

**Branch**: `012-animated-gif-video` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-animated-gif-video/spec.md`

## Summary

Animated GIFs already upload and get an animated WebP preview; make looping explicit and verify it. Add MP4/WebM uploads, detected by file content, stored as-is with no preview file and no new dependencies. Render videos as `<video autoplay muted loop playsinline>` through the existing gated `/media` routes, with HTTP Range support for seeking. Show controls only in the full-size view. Honour `prefers-reduced-motion` by not autoplaying and showing controls. Refuse videos as avatars.

## Technical Context

**Language/Version**: JavaScript ES modules, Node.js 22+

**Primary Dependencies**: Existing Express 5, Nunjucks, multer, sharp, `node:sqlite`; no new dependencies

**Storage**: One forward-only migration (`006`) rebuilding `image` to widen the MIME check and make `preview_file_name`, `width`, `height` nullable (videos have none)

**Testing**: `node:test` and Supertest; `npm test`, `npm run test:nsfw`

**Target Platform**: Self-hosted web application, responsive

**Performance Goals**: Video starts via Range streaming without full download; grid videos use `preload="metadata"`

**Constraints**: Content-sniffed type (MP4 `ftyp`, WebM EBML header); existing upload ceiling (100 MB default); all bytes served only via gated `/media` routes; hidden media answers 404; NSFW responses `private, no-store`; no ffmpeg; videos not allowed as avatars; works without JavaScript (autoplay is attribute-based); reduced motion handled by a small enhancement script

**Scale/Scope**: upload service, record services, media route, image-preview partial, image page, lightbox, admin image forms, CSS, one migration, tests

## Constitution Check

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | Videos are served only by `/media/:id` and `/media/:id/full`, using the same `findVisibleImageById` check; Range responses keep 404-for-hidden and no-store. Uploads dir stays unmounted. |
| II. Data Integrity Through Invariants | PASS | Migration keeps all constraints and FKs and adds a CHECK that non-video rows keep preview and dimensions. |
| III. Works Without JavaScript | PASS | `autoplay muted loop playsinline` are HTML attributes; the image page has native controls; fallback text and download link inside `<video>`. JS only adds reduced-motion handling and lightbox. |
| IV. Test-First Where It Counts | PASS | Tests first for the NSFW gate on video and Range responses, content sniffing, rejection leaving no files, and avatar refusal. |
| V. Boring By Default | PASS | No ffmpeg or new packages; native `<video>` and Express `sendFile` Range support. |

### Post-Design Constitution Check

All principles remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/012-animated-gif-video/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── media-routes.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/migrations/006_video_media.sql        # new
├── lib/media-type.js                        # new: content sniffing, isVideo helper
├── services/images.js                       # accept video, skip sharp for video, loop GIF previews
├── services/image-records.js                # nullable preview/dimensions on create/delete
├── services/characters.js                   # avatar must not be a video
├── routes/public/media.js                   # video bytes on both routes
├── repositories/images.js                   # expose isVideo
├── views/partials/image-preview.njk         # <video> variant
├── views/pages/image.njk                    # <video controls> variant
├── views/admin/image-edit.njk               # video preview
├── public/js/lightbox.js                    # video in dialog
├── public/js/enhance.js                     # reduced motion handling
└── public/css/main.css                      # video sizing
tests/
├── unit/media-type.test.js
├── integration/video-media.test.js
└── integration/animated-gif.test.js
```

**Structure Decision**: Single server-rendered app; extend the existing image pipeline rather than adding a parallel video entity.
