# Quickstart: Character Profile Descriptions

## Automated validation

Run `npm test` and `npm run test:nsfw`.

The integration coverage should prove:

- Both descriptions persist on character creation and edit, including clearing a value.
- Editing one value leaves the other unchanged.
- Existing characters without values still render.
- Non-empty sections appear in the required order immediately before Stories.
- Blank values omit their sections.
- Paragraph breaks are retained and text is escaped.

## Manual validation

1. Start the website and sign in to the admin area.
2. Create or edit a character and enter two paragraphs in each description.
3. Save, reopen the edit form, and confirm both values remain.
4. Open the public character page and confirm Personality then Physical Description appear immediately before Stories, with paragraph breaks preserved.
5. Clear one description, save, and confirm its section is omitted while the other remains.
6. Confirm a character with neither value continues to display without empty sections.
