# Contract: Media Routes and Markup

## Routes (existing paths, extended)

| Route | Image | Video |
|---|---|---|
| `GET /media/:id` | Gated WebP preview (`image/webp`) | Gated original video bytes (`video/mp4` or `video/webm`) |
| `GET /media/:id/full` | Gated original | Same bytes as above |

- Hidden (NSFW without opt-in) or missing: `404` on both routes, identical body. Never 403.
- `Accept-Ranges: bytes`; a `Range` request returns `206` with `Content-Range`. The rating check applies before any range handling.
- NSFW: `Cache-Control: private, no-store`; SFW: `public, max-age=86400`.

## Upload (admin)

- Image form accepts PNG, JPEG, WebP, GIF, MP4, WebM, validated by content.
- Unrecognised content: validation error on the file field, no files written.
- Choosing a video as avatar: validation error on the avatar field.

## Markup

- Grid and character page video: `<video class="card-thumb" src="/media/ID" autoplay muted loop playsinline preload="metadata" aria-label="ALT">` inside the existing `a.preview-link`; fallback text and download link inside.
- Image page: same attributes plus `controls`, source `/media/ID/full`.
- Lightbox: `<video>` with `controls`, autoplay, loop, muted.
- Reduced motion: no autoplay; `controls` visible.
