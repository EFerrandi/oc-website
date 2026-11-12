# Data Model

No persistent data changes.

## Derived view data: chart arcs

Computed in the dashboard route from the existing image statistics (per-character `total`, `sfw`, `nsfw`; overall `totals.total`).

| Field | Description |
|---|---|
| `name` | Character name |
| `rating` | `sfw` or `nsfw` |
| `count` | Images of that rating for that character |
| `percentage` | `count / totals.total * 100` |
| `offset` | Cumulative percentage before this arc |

Rules:
- Arcs ordered by character, SFW then NSFW.
- Arcs with `count` 0 are omitted.
- Sum of arc percentages equals 100 when `totals.total > 0`, and the chart shows no arcs when it is 0.
