# Quickstart: Validating Relationship Map Interaction and Layout

## Prerequisites

- Dependencies are installed.
- Run the site with `npm start` and open `/relationships`.
- To test dense maps, use the admin relationship form to create several relationships and long labels, or use the existing integration fixtures.

## Automated checks

```powershell
npm test
npm run test:nsfw
git diff --check
```

Expected: all tests pass, including face-only dragging, click-versus-drag navigation, no background or keyboard movement, keyboard link activation, stacked sections, larger layout geometry, complete text, confined map scrolling, and unchanged NSFW filtering.

## Manual scenarios

1. **Face drag**: drag a character by its avatar. Only that character moves; all its lines and labels follow. Releasing after a drag does not open its profile.
2. **Plain activation**: click or tap a face without moving, then activate a character name. Both open the character page.
3. **No alternate movement**: drag the empty background and press arrow/Shift+arrow keys on a focused character. No character or map position changes.
4. **Keyboard navigation**: use Tab to focus character links and Enter to open one. Confirm a visible focus indicator remains.
5. **Vertical order**: at desktop and phone widths, the entire SFW section precedes the NSFW section.
6. **Legibility**: confirm the larger faces and typography, full long names and labels, and that dense maps can scroll inside their own frame without the page itself overflowing horizontally.
7. **Rating and no JavaScript**: with NSFW off, confirm existing filtered content remains absent. Disable JavaScript and confirm maps, labels, text equivalents, and character links remain available.

See [contracts/relationship-map.md](contracts/relationship-map.md) and [data-model.md](data-model.md).
