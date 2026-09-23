# Contract: Admin HTTP Routes

**Feature**: `001-oc-photo-gallery` | **Audience**: the single admin (FR-020) | **Response type**: `text/html`

## Access control

Every route under `/admin` except the sign-in pages requires an authenticated session. An unauthenticated request receives `303` to `/admin/login?return_to=<original path>` — never a rendered admin screen and never a partial action (FR-020, SC-007).

Every state-changing request (`POST`, and any method-overridden `PUT`/`DELETE`) requires a valid CSRF token bound to the session. A missing or mismatched token yields `403` and performs no write (research R-009).

Session cookie: `httpOnly`, `sameSite=lax`, `secure` in production, rolling idle expiry (FR-031).

---

## Authentication

### `GET /admin/login`
Renders the sign-in form. Already signed in → `303` to `/admin`.

### `POST /admin/login`
**Body**: `password`, `csrf_token`, optional `return_to`.

| Outcome | Response |
|---|---|
| Correct password | Session regenerated (fixation defence), `303` to `return_to` if same-origin, else `/admin` |
| Incorrect password | `401`, generic "invalid credentials" message, no detail about which part failed |
| Too many failed attempts | `429` — throttled per IP (FR-031) |

The password is verified against a `scrypt` hash held in an environment variable using a timing-safe comparison. It is never stored in the database or in source (research R-008).

### `POST /admin/logout`
Destroys the session and clears the cookie; `303` to `/`. Admin screens are inaccessible immediately afterwards (FR-030).

---

## Characters

Full character create/edit/delete (FR-021).

### `GET /admin/characters`
Lists all characters with edit and delete controls.

### `GET /admin/characters/new`
Combined create form: character fields **plus the first image upload** in one form (FR-049).

### `POST /admin/characters`
Creates a character and its first image **atomically** (FR-049, FR-050).

**Body** (`multipart/form-data`):

| Field | Required | Notes |
|---|---|---|
| `name` | yes | non-empty after trim |
| `gender_id` | yes | must exist in the managed gender list (FR-043) |
| `short_description` | yes | non-empty |
| `job_title[]` | yes, ≥1 | order preserved |
| `terms_of_use` | yes | non-empty |
| `can_regift`, `can_retrade`, `can_resell` | yes | each explicitly allowed / not allowed |
| `designer_id` | yes | must exist |
| `tag_id[]` | yes, ≥1 | FR-041 |
| `trait_id[]` | **no** | zero or more; traits are optional (FR-060) |
| `image` | yes | the file |
| `image_alt_text` | yes | non-empty (SC-006) |
| `image_artist_id` | yes | FR-042 |
| `image_short_description` | no | |
| `image_is_nsfw` | no | defaults to SFW |

| Outcome | Response |
|---|---|
| Valid | `303` to `/admin/characters/:id/edit`; character appears publicly immediately (FR-032) |
| Any field invalid | `422`, form re-rendered with the submitted values and a message naming **each** offending field (FR-027) |
| Image rejected (type, magic bytes, size) | `422`; the temporary file is deleted (research R-010) |

**Atomicity**: on any failure, *neither* the character *nor* the image exists afterwards, and no orphaned file remains on disk (FR-050).

### `GET /admin/characters/:id/edit`
Edit form, including the character's linked images, stories, traits, tags, and relationships.

### `POST /admin/characters/:id`
Updates the character. Same validation as creation, except the image fields are absent.

- Rejects removal of the last image, last tag, or last job title, and any attempt to clear the designer, a permission, or the terms of use (FR-041, FR-051, invariants I-1…I-3).
- Traits may be reduced to zero without error (FR-060).
- `avatar_image_id` must reference an image linked to this character (FR-026, invariant I-6).
- Valid → `303` back to the edit page; changes are live publicly at once (FR-032).

### `POST /admin/characters/:id/delete`
Requires `confirm_name` to match the character's name — an explicit confirmation naming the item (FR-053).

- Images and stories still linked to another character **survive**; those left with zero links are removed together with their files (FR-029, invariant I-8).
- The character's relationships are removed.
- Deletion is permanent; there is no archive or undo (Assumptions).

---

## Images

Full image upload/edit/delete (FR-022).

### `GET /admin/images`, `GET /admin/images/new`, `GET /admin/images/:id/edit`
List and form screens.

