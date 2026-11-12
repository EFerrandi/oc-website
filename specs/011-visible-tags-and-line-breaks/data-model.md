# Data Model: Visible Tags and Preserved Line Breaks

No schema, persistence, or entity relationship changes are required.

## Existing Entities

- **Gender filter choice**: Existing single-select filter represented by the `gender` query value and the set of available gender facets.
- **Character tag filter choice**: Existing multi-select filter represented by repeated `tag` query values and reusable character tags.
- **Multiline authored text**:
  - Character `personality` and `physical_description`.
  - Story body text, shown inline and on the standalone story page.
  - Character `terms_of_use`.

## Presentation Rules

- Preserve the distinct gender and tag query parameters and their existing server-side interpretation.
- Normalize CRLF, LF, and CR into consistent line boundaries during display.
- Preserve single line breaks and blank-line paragraph spacing as text presentation, not HTML input.
- Do not alter image short descriptions, labels, or truncated previews.
- No new validation, lifecycle, persistence, or uniqueness constraints.
