# Quickstart: Validating Character Relationship Views

## Prerequisites

- Dependencies are installed.
- Start the site with `npm start` and open `/relationships` and a character profile with visible relationships.
- Use a fixture with several connections, a pair with multiple relationships, and at least one unrelated edge to validate crossing reduction and emphasis.

## Automated checks

```powershell
node --test tests/unit/graph-layout.test.js tests/unit/planar-layout.test.js tests/unit/relationship-map-script.test.js
node --test tests/integration/character-profile.test.js tests/integration/nsfw-character-relationships.test.js tests/integration/relationship-map.test.js tests/integration/relationship-map-avatar.test.js tests/integration/relationship-map-text.test.js
npm test
npm run test:nsfw
git diff --check
```

Expected: profile diagrams are centered on their character and contain every directly related visible character and relationship; planar layouts have no crossings in the final routed paths, including curves used for parallel relationships, and their complete labels remain separated and in bounds; non-planar layouts do not exceed the deterministic input-order baseline; hover and keyboard focus emphasize incident edges only; NSFW-only nodes and labels remain absent before opt-in; all graph data remains server-rendered.

## Manual scenarios

1. Open a character with several relationships. Confirm its avatar is centered, related faces and names appear around it, and clicking a related character opens that profile.
2. Open a profile with no currently visible relationships and confirm the explicit empty state.
3. Compare global and profile diagrams for crossing-free fixture graphs and a dense graph; confirm the global K4 case has no crossings and the non-planar fallback does not exceed the baseline.
4. Hover a node with both related and unrelated edges. Confirm only incident edges and labels are highlighted, while other edges remain visible. Repeat using keyboard focus.
5. Tab to a related-character link and press Enter; confirm the existing profile navigation and visible focus are preserved.
6. Turn off NSFW opt-in and verify no NSFW-only character, relationship label, or accessible text appears on either page. Repeat after opt-in.
7. Disable JavaScript and confirm profile and global diagrams, names, labels, text alternatives, and links remain available.
8. Test a narrow viewport and confirm any diagram scrolling stays inside its frame while the rest of the page remains within viewport width.

See [contracts/relationship-views.md](contracts/relationship-views.md) and [data-model.md](data-model.md).
