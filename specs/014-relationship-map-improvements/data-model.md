# Data Model: Relationship Map Improvements

## Relationship (changed)

| Field | Type | Rule |
|---|---|---|
| `from_character_id` | integer | Required, existing character. For one-sided relationships this is the direction's source. |
| `to_character_id` | integer | Required, existing character, different from `from_character_id`. |
| `label` | text | Required, trimmed, non-empty; shown in full. |
| `is_nsfw` | 0/1 | Unchanged. |
| `is_one_sided` | 0/1, default 0 | New. 0 = two-sided (mutual), 1 = one-sided from `from` to `to`. |

### Validation and duplicates

- A character cannot be related to itself (unchanged).
- Two-sided: the pair (in either direction) plus label (case-insensitive, normalized) must be unique, as today.
- One-sided: the ordered pair plus label must be unique; the same label in the opposite direction is allowed as a separate one-sided relationship.
- A one-sided and a two-sided relationship with the same label between the same pair are duplicates.

### Migration

- `ALTER TABLE relationship ADD COLUMN is_one_sided ...` with default 0, so every existing row becomes two-sided.
- Drop `idx_relationship_unique_pair` and recreate it direction-aware as described in research R4.

### Transitions

- Two-sided to one-sided requires the admin to confirm the direction (from/to as selected).
- Swapping direction exchanges `from_character_id` and `to_character_id`.
- One-sided to two-sided keeps from/to; direction is no longer shown.

## Character (read only here)

The relationship map reads the designated avatar and `avatar_crop_x`, `avatar_crop_y`, `avatar_crop_zoom` for each endpoint character.
