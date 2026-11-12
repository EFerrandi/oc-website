# Quickstart: Validate Artist Creation on New Character

## Prerequisites

`npm install`, then `npm test` passes before starting.

## Automated

- `npm test` and `npm run test:nsfw`.
- Tests cover: new designer and new image artist created with the character; shared name creates one artist; existing name (any case) reused; empty name and invalid URL give field-named errors with values kept; a failed submission (for example a missing image) leaves no artist, character or file; edit form has no new-artist option and a crafted `artist_id=new` creates nothing.

## Manual

1. `npm start`, sign in, open Add a character.
2. Pick "Add a new artist…" for both selectors, fill names and a website, complete the rest, submit.
3. Confirm the character, its image and the artists appear; the artists page lists each once.
4. Repeat with the same new name for both selectors, and with an existing artist's name in another case.
5. Submit with an empty new name: the error names the field and everything typed remains.
6. Open Edit character: no new-artist option.
7. Disable JavaScript and repeat step 2.
