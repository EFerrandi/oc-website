# Research: Prominent Admin Actions and Designer as First-Image Artist

## R-1: Where the "same artist" decision is applied

- **Decision**: Apply it in the service. `validateImageInput` takes a `sameAsDesigner` flag (checkbox `image_artist_same_as_designer`); when true it skips image-artist validation. `createCharacterWithImage` then uses the already-resolved designer id (existing, or created via `findOrCreateArtist`) as the image's artist.
- **Rationale**: The designer is resolved inside the transaction, so reusing that id guarantees a single artist record and keeps all-or-nothing behavior. `findOrCreateArtist` already deduplicates by name within one submission.
- **Alternatives**: Copying the designer into the image-artist fields in the browser (breaks without JavaScript); resolving in the route (splits validation from the transaction).

## R-2: Conflicting image-artist input

- **Decision**: When the box is ticked, ignore any image-artist selection and new-artist fields, and skip their validation.
- **Rationale**: Spec acceptance scenario 5; avoids a confusing error for hidden or stale fields.

## R-3: No-JavaScript behavior and state

- **Decision**: A plain checkbox, unchecked by default, re-rendered from submitted values after an error. `enhance.js` may hide the image-artist fields while ticked, with no-JS still working (the fields remain visible and are ignored).
- **Rationale**: Constitution III.

## R-4: Required attribute on the image-artist select

- **Decision**: Remove the HTML `required` on `image_artist_id`; server-side validation stays authoritative (required unless the box is ticked).
- **Rationale**: A browser-enforced `required` would block submission when the box is ticked without JavaScript.

## R-5: Button styling

- **Decision**: A new `.admin-actions` row of `.btn-action` links, using the existing `--accent` (violet) filled style, larger padding and font, wrapping on small screens; `--accent-ink` text on `--accent` for contrast (verified AA). The three buttons are differentiated by label only; a single color keeps the call to action consistent.
- **Rationale**: Reuses the palette; stands out against the dark surface and the existing outlined chips.
- **Alternatives**: A separate accent per button (inconsistent with the palette).

## R-6: Order

- **Decision**: Put the actions block directly after the `<h1>`, before the counts list and statistics.