### `POST /admin/images`
**Body** (`multipart/form-data`): `image`, `alt_text` (required), `artist_id` (**required**, FR-042), `short_description` (optional), `is_nsfw`, `character_id[]` (**≥1 required**, invariant I-4).

| Outcome | Response |
|---|---|
| Valid | `303`; image appears on **every** linked character's detail page subject to rating (FR-025, SC-008) |
| No artist selected | `422` naming the missing artist (FR-042) |
| Unsupported type / above the 100 MB ceiling / magic-byte mismatch | `422`, temporary file deleted, no record created (FR-027, FR-067) |
| Preview generation fails | `422`, original and any partial preview deleted, no record created (FR-068) |
| No character linked | `422` |

### `POST /admin/images/:id`
Updates metadata and character links. Rejects unlinking the last character (invariant I-4) and rejects removing the link that would leave a character with no images (FR-051).

### `POST /admin/images/:id/delete`
Requires explicit confirmation (FR-053). Refused if it would leave any linked character with zero images (FR-051). On success the file is removed from disk.

---

## Stories

### `POST /admin/stories`
**Body**: `title`, `body`, `is_nsfw`, `character_id[]` (≥1 required, invariant I-5). Appears on every linked character's detail page subject to rating (FR-023, FR-025).

### `POST /admin/stories/:id` / `POST /admin/stories/:id/delete`
Update and delete; deletion requires explicit confirmation (FR-053).

---

## Relationships

### `POST /admin/relationships`
**Body**: `from_character_id`, `to_character_id`, `label`, `is_nsfw`.

| Outcome | Response |
|---|---|
| Valid | `303`; appears on both detail pages and in the matching card on `/relationships` (FR-024) |
| Same character on both sides | `422` (FR-028) |
| Same pair **and** same label already exists, in either direction | `422` (FR-028) |

### `POST /admin/relationships/:id` / `POST /admin/relationships/:id/delete`
Update and delete; deletion requires explicit confirmation.

---

## Taxonomy management

Shared shape for tags, traits, genders, artists, and designers: `GET /admin/<kind>` lists, `POST /admin/<kind>` creates, `POST /admin/<kind>/:id` updates, `POST /admin/<kind>/:id/delete` deletes after explicit confirmation.

Names are trimmed and internal whitespace runs collapsed before saving. A name colliding with an existing one, ignoring case and surrounding whitespace, yields `422` (FR-048, FR-059).

| Kind | Extra fields | Delete behaviour |
|---|---|---|
| `tags` | — | **`409` if in use** — tags are mandatory on characters (FR-041) |
| `traits` | `kind` ∈ `sin` \| `virtue`, mutable (FR-058) | **Succeeds when in use**; the trait is detached from its characters (FR-062) |
| `genders` | — | `409` if assigned to any character (FR-044) |
| `artists` | `website_url` optional | `409` if referenced by any image (FR-046) |
| `designers` | `website_url` optional | `409` if referenced by any character (FR-046) |

> **The tag/trait delete asymmetry is intentional**, and is the rule most likely to be "corrected" into a bug: deleting an in-use tag is refused because every character needs at least one, while deleting an in-use trait succeeds because traits are optional.

**Trait uniqueness**: collision is on the name **alone**. `Greed (sin)` blocks creating `greed (virtue)` (FR-059).

**Propagation**: renaming or re-classifying a trait updates every character carrying it and the gallery trait filter (FR-061). Editing an artist or designer updates every credit that references it (FR-047). This is automatic — rows are referenced, never copied.

### `POST /admin/traits/:id`
**Body**: `name`, `kind`. Changing `kind` moves the trait between the `Sins` and `Virtues` headings everywhere it appears (FR-058, FR-061).

---

## Validation and error conventions

| Status | Meaning |
|---|---|
| `303` | Success; always redirect after a successful write (no double-submit on refresh) |
| `422` | Validation failure — form re-rendered with submitted values and per-field messages (FR-027) |
| `409` | Refused because another record still depends on it |
| `403` | Missing or invalid CSRF token |
| `401` | Bad credentials |
| `429` | Sign-in throttled (FR-031) |
| `404` | Unknown record |

No validation failure ever leaves a partial record or an orphaned uploaded file (FR-027, FR-050).
