# Quickstart: Validate the SFW Map Fix

## Automated

```powershell
node --test tests/unit/compact-layout.test.js tests/integration/relationship-map.test.js
npm test
npm run test:nsfw
```

Expect the new dense-network regression tests (35 characters, 57 unique pairs, non-planar) to pass: area within the bound, no link over an unrelated avatar, deterministic.

## Manual

1. Start the site with the real `data/oc.db` and open `/relationships`.
2. Confirm the SFW card shows avatars, names and labels on first load, at a size close to the NSFW card, with no long lines across the frame.
3. Press Reset and confirm it returns to the same view.
4. Tick the NSFW box and confirm the SFW map does not move; reload several times and confirm it is identical.
5. Confirm the NSFW map and a profile page map are unchanged.
6. Disable JavaScript and confirm the map and details list still render.

See [contracts/compact-layout.md](contracts/compact-layout.md) and [data-model.md](data-model.md).
