# Data Model

## Character

Add two optional text attributes:

| Field | Storage | Validation / behavior |
|---|---|---|
| `personality` | Nullable text | Optional; trim outer whitespace; blank stores as null |
| `physical_description` | Nullable text | Optional; trim outer whitespace; blank stores as null |

Both fields belong directly to the character. Existing rows remain valid without a backfill and read as null. Updating one field must preserve the value submitted for the other; the standard character edit form submits both fields.

Descriptions are plain text. The public profile splits on blank lines into paragraphs and renders escaped text, preserving paragraph separation without accepting HTML.
