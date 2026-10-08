# Data Model: ToyHouse-Inspired Home Gallery

No persisted entities, fields, migrations, or invariants are added. The models below are transient presentation data for the home page.

## Character tile

Source: existing `characters` result from the rating-aware gallery query.

| Field | Source | Rules |
|---|---|---|
| `slug` | Character | Links to `/characters/{slug}`. |
| `name` | Character | Required visible text; long names wrap. |
| `jobTitles` | Character | All visible job titles, joined in their existing order. |
| `avatar` | Character | Visible preview only; otherwise the existing placeholder. |

Tiles must not display gender, tags, or sins/virtues (FR-001).

## Collection header

| Field | Source | Rules |
|---|---|---|
| `heading` | Fixed text | Exactly "Original characters". |
| `introduction` | Fixed text | One generic line; not admin-editable. |
| `count` | `characters.length` | Counts only characters rendered for this request (FR-008, FR-009). |

## Filter bar

| Field | Source | Rules |
|---|---|---|
| `genders` | Existing facets | Shown directly as a labelled select. |
| `tags` | Existing facets | In a collapsed disclosure unless a tag is active. |
| `traits.sins` / `traits.virtues` | Existing facets | In a collapsed sin/virtue disclosure unless a trait is active. |
| `applied` | Existing route state | Preserves current gender, tag, and trait values. |

## Active filter

| Field | Type | Rules |
|---|---|---|
| `kind` | `gender`, `tag`, or `trait` | Identifies the existing query parameter. |
| `label` | string | The visitor-facing value, escaped by the template. |
| `removeHref` | string | `/` plus all current filters except this exact value. |

### Lifecycle

1. The route normalises current query parameters as it does today.
2. The route builds one `ActiveFilter` per applied value.
3. Each chip links to a new GET URL without that value.
4. "Clear all" links to `/`.
