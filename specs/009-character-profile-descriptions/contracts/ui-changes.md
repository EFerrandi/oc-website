# UI Contract Changes

## Admin character create/edit forms

- Add optional multiline text fields labelled `Personality` and `Physical description`.
- Both fields are editable on character creation and editing.
- Blank values are accepted and clear the corresponding saved value.
- On validation failure, entered values are redisplayed.
- Editing one field does not clear or modify the other.

## Public character profile

- After Relationships and immediately before Stories, render a `Personality` section followed by a `Physical Description` section when each corresponding value is non-empty.
- Render paragraphs separately, preserving blank-line paragraph breaks.
- Render as escaped plain text; do not interpret submitted HTML.
- Omit a section when its field is blank.

## Persistence

- Existing characters without values continue to load and render normally.
- No new public endpoint, content-rating control, or external interface is introduced.
