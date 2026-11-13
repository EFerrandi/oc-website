# Research: Relationship Map Improvements

## R1 - What exists today

- Dragging a character already exists (`src/public/js/relationship-map.js`, pointer events with capture) but only on character nodes, and the SVG has `touch-action: none` everywhere, which also blocks page scrolling on touch.
- The map's avatar already goes through `resolveAvatarForCharacterId` (designated avatar, with a rating-aware fallback to the oldest visible image), but the saved crop (`avatar_crop_x/y/zoom`) is not applied.
- Labels are cut with `truncate(24)` in `relationship-map.njk`; the full text is only in a `<title>` and the hidden text list.
- Relationships have no sidedness; the unique index is direction-independent (`pair_low`, `pair_high`, label).

## R2 - Dragging and panning

**Decision**: Keep pointer events. Add panning by changing the SVG `viewBox` origin when a mouse press starts on empty space (`event.pointerType === 'mouse'`). Set `touch-action: none` only on `.map-node` and `pan-y` on the SVG so touch on empty space scrolls the page. Ignore a click after a real drag (already present via the 4px threshold).

**Rationale**: The viewBox approach moves everything (nodes, edges, labels) without recomputing positions, and clamping bounds are the existing box. Touch behavior follows the clarification.

**Alternatives**: wrapping everything in a translated group (needs every handler to account for it); a pan library (new dependency, rejected by Constitution V).

## R3 - Full text

**Decision**: Wrap labels and names on the server into lines of a fixed maximum character count, break overlong words, and emit one `<tspan>` per line. The layout computes the line count so the viewBox height, edge label offsets and name spacing include the extra lines. The text equivalent already uses full text.

**Rationale**: SVG text does not wrap by itself; server-side wrapping keeps the no-JavaScript guarantee and keeps the bounding box invariant (I-M5).

**Alternatives**: `foreignObject` HTML (inconsistent browser support, harder to clamp); showing labels only on hover (violates the requirement).

## R4 - Sidedness storage

**Decision**: Add `is_one_sided INTEGER NOT NULL DEFAULT 0 CHECK (is_one_sided IN (0, 1))`. For one-sided rows `from_character_id` to `to_character_id` is the direction. Replace the unique index with one over `(CASE WHEN is_one_sided = 1 THEN from_character_id ELSE pair_low END, CASE WHEN is_one_sided = 1 THEN to_character_id ELSE pair_high END, is_one_sided, label COLLATE NOCASE)`. The service additionally rejects a two-sided relationship whose label already exists between the pair in any direction, and a one-sided one where a two-sided one with that label exists, because the index alone cannot compare across kinds.

**Rationale**: Matches the clarification: opposite one-sided relationships with the same label are allowed, the same direction and label is a duplicate. Existing rows default to two-sided with no behavior change.

**Alternatives**: a separate table (more joins for no gain); a direction column (redundant with from/to).

## R5 - Drawing direction

**Decision**: One-sided edges get an SVG `marker-end` arrowhead (defined once per map in `<defs>`). The client redraw keeps the arrow because the marker follows the path end. The curve sign in client redraw currently uses canonical id order; this stays valid because the path is still drawn from `from` to `to`.

**Alternatives**: drawing arrowheads as separate shapes (must be moved on drag).

## R6 - Avatar crop

**Decision**: Select `avatar_crop_x/y/zoom` with each endpoint, and apply them in the SVG as the image's `x`, `y`, `width`, `height` offsets inside the circular clip, matching how the gallery crops (object-position with scale). The designated avatar remains the source; the first image is used only as the existing fallback when the avatar is hidden by the rating setting.

**Rationale**: The request "use the avatar, not the first image" is satisfied by honoring the designated avatar and its crop everywhere on the map.
