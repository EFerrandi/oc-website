# Contract: UI changes

## Admin dashboard (`/admin`)

- The chart contains at most two `circle.statistics-slice` elements: `statistics-sfw` then `statistics-nsfw`.
- Titles: `SFW: N images` and `NSFW: N images`.
- Legend, per-character table, totals and percentages are unchanged.

## Character edit form (`/admin/characters/:id/edit`)

- Each permission radio group (`can_regift`, `can_retrade`, `can_resell`) has the saved choice `checked` (value `1` Allowed, value `0` Not allowed).
- After a validation error (422) the submitted choices are `checked` instead.
- Saving without touching permissions leaves them unchanged.

## Character creation form (`/admin/characters/new`)

- No permission radio is checked initially.
