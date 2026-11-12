# Contract: UI changes

## Character listing tile (`/`)

```html
<li class="card character-tile">
  <a href="/characters/{slug}">
    <div class="card-thumb-frame">
      <img class="card-thumb" alt="..." style="...crop...">
    </div>
    <div class="card-body">
      <p class="card-name">...</p>
      <p class="card-jobs">...</p>
    </div>
  </a>
</li>
```

- The frame is square and clips its content; the image never paints outside it.
- Name and jobs are always rendered after the frame and are fully visible.
- The placeholder avatar uses the same frame.

## Admin dashboard (`/admin`)

- The chart renders SVG circles with class `statistics-slice` plus `statistics-sfw` or `statistics-nsfw`; each has a `<title>` such as `Name: 3 SFW images`.
- A legend near the chart lists "SFW" and "NSFW" with matching swatches.
- The accessible table, totals and percentages are unchanged.
- Per-character color classes (`statistics-color-N`) are removed.
