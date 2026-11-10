# Data Model: Gallery and Admin Enhancements

**Feature**: `005-gallery-admin-enhancements`

The current schema is defined in `src/db/migrations/001_initial.sql`. Apply changes in a new forward-only migration. Preserve all existing image files and image-character associations.

## Canonical artist

The `artist` entity becomes the single creator identity for artwork and character designs.

| Field | Rule |
|---|---|
| `id` | Existing integer primary key |
| `name` | Required, unique case-insensitively after normalization |
| `website_url` | Optional absolute HTTP(S) URL |
| `created_at`, `updated_at` | Existing timestamp rules |

Character design credits refer to an artist ID; image credits continue to refer to an artist ID. Remove the distinct `designer` entity after data migration.

### Designer migration mapping

1. Normalize legacy designer and artist names by trimming and collapsing internal whitespace; compare case-insensitively.
2. If a matching artist exists, retain its ID and URL. If its URL is empty and the designer URL is non-empty, copy the designer URL.
3. If there is no matching artist, create one from the designer's name and URL.
4. Repoint each character design credit to the canonical artist ID.
5. Consolidate case-insensitive duplicate artist rows if encountered, preserving image links and the selected canonical URL.
6. Remove designer rows/table only after all character references are valid.

## Tag

`tag` becomes the single character-label taxonomy, including values formerly in `trait`.

| Field | Rule |
|---|---|
| `id` | Existing integer primary key where possible |
| `name` | Required, unique case-insensitively after normalization |
| `created_at` | Required |

For migration, trait names that match an existing tag reuse that tag. Otherwise create a tag. Union trait and tag memberships in `character_tag` and deduplicate `(character_id, tag_id)` pairs. Remove `character_trait` and `trait` after checking every old association was preserved. Former sin/virtue classification is intentionally not retained.

## Character

Existing character attributes remain. Replace `designer_id` with `artist_id` referencing `artist(id)` with `ON DELETE RESTRICT`.

Add crop settings for the designated avatar assignment:

| Field | Type | Rule |
|---|---|---|
| `avatar_crop_x` | REAL | NOT NULL, between 0 and 100 inclusive; default 50 |
| `avatar_crop_y` | REAL | NOT NULL, between 0 and 100 inclusive; default 50 |
| `avatar_crop_zoom` | REAL | NOT NULL, between 1.0 and 3.0 inclusive; default 1.0 |

Crop coordinates are character-specific, affect only the designated avatar presentation, and do not modify source files. Avatar view data includes crop settings only when the effective avatar is the designated avatar; fallback images use the centered default.

## Image-character association statistics

Image statistics are derived from `character_image` joined to `image`; they are not stored.

| Result | Definition |
|---|---|
| Per-character total | Number of linked image records for the character |
| Per-character SFW | Linked images with `is_nsfw = 0` |
| Per-character NSFW | Linked images with `is_nsfw = 1` |
| Overall total | Number of image-character associations, not distinct image rows |
| Overall SFW / NSFW | Number of associations by image rating |
| SFW / NSFW percentage | Each rating association count divided by overall association count; both 0% if total is zero |

An image linked to multiple characters contributes once per association. The chart uses per-character total counts; an accessible table gives each character's total, SFW, and NSFW values.

## Image upload and artist creation

Artist creation and image record creation are one transaction. File storage occurs through the existing upload service; if the database transaction fails after storage, both original and preview files are removed. A failed validation or duplicate artist name creates neither an image nor an artist.

## Authorization and visibility

- Ownership fields (design artist credit, terms, and transfer permissions) are provided to and rendered for the authenticated admin only.
- Dashboard statistics are served only behind the existing admin authorization boundary.
- Public artist image lists remain rating-filtered. No new media-serving path is created.
- Avatar crops do not bypass the existing rating-aware avatar resolution or media gate.

## Invariants

1. Every character's design credit references an existing canonical artist.
2. Every existing image credit and design credit survives consolidation.
3. Every former trait-character association maps to a tag-character association.
4. Tag associations remain unique per character and tag.
5. The existing required-tag rule for characters remains in force.
6. An artist upload either creates artist and image records together or creates neither; stored files are cleaned up on failure.
7. Avatar crop values are valid, square, and scoped to one character; the source image is unchanged.
8. Anonymous responses contain no ownership or admin statistics.
9. Public image and avatar bytes continue to obey the server-side NSFW gate.
