# Data Model: Modern Interface & Interactive Relationship Map

**Feature**: `002-modern-ui-relationship-map` | **Date**: 2026-10-01

## Schema changes

**None.** No table, column, index, or constraint is added, altered, or dropped. **No migration file is created.**

This follows from clarification FR-020 (the map resets on reload and positions are never stored) and from R-008 (the character page's avatar and story bodies are already fetched by existing queries and merely discarded by the current templates).

The existing entities — `character`, `relationship`, `story`, `image`, `character_story` — are consumed unchanged through the existing repository functions.

## View-model entities

These exist only in memory, between the repository call and the template. They are never persisted.

### MapNode

One character drawn on one map.

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Character id. Used as the SVG element key and the drag script's handle. |
| `name` | string | Character name. The node's accessible name. |
| `slug` | string | Target of the node's link to the character detail page (FR-005). |
| `avatarUrl` | string | `/media/:imageId` for a viewable avatar, otherwise `/img/placeholder-avatar.svg` (FR-010, FR-011). |
| `avatarAlt` | string | Alternative text; the image's alt text when available, otherwise the character's name. |
| `x`, `y` | number | Position within the map's coordinate space, produced by the layout. |

### MapEdge

One relationship drawn on one map.

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Relationship id. |
| `fromId`, `toId` | integer | The two `MapNode` ids this edge joins. |
| `label` | string | Relationship label, rendered at the curve midpoint (FR-003). |
| `curveOffset` | number | `0` for the first edge between a pair; alternating non-zero values for each additional edge between the same pair (FR-006, R-005). |
| `labelX`, `labelY` | number | Midpoint of the edge's curve, derived from endpoints and `curveOffset`. |

### MapLayout

One complete map — there are exactly two per page request, `sfw` and `nsfw`.

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | MapNode[] | Possibly empty. |
| `edges` | MapEdge[] | Possibly empty. |
| `width`, `height` | number | The SVG `viewBox` extent, sized to contain every node and label (FR-015). |
| `crossings` | integer | Crossing count of the chosen arrangement. Exposed for testing FR-012/SC-003. |

### Component

Internal to `src/lib/graph-layout.js`; never reaches a template. A set of node ids mutually reachable through edges, used to place unrelated groups apart (FR-014).

## Invariants

Each invariant has exactly one enforcement point, per Constitution Principle II.

### I-M1 — Nodes are derived only from visible edges (NON-NEGOTIABLE)

A `MapNode` may be created **only** for a character appearing as an endpoint of an edge already present in the rating-filtered relationship list. The character table is never consulted to populate the map.

**Why this is stated as an invariant rather than left implicit**: a node carries the character's name and an avatar URL. Emitting a node for a character the visitor may not see would disclose that character's existence and name even if `/media/:id` subsequently returned 404 for the avatar. The gate on the image is not sufficient on its own; the node itself is the leak.

This also implements FR-004 (characters with no visible relationship are absent from the map) — the two requirements are the same rule seen from two directions.

**Enforcement point**: the view-model builder in `src/routes/public/relationships.js`, which walks `cards.sfw` / `cards.nsfw` and collects endpoints. There is no other code path that constructs a `MapNode`.

**Verified by**: a test asserting that a character who appears only in NSFW relationships has neither their name nor their avatar id anywhere in the response body before opt-in.

### I-M2 — The two maps are built independently

The `sfw` and `nsfw` layouts are computed from disjoint edge sets and do not share node position state. A character appearing in both maps is drawn once per map, at independently chosen positions.

**Why**: sharing positions between the maps would make the SFW map's arrangement depend on NSFW data, which would make the SFW map's rendered coordinates a side channel revealing how many NSFW relationships exist.

**Enforcement point**: `layoutGraph()` is called twice with separate inputs and holds no state between calls (it is a pure function).

### I-M3 — The layout function is pure and deterministic

`layoutGraph(nodes, edges)` depends on nothing but its arguments — no clock, no randomness, no environment, no I/O. Identical input yields byte-identical output.

**Why**: FR-013 and SC-004 require a stable arrangement, and R-001 moved layout to the server specifically so that stability is guaranteed rather than timing-dependent.

**Enforcement point**: `src/lib/graph-layout.js` imports nothing. Its position in `src/lib/` rather than in a repository or service is itself part of the enforcement — it has no access to the database or request.

**Verified by**: a unit test running the same input repeatedly and asserting deep equality.

### I-M4 — Chosen arrangement never scores worse than naive

The ordering selected for a component has a crossing count less than or equal to that of the name-ordered arrangement of the same component.

**Why**: this is FR-012 and the second half of SC-003.

**Enforcement point**: the naive ordering is always included in the candidate set, and the candidate with the lowest exact crossing count is selected (R-003, R-004). The property therefore holds by construction and cannot be broken by tuning the other candidates.

### I-M5 — Everything stays inside the viewBox

Every node centre, every node radius, and every label anchor lies within `[0, width] × [0, height]`, both in the default arrangement (FR-015) and after any drag (FR-018).

**Enforcement points**: two, because there are two ways a position is produced — `layoutGraph()` sizes the box to its content for the default arrangement, and `relationship-map.js` clamps to the box on every pointer move and key press. This is a deliberate duplication of the rule across the server and client paths and is documented here so a later change does not remove one believing the other covers it.

## Rating-filtering data flow

```text
GET /relationships
  └─ res.locals.showNsfw                  (existing middleware, src/middleware/nsfw.js)
       └─ listRelationshipCards(db, { showNsfw })     (existing, filters in SQL)
            ├─ cards.sfw   → buildMapModel → layoutGraph → MapLayout  (always populated)
            └─ cards.nsfw  → buildMapModel → layoutGraph → MapLayout  (EMPTY unless opted in)
                 └─ render pages/relationships.njk
```

The NSFW layout's `nodes` and `edges` arrays are **empty before the template is reached** when the visitor has not opted in, because the SQL query already excluded those rows. Nothing is rendered and then hidden — which is the distinction Constitution Principle I draws between a real gate and a cosmetic one.

## Character detail page

No new entity. The page consumes fields that `findCharacterBySlug` already returns and the current template ignores:

| Already available | Currently | Required by |
|-------------------|-----------|-------------|
| `character.avatar` | fetched, never rendered | FR-037, FR-039 |
| `character.stories[].body` | fetched, never rendered — the template links to `/stories/:slug` instead | FR-041 |

Both are already rating-filtered by the existing queries (`resolveEffectiveAvatar` and `listStoriesForCharacter` both take `showNsfw`), so FR-042 is satisfied by the data layer and the template simply renders what it is given.
