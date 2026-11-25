# Quickstart: Validating the Relationship Map Redesign

## Prerequisites

- Install the existing project dependencies.
- Seed or create SFW and NSFW relationships, including disconnected groups, a mutual relationship, parallel relationships, and characters with different numbers of distinct visible neighbors.
- Start the site with `npm start`; open `/relationships` and a profile with visible relationships.

## Automated checks

```powershell
node --test tests/unit/relationship-map-model.test.js tests/unit/graph-layout.test.js tests/unit/planar-layout.test.js tests/unit/relationship-map-script.test.js
node --test tests/integration/relationship-map.test.js tests/integration/character-profile.test.js tests/integration/nsfw-character-relationships.test.js tests/integration/accessibility.test.js
npm test
npm run test:nsfw
git diff --check
```

Expected: global SFW/NSFW maps and profile maps use the same visual design; distinct visible-neighbor counts produce strictly increasing, bounded node sizes, including above the former radius cap, without parallel records inflating size; direction markers and parallel paths remain distinct; map labels, zoom, selection, and fullscreen controls work by pointer and keyboard; relationship details and profile links work without JavaScript; excluded rating content is absent; the existing layout performance target remains satisfied.

## Manual scenarios

1. Open both global maps and a profile map. Compare the dark teal canvas, curved gold paths, avatar nodes, cluster spacing, and lower-right control panel to the supplied reference.
2. Compare characters connected to different numbers of distinct visible characters and confirm the more-connected character has a larger avatar. Add parallel or reverse-direction records and confirm they do not inflate the size. Turn NSFW opt-in on and off and confirm hidden relationships do not affect SFW sizes.
3. Toggle Labels and confirm only visible character names change; nodes and relationships remain.
4. At a narrow viewport (including 320px), confirm all map controls fit within the visible map frame and the page has no horizontal overflow. Zoom in and out, enter fullscreen, select a relationship, and exit fullscreen; confirm the details and controls remain available throughout.
5. Select a relationship path with pointer and keyboard. Confirm the full details and endpoint identities are available; disable JavaScript and verify the server-rendered details and profile links remain usable.
6. Verify one-sided arrows and mutual-direction indicators, parallel paths, crossing-free fixtures, disconnected groups, and the profile empty state.

See [contracts/relationship-map.md](contracts/relationship-map.md) and [data-model.md](data-model.md).
