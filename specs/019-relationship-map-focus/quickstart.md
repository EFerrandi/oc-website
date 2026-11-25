# Quickstart: Relationship Map Focus and Sizing

## Prerequisites

- `npm install`; seed data with several characters and relationship clusters (and one very large network if possible).
- Automated checks: `npm test` and `npm run test:nsfw`.

## Automated

1. `npm test`: unit tests for fit, clamp, zoom, and focus-set math; interaction tests for focus classes and touch; integration tests for the responsive baseline markup.
2. `npm run test:nsfw`: rating isolation unchanged.

## Manual (see [contract](contracts/map-view-and-focus.md))

1. **Size**: open the global relationships page and a profile at 320px, 375px, and desktop. The whole network is visible and centered without horizontal scrolling; a two-character map is not enlarged.
2. **Large network**: with 100+ characters, the map opens at a readable avatar size, centered; panning reaches the rest, and zooming out to the minimum shows the whole network.
3. **Zoom**: press + and − repeatedly to both limits; the map never disappears. Reset returns to the initial view.
4. **Pan**: drag empty space to the edges; part of the map always stays visible. Dragging an avatar still moves only that avatar.
5. **Focus**: hover a character. Only it, its links, and its direct neighbors stay colored; everything else is gray. Move away to restore. Tab to a character for the same effect. With Labels off, only highlighted names appear during focus.
6. **Touch**: tap a character; its profile opens and no focus state is applied.
7. **Fullscreen**: enter and exit; the map refits and stays visible; focus and zoom still work.
8. **No JavaScript**: the map is fitted to the page width, with relationship details listed below.
9. **Reduced motion**: enable the preference; no transitions run.
