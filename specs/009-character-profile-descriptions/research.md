# Research

## Decision 1: Persist descriptions as nullable plain text

- **Decision**: Add nullable `personality` and `physical_description` columns to `character` in a new ordered migration. Treat null and whitespace-only submissions as empty; do not make either field required.
- **Rationale**: Existing characters need to remain valid, and the feature explicitly makes both values optional. The application's existing migration runner discovers SQL migrations in filename order.
- **Alternatives considered**: A separate description table adds joins and complexity for two fields owned by one character.

## Decision 2: Reuse the character form and service

- **Decision**: Add textareas to the shared character fields macro, accept the fields in existing character validation, and include them in existing create/update operations. Include values in character repository results and the admin edit query.
- **Rationale**: Both create and edit already share a server-rendered form and character service; reusing them keeps validation and persistence consistent.
- **Alternatives considered**: A separate edit flow duplicates existing CRUD behavior.

## Decision 3: Render escaped paragraph text

- **Decision**: On the character profile, render each non-empty description in its own titled section between Relationships and Stories. Split paragraphs on blank lines and render each as an ordinary escaped paragraph.
- **Rationale**: This preserves text paragraph structure without treating entered content as trusted HTML. The current character-story template uses the same paragraph convention.
- **Alternatives considered**: HTML input/rendering increases the risk of unsafe markup; a single preformatted block does not match the existing profile presentation.

## Decision 4: No new endpoint or rating behavior

- **Decision**: Use the existing admin POST routes and public character page. Descriptions are plain profile text and receive no separate SFW/NSFW rating.
- **Rationale**: The request only adds descriptive fields; no new content access path is needed.
- **Alternatives considered**: A separate endpoint or rating flag is out of scope and introduces unnecessary behavior.
