# Quickstart: Validate the Compact Layout

## Automated

```powershell
npm test
npm run test:nsfw
```

Expect the new `tests/unit/compact-layout.test.js` and the updated layout and map integration tests to pass.

## Manual

1. Seed a network of about 30 characters with a hub, a chain and a separate pair, and open `/relationships`.
2. Confirm: linked characters sit close together, no ring shape, the hub is central, no large empty areas, and avatars look larger than before at the same window size.
3. Reload several times and confirm the arrangement is identical.
4. Tick the NSFW box and confirm the SFW map did not move.
5. Open a profile page and confirm its map is unchanged.
6. With 120 characters, confirm the page responds in under 1 s and zoom, pan, hover focus and Reset still work.
7. Disable JavaScript and confirm the map and the details list still render.
