# Phase 1 Data Model: OC Photo Gallery Website

**Feature**: `001-oc-photo-gallery` | **Date**: 2026-09-23 | **Storage**: SQLite (`data/oc.db`)

Every connection sets `PRAGMA foreign_keys = ON` (SQLite defaults it off) and `PRAGMA journal_mode = WAL`.

Conventions: integer primary keys; `created_at` / `updated_at` stored as ISO-8601 UTC text; booleans as `INTEGER` `0`/`1` with `CHECK` constraints; name uniqueness via `COLLATE NOCASE` unique indexes (see research R-011).

---

## Entity overview

```text
gender ──1:N──> character <──N:1── designer
                   │  │
                   │  ├──N:M── tag          (character_tag)     ≥1 required
                   │  ├──N:M── trait        (character_trait)   optional
                   │  ├──N:M── image        (character_image)   ≥1 required
                   │  └──N:M── story        (character_story)   optional
                   │
                   └──N:M── character        (relationship, rated SFW/NSFW)

image ──N:1──> artist
```

---

## Tables

### `gender`

Reusable, admin-managed list of gender values (FR-043).

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL, unique `COLLATE NOCASE` |
| `created_at` | TEXT | NOT NULL |

- Referenced by `character.gender_id` with `ON DELETE RESTRICT` → deletion refused while in use (FR-044).

### `designer`

Reusable credit record for character designs (FR-045).

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL, unique `COLLATE NOCASE` |
| `website_url` | TEXT | NULL allowed |
| `created_at`, `updated_at` | TEXT | NOT NULL |

- `website_url`, when present, must parse as an absolute `http`/`https` URL; otherwise the name renders as plain text (FR-005).
- Referenced by `character.designer_id` with `ON DELETE RESTRICT` (FR-046).
- Editing name/url propagates automatically because characters reference the row, not a copy (FR-047).

### `artist`

Reusable credit record for images, and the grouping key of the artists page (FR-045, FR-036).

Same columns and rules as `designer`. Referenced by `image.artist_id` with `ON DELETE RESTRICT`.

### `tag`

Reusable label used for gallery filtering.

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL, unique `COLLATE NOCASE` |
| `created_at` | TEXT | NOT NULL |

- `character_tag.tag_id` uses `ON DELETE RESTRICT`: a tag in use cannot be deleted, because every character requires at least one tag (FR-041).

### `trait`

Reusable sin or virtue (FR-057). Deliberately **not** symmetrical with `tag` on delete.

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL, unique `COLLATE NOCASE` |
| `kind` | TEXT | NOT NULL, `CHECK (kind IN ('sin','virtue'))` |
| `created_at`, `updated_at` | TEXT | NOT NULL |

- Uniqueness is on `name` **alone**, not `(name, kind)`: FR-059 makes a name a duplicate regardless of its marking.
- `kind` is mutable — re-classification is allowed and propagates to all carriers (FR-058, FR-061).
- `character_trait.trait_id` uses `ON DELETE CASCADE`: deleting a trait removes it from its characters instead of being blocked, because traits are optional (FR-060, FR-062).

### `character`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `name` | TEXT | NOT NULL, non-empty after trim |
| `slug` | TEXT | NOT NULL, unique — URL identifier derived from name |
| `gender_id` | INTEGER | NOT NULL, FK → `gender(id)` `ON DELETE RESTRICT` |
| `short_description` | TEXT | NOT NULL, non-empty |
| `terms_of_use` | TEXT | NOT NULL, non-empty |
| `can_regift` | INTEGER | NOT NULL, `CHECK (IN (0,1))` |
| `can_retrade` | INTEGER | NOT NULL, `CHECK (IN (0,1))` |
| `can_resell` | INTEGER | NOT NULL, `CHECK (IN (0,1))` |
| `designer_id` | INTEGER | NOT NULL, FK → `designer(id)` `ON DELETE RESTRICT` |
| `avatar_image_id` | INTEGER | NULL, FK → `image(id)` `ON DELETE SET NULL` |
| `created_at`, `updated_at` | TEXT | NOT NULL |

- `avatar_image_id` is nullable only to break the circular insert (character before its first image) inside the creation transaction; it is set before that transaction commits and must reference an image linked to this character.
- Permissions are three independent flags (Assumptions), complementing the free-text `terms_of_use`.

### `character_job_title`

Ordered list; a character requires at least one (FR-041).

| Column | Type | Constraints |
|---|---|---|
| `character_id` | INTEGER | FK → `character(id)` `ON DELETE CASCADE` |
| `title` | TEXT | NOT NULL, non-empty |
| `position` | INTEGER | NOT NULL — preserves admin-entered order |

PK `(character_id, position)`.

