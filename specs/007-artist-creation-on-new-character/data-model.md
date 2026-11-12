# Data Model

No schema change.

## Artist (existing)

- `name` (unique ignoring case and surrounding whitespace), `website_url` (nullable absolute http/https URL).

## New-artist submission (transient)

| Source | Selector value | Name field | Website field |
|---|---|---|---|
| Designer | `artist_id = new` | `new_designer_name` | `new_designer_website_url` |
| First image | `image_artist_id = new` | `new_image_artist_name` | `new_image_artist_website_url` |

### Validation

- Name required when the selector is `new` (error on the name field).
- Website optional; must parse as an absolute http/https URL (error on the website field).
- Resolution: match an existing artist by `nameKey`; otherwise insert. Both selectors with the same key resolve to one row.

### State

All writes (artists, image, character, links) occur in one transaction; on failure, nothing persists and stored image files are deleted.
