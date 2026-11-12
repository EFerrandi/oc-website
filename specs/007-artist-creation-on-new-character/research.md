# Research

## Decision 1: Field names

- **Decision**: Selectors keep their names and gain a `new` option value. Designer: `artist_id=new` with `new_designer_name`, `new_designer_website_url`. First image: `image_artist_id=new` with `new_image_artist_name`, `new_image_artist_website_url`.
- **Rationale**: Mirrors the image upload form (`artist_id=new`, `new_artist_name`); distinct names let both selectors coexist and each error name its field.
- **Alternatives**: One shared pair of fields (cannot express two different new artists).

## Decision 2: Reuse versus reject on duplicate names

- **Decision**: On character creation, a new name matching an existing artist (`nameKey`, case-insensitive, trimmed) reuses it; two new entries with the same key create one artist. The image upload form keeps rejecting duplicates (FR-007).
- **Rationale**: The spec requires reuse here and unchanged upload behavior.
- **Alternatives**: Reject like the upload form (contradicts FR-003).

## Decision 3: Transactional resolution

- **Decision**: Validate everything (including new-artist name and URL) before storing the file; inside the existing `transaction`, resolve each new artist (find by `nameKey` or insert), then insert image and character with the resolved ids.
- **Rationale**: Follows `createCharacterWithImage`'s file-then-transaction-with-cleanup pattern, so any failure leaves no artist, character, image or file.
- **Alternatives**: Create artists first in separate calls (not atomic).

## Decision 4: Edit exclusion

- **Decision**: `characterFields` takes an `allowNewArtist` flag (false by default; only `character-new.njk` passes true). `validateCharacterInput` keeps requiring an existing artist, so `artist_id=new` on edit yields the normal "Choose an artist." error and creates nothing.
- **Rationale**: Smallest change; the server enforces exclusion regardless of the form.
- **Alternatives**: A separate designer partial (duplication).

## Decision 5: Shared URL parsing

- **Decision**: Extract the website parsing (http/https absolute, blank allowed) into `src/lib/artists.js` and use it from both services.
- **Rationale**: One rule for artist links, so the two forms cannot drift.
- **Alternatives**: Copy the code (drift risk).
