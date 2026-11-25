# Research: Relationship Map Focus and Sizing

## R1: Why is the map too big?

- **Decision**: Render the SVG responsively (`width: 100%`, `max-width` equal to natural layout width, `aspect-ratio`, `max-height`) instead of fixed pixel `width`/`height` attributes.
- **Rationale**: The partial emits `width`/`height` equal to the full layout and the CSS uses `width: auto; min-width: 100%`, so a large layout renders at its full pixel size inside a scrolling frame.
- **Alternatives**: Re-lay out on the server for a smaller canvas (rejected: layout is deliberately spacious and rating-specific); scale with a CSS transform (rejected: breaks pointer coordinates).

## R2: Why does zooming make everything disappear?

- **Decision**: Separate fixed content bounds from a view `{center, scale}` and derive the `viewBox` from the view and the rendered box size, with absolute scale limits and a clamp that keeps the view center inside the content.
- **Rationale**: The current code rewrites the `viewBox` relative to itself, stores the zoomed window as the drag-clamp bounds, and has no absolute limits tied to the rendered box.
- **Alternatives**: CSS-only zoom via transforms (rejected: harder to keep pan and drag coordinates exact); a pan/zoom library (rejected: constitution V).

## R3: Minimum readable size for large networks

- **Decision**: Initial scale never drops below `MIN_READABLE_SCALE` of about 0.34, so the smallest avatar (48-unit radius) stays at least about 16 px across. The minimum zoom scale is lowered to the fitted scale so the whole network is always reachable.
- **Rationale**: Matches the clarified answer: fit down to a readable size, then pan; zooming out shows everything.
- **Alternatives**: Always fit (rejected by the user); taller map area (rejected by the user).

## R4: Highlighting and graying

- **Decision**: Compute a focus set from the edge list and toggle classes (`is-focus`, `is-dimmed`) on nodes and edge groups; CSS applies grayscale and opacity to dimmed items.
- **Rationale**: Pure class toggling is fast for 100 nodes and 300 edges, requires no re-layout, and keeps content in the DOM (rating filtering is already server-side).
- **Alternatives**: Re-render an SVG subset (rejected: slower and loses state); hide unrelated items (rejected: spec says grayed, not hidden).

## R5: Touch behavior

- **Decision**: Ignore `touch` pointer types for focus; taps follow the profile link.
- **Rationale**: Clarified answer: tap always opens the profile.
- **Alternatives**: First-tap-focuses (rejected by the user).

## R6: Zoom gestures

- **Decision**: Buttons zoom around the center; Ctrl/⌘+wheel and two-finger pinch zoom around the pointer; plain wheel is not captured.
- **Rationale**: Capturing plain wheel would trap page scrolling, especially on phones and on pages with several maps.
- **Alternatives**: Plain wheel zoom (rejected: scroll trap).
