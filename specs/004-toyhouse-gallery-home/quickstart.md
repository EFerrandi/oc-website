# Quickstart: ToyHouse-Inspired Home Gallery

## Prerequisites

```powershell
npm install
npm run seed
npm run dev
```

Open <http://localhost:3000/> in a desktop browser.

## Automated validation

```powershell
node --test tests/contract/gallery.test.js tests/integration/accessibility.test.js
npm run test:nsfw
node --test tests/integration/route-audit.test.js
npm test
```

Expected: all tests pass, with no relaxed rating assertions.

## Scenarios

1. **Header and count**: With NSFW off, confirm the page shows "Original characters", the fixed introduction, and a count matching the visible tiles. Turn NSFW on and confirm only newly visible characters change the count.
2. **Tile grid**: Confirm every tile has a same-size square thumbnail, the name, and job titles only. Activate a tile with mouse and keyboard; each opens the matching character.
3. **Filter bar**: Confirm gender and "Apply filters" are visible. Tag and sin/virtue sections start collapsed, then open with mouse and keyboard.
4. **Active filters**: Apply a gender and a tag. Confirm both chips appear; remove one and confirm the other remains in the URL and results. Use "Clear all" to return to `/`.
5. **Empty state**: Visit a URL with an unmatched filter and confirm the message and clear link appear.
6. **No JavaScript**: Disable JavaScript and repeat scenarios 3–5.
7. **Responsive**: Check widths 320, 768, 1280, and 1920px. Confirm no page-level horizontal scrolling, at least two columns at 320px, uniform thumbnails, and at least 10 visible tiles at 1280px when the seed data has 10 or more characters.
8. **Accessibility**: Tab through filter controls, summaries, chips, and tiles; focus is always visible. Confirm contrast with browser tools and that motion stops with reduced motion enabled.

See [contracts/home-gallery.md](contracts/home-gallery.md) for structural requirements.
