# Data Model: Autoplaying, Looping GIF and Video Media

## Image (changed)

| Field | Before | After |
|---|---|---|
| `mime_type` | png, jpeg, webp, gif | also `video/mp4`, `video/webm` |
| `preview_file_name` | NOT NULL UNIQUE | nullable, UNIQUE; NULL for videos |
| `width`, `height` | NOT NULL | nullable; NULL for videos |

**Invariant**: if `mime_type` starts with `video/`, `preview_file_name`, `width`, `height` are NULL; otherwise all three are NOT NULL (table CHECK).

**Derived**: `isVideo` (mime starts with `video/`) and `isAnimated` (GIF) are computed in the repository/view layer; no stored kind column.

**Unchanged**: alt text, short description, artist, rating, character links. A video can never be a character's avatar (enforced in the service layer).

**Migration**: `006_video_media.sql`, forward-only, rebuilds `image` preserving ids, FKs (`character.avatar_image_id`, `character_image.image_id`) and data.
