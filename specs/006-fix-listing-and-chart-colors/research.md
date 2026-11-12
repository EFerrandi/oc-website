# Research: Listing Overlap and Chart Rating Colors

## Decision 1: Clip the avatar in a frame wrapper

- **Decision**: Wrap the tile `<img class="card-thumb">` in a `div.card-thumb-frame` with `overflow: hidden`, `aspect-ratio: 1 / 1`, and move the crop `transform` to stay on the image. Keep `.character-tile .card-thumb` as aspect-ratio 1/1, object-fit cover, width 100%.
- **Rationale**: `transform: scale()` does not affect layout and is not clipped by the image's own box, so the scaled image paints over the following sibling. A clipping parent fixes it for any zoom or offset. The profile avatar already uses this approach.
- **Alternatives**: `clip-path` on the image (less obvious, same effect); `overflow: hidden` on the whole tile link (also clips focus outlines and hover shadows); removing the zoom (breaks the crop feature).

## Decision 2: Split each character's slice into SFW and NSFW arcs

- **Decision**: In the route, produce for each character two consecutive arcs (SFW then NSFW), sized by count over the overall total, each with its rating. Render each as an SVG circle with a `statistics-sfw` or `statistics-nsfw` class. Skip zero-size arcs. Add a legend (swatch plus text).
- **Rationale**: Matches the clarified choice; keeps the existing technique; each arc gets a `<title>` naming character, rating and count.
- **Alternatives**: Single SFW vs NSFW pie (rejected in clarification); two charts (rejected).

## Decision 3: Colors

- **Decision**: Two fixed CSS custom properties, for example a teal-green for SFW and a magenta-pink for NSFW, both with sufficient contrast against the chart background and each other. Remove the per-character color classes. A thin separator stroke is not needed; the legend and table provide non-color cues.
- **Alternatives**: Opacity shading per character (needs many tones, hard to read).
