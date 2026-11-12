# Research: Character Profile and Tag Filters

## Existing Project Patterns

### Decision: Keep tag filtering as a progressive enhancement of the GET form

- **Rationale**: `src/views/partials/filters.njk` already represents selected gender and tags as native form controls, submits with GET to `/`, and includes an Apply filters button. The server already renders selected filters and result state from the URL. `src/public/js/enhance.js` is loaded with `defer` from `src/views/layout.njk` and already enhances a native form while preserving its fallback.
- **Alternatives considered**: Replace the server-rendered filters with client-side filtering, or make tag state inaccessible without script. Both conflict with Constitution III and add unnecessary complexity.

### Decision: Submit the existing form when a tag checkbox changes

- **Rationale**: Submitting the form sends all checked tags and current gender together, allowing the existing server-side filtering and URL state to remain authoritative. With JavaScript disabled, the unchanged submit button continues to work.
- **Alternatives considered**: Submit on gender changes too, which changes explicitly out-of-scope behavior; add a client-side filtering engine, which duplicates server logic.

### Decision: Reuse the story body’s paragraph presentation for descriptions without collapsible controls

- **Rationale**: Story paragraphs use a readable maximum text width and paragraph spacing. The user clarified that descriptions should remain visible and match text styling only.
- **Alternatives considered**: Wrap descriptions in `<details>` like stories. This would hide requested character information until interaction and contradict the clarification.

### Decision: No data model or API changes

- **Rationale**: Personality, Physical Description, Relationships, and listing filters already exist. The requested work changes presentation and interaction only.
- **Alternatives considered**: None required; modifying storage or routes would exceed the stated behavior.