### `image`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `file_name` | TEXT | NOT NULL, unique — generated, never the uploaded name |
| `mime_type` | TEXT | NOT NULL, one of `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| `byte_size` | INTEGER | NOT NULL — size of the original |
| `preview_file_name` | TEXT | NOT NULL, unique — generated preview copy (FR-068) |
| `width`, `height` | INTEGER | NOT NULL — original pixel dimensions, used to reserve layout space |
| `alt_text` | TEXT | NOT NULL, non-empty (SC-006) |
| `short_description` | TEXT | NULL allowed |
| `artist_id` | INTEGER | NOT NULL, FK → `artist(id)` `ON DELETE RESTRICT` (FR-042) |
| `is_nsfw` | INTEGER | NOT NULL, `CHECK (IN (0,1))`, default `0` |
| `created_at`, `updated_at` | TEXT | NOT NULL |

- Files live at `data/uploads/<file_name>` with previews at `data/uploads/previews/<preview_file_name>`, and both are served **only** through the `/media/:id` routes so the rating check applies to the bytes of either variant (research R-006, R-017; FR-070).
- `preview_file_name` is NOT NULL: FR-068 requires the preview to exist before the record is committed, so an image can never be stored without one. When the original is already within the preview cap it is copied rather than upscaled (FR-069), so this column is still populated.
- `alt_text` is mandatory: SC-006 requires 100% coverage.

### `story`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `title` | TEXT | NOT NULL, non-empty |
| `slug` | TEXT | NOT NULL, unique |
| `body` | TEXT | NOT NULL, non-empty |
| `is_nsfw` | INTEGER | NOT NULL, `CHECK (IN (0,1))`, default `0` |
| `created_at`, `updated_at` | TEXT | NOT NULL |

### `relationship`

A rated connection between two distinct characters (FR-024).

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PK |
| `from_character_id` | INTEGER | NOT NULL, FK → `character(id)` `ON DELETE CASCADE` |
| `to_character_id` | INTEGER | NOT NULL, FK → `character(id)` `ON DELETE CASCADE` |
| `label` | TEXT | NOT NULL, non-empty — free text (Assumptions) |
| `is_nsfw` | INTEGER | NOT NULL, `CHECK (IN (0,1))`, default `0` |
| `created_at`, `updated_at` | TEXT | NOT NULL |

- `CHECK (from_character_id <> to_character_id)` rejects self-references (FR-028).
- Unique index on `(LEAST(from,to), GREATEST(from,to), label COLLATE NOCASE)` — stored as generated `pair_low` / `pair_high` columns since SQLite lacks `LEAST`/`GREATEST` — so the same pair with the same label cannot be entered twice in either direction (FR-028).
- A relationship is undirected for display: it appears on both characters' detail pages.
- One rating per row; a pair may hold both an SFW and an NSFW relationship as separate rows (Assumptions).

---

## Join tables

| Table | Columns | Delete behaviour | Notes |
|---|---|---|---|
| `character_tag` | `character_id`, `tag_id` | character → CASCADE; tag → **RESTRICT** | ≥1 per character (FR-041) |
| `character_trait` | `character_id`, `trait_id` | both → **CASCADE** | optional (FR-060, FR-062) |
| `character_image` | `character_id`, `image_id`, `position` | both → CASCADE | ≥1 per character; an image needs ≥1 character (FR-025) |
| `character_story` | `character_id`, `story_id` | both → CASCADE | story needs ≥1 character (FR-025) |

Each uses a composite primary key, plus an index on the second column for reverse lookups.

> **The tag/trait asymmetry is intentional and is the single most important rule in this model.** Deleting a tag that is in use is refused; deleting a trait that is in use succeeds and simply detaches it. This follows directly from tags being mandatory on a character and traits being optional.

---

## Invariants enforced above the schema

Foreign keys and `CHECK` constraints cannot express these, so the service layer enforces them inside the relevant transaction:

| # | Invariant | Requirement |
|---|---|---|
| I-1 | A character always has ≥1 linked image | FR-041, FR-051 |
| I-2 | A character always has ≥1 tag | FR-041 |
| I-3 | A character always has ≥1 job title | FR-041 |
| I-4 | An image is always linked to ≥1 character | FR-025, Edge Cases |
| I-5 | A story is always linked to ≥1 character | FR-025, Edge Cases |
| I-6 | `avatar_image_id` references an image linked to that same character | FR-026 |
| I-7 | Character + first image are created atomically or not at all | FR-049, FR-050 |
| I-8 | Deleting a character preserves images/stories still linked elsewhere | FR-029 |
| I-9 | Every image row has a readable preview file on disk; the original and its preview are created and deleted together | FR-068, Edge Cases |

I-8 requires a post-delete sweep within the same transaction: after the character's link rows cascade away, any image or story left with zero links is removed along with its file; anything still linked to another character is untouched.

---

## Derived values (computed per request, not stored)

| Value | Rule | Requirement |
|---|---|---|
| Effective avatar | designated avatar if visible at current rating → else oldest visible linked image → else static placeholder | FR-014, R-014 |
| Visible images / stories / relationships | `WHERE is_nsfw = 0` unless the visitor opted in | FR-009, FR-010 |
| Facet lists (tags, genders, traits) | derived from the currently visible, currently filtered character set — never from the full taxonomy tables | FR-016, FR-040, FR-056, R-013 |
| Artist groups | artists having ≥1 visible image; artists with none are omitted entirely | FR-036, FR-037 |

---

## Indexes

Beyond primary keys and the `COLLATE NOCASE` name indexes:

- `character(slug)`, `story(slug)` — unique, for URL lookups
- `character(gender_id)` — gender filter
- `image(artist_id)` — artists page grouping
- `image(is_nsfw)`, `story(is_nsfw)`, `relationship(is_nsfw)` — rating filters
- `character_tag(tag_id)`, `character_trait(trait_id)`, `character_image(image_id)`, `character_story(story_id)` — reverse lookups
- `relationship(from_character_id)`, `relationship(to_character_id)` — detail-page lookups

At the stated scale (hundreds of characters, thousands of images) these keep every page a sub-millisecond query set, comfortably inside SC-003 and SC-004.

---

## Migrations

Ordered SQL files in `src/db/migrations/` (`001_initial.sql`, …), applied in filename order by a runner that records applied names in a `schema_migration` table and executes each inside a transaction. Forward-only; no down-migrations for a single-admin personal site.
