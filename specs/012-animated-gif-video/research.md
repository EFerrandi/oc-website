# Research: Autoplaying, Looping GIF and Video Media

## R-001 Video storage without transcoding
- **Decision**: Store MP4/WebM as uploaded, with no preview file and no poster.
- **Rationale**: Clarified: browser shows the first frame. Avoids ffmpeg (Constitution V).
- **Alternatives**: ffmpeg poster/transcode (new system dependency); separate poster upload (extra admin work).

## R-002 Type detection
- **Decision**: Sniff magic bytes: MP4 has `ftyp` at bytes 4–8; WebM starts with EBML `1A 45 DF A3`. Canonical MIME is derived from the sniffed type, ignoring the client's MIME.
- **Rationale**: Constitution requires validation by content. Content that is neither a sharp-readable image nor a sniffed video is rejected.
- **Alternatives**: Trust multer MIME (spoofable).

## R-003 Schema
- **Decision**: Migration 006 rebuilds `image` (with `@requires-foreign-keys-off`, same approach as 002): CHECK widened to `video/mp4`, `video/webm`; `preview_file_name`, `width`, `height` nullable; CHECK that non-video rows keep all three. Existing `UNIQUE` on `preview_file_name` still permits multiple NULLs.
- **Rationale**: SQLite cannot alter a CHECK in place.
- **Alternatives**: Fake preview name and 0 dimensions (violates integrity); new `video` table (duplicates joins, artist grouping, rating).

## R-004 Serving and seeking
- **Decision**: `/media/:id` serves the video bytes for videos (no preview) and `/media/:id/full` the same; both through `res.sendFile`, which supports `Range` and returns 206. Cache headers unchanged (`private, no-store` for NSFW).
- **Rationale**: One gated path, no static mount.
- **Alternatives**: Separate `/video` route (second gate to keep in sync).

## R-005 Markup and autoplay
- **Decision**: `<video autoplay muted loop playsinline preload="metadata">` in grids; `controls` added on the image page and lightbox. Fallback content: alt text and download link. Reduced motion: `enhance.js` removes autoplay by pausing and adds `controls` when `matchMedia('(prefers-reduced-motion: reduce)')` matches. Without JS, autoplay still works.
- **Rationale**: Browsers only allow autoplay when muted; attributes work without JS.
- **Alternatives**: CSS-only reduced-motion cannot pause video.

## R-006 Animated GIF
- **Decision**: Keep the sharp `animated: true` WebP preview, set `loop: 0` so previews loop forever; verify frame count in tests. Full view serves the original GIF untouched.
- **Rationale**: Already mostly works; verify with a multi-frame fixture, including that resizing an animated image keeps correct dimensions. A finite-loop GIF original loops per its own setting in full view (browser behaviour, noted as a limitation).
- **Alternatives**: Serve the original GIF everywhere (heavy pages).

## R-007 Avatars
- **Decision**: Videos are refused as avatars server-side; the avatar select lists only non-video images; the automatic first-image avatar choice skips videos, and a character whose images are all videos shows the placeholder avatar.
- **Rationale**: Avatars use cropped still thumbnails (FR-010).
- **Alternatives**: Animated avatar videos (cropping complexity).

## R-008 Upload size
- **Decision**: Keep the 100 MB default ceiling.
