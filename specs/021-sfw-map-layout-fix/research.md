# Research: Readable SFW Relationship Map

## Reproduction

Opening `data/oc.db` read-only and running the SFW card through `buildMapModel`, `compactPositions` and `layoutGraph`:

| Map | Characters | Relationships | Planar | Result size |
|---|---|---|---|---|
| SFW | 35 | 68 (57 unique pairs, max degree 11) | no | about 8640 x 8900 px |
| NSFW | 16 | 22 | yes (groups) | about 1240 x 1870 px |

Baseline ring for SFW: 20700 x 16700 px, 121 crossings.

Instrumenting `relax` (temporary, reverted) showed the stressed candidates are about 1800 to 2900 px wide with 17 to 364 crossings, but 4 to 64 links over avatars against an allowed 0, so all were rejected and `rescaled()` ran.

## Decisions

**Decision 1: Replace the "no more links over avatars than the baseline" guard with a repair step plus a best-candidate choice.**
Rationale: the baseline ring is clean only because it is enormous. Repairing the few offending links by moving the blocking avatar sideways keeps the "no link over an unrelated avatar" rule while keeping the drawing compact.
Alternatives: (a) accept links over avatars, rejected because it breaks FR-006; (b) draw the offending links as curves around the avatar, rejected as larger change in `graph-layout.js` and curves add visual clutter; (c) lower the avatar size for dense maps, rejected because it changes the look and FR-006.

**Decision 2: Choose the best accepted candidate instead of the first.**
Rationale: order of preference is currently fragile; scoring by (links over avatars, crossings, area) is deterministic and covers other shapes.
Alternatives: keep first-accepted order, rejected because it hides better candidates.

**Decision 3: Zero crossings only when cheap (FR-009).**
Rationale: user clarification. Planar components keep the planar drawing when it is at most 2x the area of the compact candidate; beyond that, compactness wins and crossings are accepted.
Alternatives: fixed character/relationship limits, rejected in the clarification in favour of the area rule.

**Decision 4: No client or template change.**
Rationale: `fitView` works; it only looked broken because the drawing was huge.
