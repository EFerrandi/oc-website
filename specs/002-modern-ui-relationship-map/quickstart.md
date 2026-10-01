# Quickstart: Modern Interface & Interactive Relationship Map

**Feature**: `002-modern-ui-relationship-map` | **Date**: 2026-10-01

Runnable validation for this feature. Commands are PowerShell, run from the repository root.

## Prerequisites

```powershell
npm install
```

A `.env` file with `SESSION_SECRET` and `ADMIN_PASSWORD_HASH` is required to run the server (not needed for the test suite, which supplies its own config).

> Write `.env` with Node, not PowerShell — `Set-Content` wraps the 168-character scrypt hash across lines and corrupts it.

```powershell
npm run migrate
npm run seed
```

The seed provides 3 characters, 3 images, 1 story, and 2 relationships — enough to exercise the map, including one NSFW relationship for gating checks.

## Baseline before starting

Both must pass before any change, so a later failure is attributable.

```powershell
npm test          # expect 129 passing
npm run test:nsfw # expect 25 passing
```

## Scenario 1 — The map is delivered already drawn (FR-021, SC-006)

The decisive check for Constitution Principle III: the layout must be in the HTML, not computed in the browser.

```powershell
curl.exe -s http://localhost:3000/relationships | Select-String -Pattern 'class="map-node"','transform="translate','map-edge-label'
```

**Expected**: all three present, with literal numeric coordinates in the `transform` attributes. Nothing here depends on JavaScript having run.

Then disable JavaScript in the browser and reload `/relationships`. **Expected**: identical map, identical positions; only dragging stops working.

## Scenario 2 — Rating gate on the map (FR-009, G-1 to G-6)

```powershell
# Without opt-in
curl.exe -s http://localhost:3000/relationships | Select-String -Pattern 'Shadow','nsfw'

# With opt-in
curl.exe -s -H "Cookie: nsfw=1" http://localhost:3000/relationships | Select-String -Pattern 'Shadow'
```

**Expected**: the NSFW character's name appears **only** in the second. Before opt-in the NSFW map contains no node, no edge, no coordinate, and no avatar URL — the invitation to tick the box is the only thing in it.

Also confirm `Vary: Cookie`:

```powershell
curl.exe -s -D - -o NUL http://localhost:3000/relationships | Select-String -Pattern 'Vary'
```

## Scenario 3 — Layout determinism (FR-013, SC-004)

```powershell
1..10 | ForEach-Object { (curl.exe -s http://localhost:3000/relationships | Select-String -Pattern 'translate\([^)]*\)' -AllMatches).Matches.Value -join '|' } | Select-Object -Unique
```

**Expected**: exactly one distinct line. More than one means something non-deterministic — a clock, a hash iteration order, or randomness — leaked into `layoutGraph`.

## Scenario 4 — Crossing minimisation (FR-012, I-M4)

```powershell
node --test tests/unit/graph-layout.test.js
```

**Expected**: passes, including the assertions that a forest lays out with 0 crossings and that no input produces more crossings than the name-ordered arrangement.

## Scenario 5 — Dragging (FR-016 to FR-019)

In a browser at `/relationships`:

1. Drag an avatar across the map. **Expected**: it follows the pointer; every attached line stays joined at both ends and each label stays at its midpoint.
2. Release. **Expected**: it stays put.
3. Drag hard past the edge. **Expected**: it clamps inside the map; it never escapes.
4. Tab to an avatar, press the arrow keys. **Expected**: it moves, and the keys are described in visible text near the map.
5. Click an avatar without moving. **Expected**: navigates to the character page.
6. Drag an avatar and release over empty space. **Expected**: **no** navigation — the drag was not a click.
7. Reload. **Expected**: the default arrangement returns.
8. Repeat 1–3 by touch on a phone-width viewport.

## Scenario 6 — Character profile (FR-037 to FR-043)

Open `/characters/aria`.

**Expected**: avatar at top left with name, gender, job titles, description, tags, sins and virtues, designer, terms, and permissions beside it; then images; then stories. Each story shows its title and opening lines, and expands in place to the full text. No link is needed to read a story.

Without JavaScript: the story still expands — `<details>` is native.

At 320 px width: avatar and summary stack; no horizontal scrolling.

Without the opt-in, confirm the NSFW story leaks nothing:

```powershell
curl.exe -s http://localhost:3000/characters/shadow | Select-String -Pattern 'After Hours'
```

**Expected**: no match — neither the title nor any fragment of the body.

## Scenario 7 — Admin delete (FR-022 to FR-027)

1. Sign in at `/admin/login`.
2. Open `/admin/characters`. **Expected**: a clearly marked delete control on each row.
3. Activate it. **Expected**: lands on the edit page's delete section.
4. Submit a wrong name. **Expected**: `422`, the character is **not** deleted, and the message names the field.
5. Submit the exact name. **Expected**: `303` to `/admin/characters`; the character is gone.
6. Reload `/relationships`. **Expected**: the character and all its lines are absent from both maps.
7. Sign out and load any public page. **Expected**: no delete control anywhere.

## Scenario 8 — Return to admin (FR-028 to FR-030)

Signed in, on any public page: a control returning to the admin area is visible in the header, beside the sign-out control, and the NSFW checkbox has not moved. One activation reaches `/admin`.

Signed out: the control is absent and only "Admin sign in" shows.

## Scenario 9 — Interface refresh (FR-031 to FR-036, SC-011, SC-013)

Across `/`, `/characters/:slug`, `/relationships`, `/artists`, and the admin pages, at 320, 768, 1024, and 1920 px: no horizontal scrolling, no overlap, consistent spacing and type, visible focus on every control reached by Tab, and AA contrast.

With styling disabled, every page remains readable and operable in document order.

## Scenario 10 — Scale (SC-007)

```powershell
node --test tests/unit/graph-layout.test.js tests/integration/scale.test.js
```

**Expected**: the 100-character / 300-relationship layout completes well inside the page-render budget. Seed large data inside `transaction(db, ...)` — 1,000 individual commits take ~8s against ~200ms batched.

## Final gate

```powershell
npm test
npm run test:nsfw
```

**Expected**: every pre-existing test still passes **unchanged**, plus the new suites. Needing to edit existing assertions to make the refresh pass means the refresh exceeded what FR-032 permits — that is the practical test for SC-013.

`npm run test:nsfw` must include the new relationship-map rating suite; add it to the script in `package.json` (Constitution Principle IV).
