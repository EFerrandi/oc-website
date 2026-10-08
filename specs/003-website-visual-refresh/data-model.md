# Data Model: Website-Wide Visual Refresh

**Feature**: `003-website-visual-refresh`

This feature introduces no persistent entities, fields, relationships, migrations, or state transitions.

## Presentation Concepts

| Concept | Description | Persistence |
|---|---|---|
| Brand palette | Three selected purple colors used as accents within the dark-neutral theme | CSS only |
| Design tokens | Shared colors, spacing, typography, radii, and elevation values | CSS only |
| Interface surface | Existing public/admin pages and their components | Existing templates and styles |
| Visual state | Existing hover, focus, selected, disabled, error, success, and empty states | CSS presentation of existing state |

## Invariants

- **V-M1 — Behavior preservation**: Refreshing a surface does not change its route, displayed data, form field names, form method or destination, access conditions, or available action.
- **V-M2 — Rating preservation**: Styling does not deliver, reveal, or identify content that the server has withheld under the current NSFW preference.
- **V-M3 — Contrast by pair**: Brand colors are not presumed accessible in every role; each foreground/background combination must meet the applicable contrast target.
- **V-M4 — Semantic order**: Visual placement does not contradict the reading and keyboard navigation order of the document.
- **V-M5 — Responsive bounds**: Page-level content remains within the viewport from 320px through 1920px; a component may scroll internally only where its existing interaction requires it.

No database or API contract changes are part of this feature.
