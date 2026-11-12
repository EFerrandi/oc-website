# Data Model: Character Profile and Tag Filters

No data model changes are required.

## Existing Entities

- **Character profile**: Already exposes optional `personality`, `physicalDescription`, and `relationships` values for rendering. This feature changes only their order and text presentation.
- **Listing filter selection**: Existing URL query values represent gender and one or more tags. The filter form submits these values to the existing listing route; the feature adds no persisted state.

## Validation and State

- No new fields, validation rules, persistence, lifecycle transitions, or entity relationships.
- The server-rendered query state remains the source of truth after each submission.
