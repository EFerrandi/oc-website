# Data Model: Prominent Admin Actions and Designer as First-Image Artist

No schema change and no new entities.

## Form input (not persisted)

| Field | Type | Rule |
|---|---|---|
| `image_artist_same_as_designer` | checkbox, "1" when ticked, absent otherwise | Off by default. When on, `image_artist_id`, `new_image_artist_name` and `new_image_artist_website_url` are ignored and not validated. |

## Effects on existing entities

- **Image.artist_id** is set to the character's designer artist id when the box is ticked.
- **Artist**: if the designer is entered as new, exactly one artist row is created and used for both roles. If a new designer name matches an existing artist case-insensitively, the existing row is reused (existing behavior).
- **Invariants preserved**: every image has an artist; every character has a designer; the character, its first image and any new artist are created in one transaction, with stored files removed on failure.
