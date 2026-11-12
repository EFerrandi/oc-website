# Research: Visible Tags and Preserved Line Breaks

## Existing Project Patterns

### Decision: Keep gender and character tags as separate filter controls in one always-visible area

- **Rationale**: The existing listing already models gender as a single-select radio group and tags as multi-select checkboxes, with the server and URL using separate `gender` and repeated `tag` parameters. Showing both groups together satisfies the discovery request without changing data identity, selection semantics, or filtering logic.
- **Alternatives considered**: Merge gender into the reusable tag model or turn gender into multi-select values. Both would change existing data and semantics beyond the request.

### Decision: Submit the existing GET form on both gender and tag changes

- **Rationale**: The current enhancement script already submits forms on change for another preference. Submitting the existing gallery form sends the selected gender and checked tags together to the existing server-side filter and keeps the URL shareable. Without JavaScript, the existing submit button continues to work.
- **Alternatives considered**: Client-side filtering duplicates server logic; retaining a collapsed tag section conflicts with the requested always-visible choices.

### Decision: Normalize line endings and preserve both single and blank-line breaks in the affected text

- **Rationale**: Character descriptions currently split only on blank lines, story bodies are split on blank lines without normalizing CRLF/CR, and terms of use rely on CSS `white-space: pre-line`. A consistent display treatment should normalize line endings and retain line boundaries for descriptions, story bodies, and terms while continuing to render escaped text.
- **Alternatives considered**: Convert only blank lines to paragraph boundaries, which loses single line breaks; interpret authored text as HTML, which is unsafe and unnecessary.

### Decision: Do not apply line-break treatment to short image descriptions

- **Rationale**: The user clarified the included text fields as character descriptions, stories, and terms of use. Image short descriptions, labels, and truncated previews are explicitly out of scope.
- **Alternatives considered**: Reformat all text on the site; this would change compact card and label layouts without being requested.

### Decision: Reuse existing rated story delivery paths

- **Rationale**: Story content appears both inline on a character profile and on its own story page, and the server already filters rated stories before rendering. Keep the existing route and visibility checks, changing only formatting of content already allowed for the visitor.
- **Alternatives considered**: Add a new content endpoint or deliver hidden rated content for client-side display; both are unnecessary and risk violating the content-rating guarantee.
