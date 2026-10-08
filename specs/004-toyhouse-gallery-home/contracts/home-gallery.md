# UI Contract: Home Gallery (`GET /`)

## Behaviour invariants

- Route, query parameter names (`gender`, `tag`, `trait`), filter semantics, result order, character destinations, and NSFW behaviour are unchanged.
- Visible characters, facets, and count come only from the existing rating-aware queries.
- Without JavaScript, every filter can be applied, removed, and cleared, and every disclosure section can be opened and closed.

## Page structure (source order)

1. `<h1>Original characters</h1>`, fixed introduction, and visible count.
2. Filter bar form (`method="get" action="/"`):
   - labelled gender select;
   - tags `<details>` (open only when a tag is active);
   - sins/virtues `<details>` (open only when a trait is active);
   - "Apply filters" submit control.
3. Results bar: count, removable chips for active filters, and "Clear all" when any filter is active.
4. Tile grid or empty state.

## Character tile

```text
<li class="card character-tile">
  <a href="/characters/{slug}">
    <img class="card-thumb" alt="...">
    <p class="card-name">{name}</p>
    <p class="card-jobs">{job titles}</p>   # omitted if none
  </a>
</li>
```

- Exactly one link per tile.
- No gender, tags, or sins/virtues inside the tile.
- Thumbnails are uniform squares and cover-cropped.

## Active filter chip

- Each chip is a link with an accessible name such as "Remove tag filter: cute".
- `removeHref` removes only that value and preserves all other applied filters.
- "Clear all" links to `/`.

## Empty state

When no characters match, show a clear message and a link to `/`.

## Visual and accessibility criteria

- Uses the dark-neutral purple tokens; no ToyHouse logos, artwork, wording, or assets.
- At least two tile columns at 320px; no page-level horizontal scrolling up to 1920px.
- Text and focus meet WCAG 2.1 AA; focus is visible for tiles, chips, summaries, and controls.
- Motion is decorative and disabled with `prefers-reduced-motion: reduce`.
