# Data Model

No persistent data changes.

## Derived chart data

At most two arcs: `{ rating: 'sfw' | 'nsfw', count, percentage, offset }`.

- SFW arc: `count = totals.sfw`, offset 0; NSFW arc: `count = totals.nsfw`, offset = SFW percentage.
- `percentage = count / totals.total * 100`; arcs with count 0 are omitted; no arcs when `totals.total` is 0.

## Character permissions (existing)

`can_regift`, `can_retrade`, `can_resell`: required booleans (stored 0 or 1). Display rule: submitted value if present, else stored value; `0` is a valid value shown as "Not allowed".
