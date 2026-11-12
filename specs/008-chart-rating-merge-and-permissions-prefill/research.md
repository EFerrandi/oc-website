# Research

## Decision 1: Two arcs from the overall totals

- **Decision**: Build `imageStatistics.chart` as at most two arcs, SFW then NSFW, using `totals.sfw` and `totals.nsfw` over `totals.total`; omit a zero arc. Titles become `SFW: N images` and `NSFW: N images`.
- **Rationale**: Directly yields two continuous regions that equal the displayed percentages; reuses the existing SVG circle technique and CSS colors.
- **Alternatives**: Sort per-character arcs by rating (keeps many arcs and separators, fails "2 continuous colors"); two charts (unneeded).

## Decision 2: Permission prefill

- **Decision**: In `character-fields.njk`, resolve each permission as the submitted value if present, otherwise the stored camelCase value, and compare as strings so `0` is a real value. In `character-edit.njk`/the route, make submitted `values` take priority over the stored `character` when redisplaying after an error.
- **Rationale**: The root cause is a name mismatch (`can_regift` in the form versus `canRegift` from the query) plus `0` falsiness; fixing the lookup is the smallest change and keeps the creation form (no stored value) with nothing preselected.
- **Alternatives**: Renaming query aliases (touches other consumers); a JavaScript prefill (violates works-without-JavaScript).
