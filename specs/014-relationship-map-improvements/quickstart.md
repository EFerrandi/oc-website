# Quickstart: Validating Relationship Map Improvements

## Prerequisites

- `npm install` done; run `npm start` (or `npm run dev`) and sign in to `/admin`.

## Automated checks

```powershell
npm test
npm run test:nsfw
```

Expected: all pass, including the new tests for migration `007`, sidedness and duplicate rules, full-text rendering, avatar crop, the rating gate with one-sided relationships, and the client script (drag and pan).

## Manual scenarios

1. **Dragging**: on `/relationships`, press and hold the mouse on a character, drag, release. It stays; its lines and labels followed; the character page did not open. A plain click still opens it.
2. **Panning**: press and drag on empty space with the mouse; the whole map moves. On a phone or emulator, dragging empty space scrolls the page; dragging a character moves it.
3. **Full text**: in `/admin/relationships`, add a relationship with a 100-character label between two characters (and one with a long character name); the map shows every character, wrapped over lines, nothing hidden by an avatar.
4. **Sidedness**: add one one-sided and one two-sided relationship; the first has an arrowhead pointing to the "To" character, the second none. The text equivalent and the character page state the sidedness. Add the same one-sided label in the opposite direction: allowed. Repeat it in the same direction: refused with a field error.
5. **Existing data**: relationships that existed before the migration look unchanged (two-sided).
6. **Avatar**: set a character's avatar to a non-first image and a crop; the map shows that avatar and crop. Turn NSFW off with an NSFW-only avatar: the placeholder or fallback shows, never the hidden image.
7. **No JavaScript**: disable JavaScript; the map, arrows and wrapped text are still there.

See [contracts/relationship-map.md](contracts/relationship-map.md) and [data-model.md](data-model.md).
