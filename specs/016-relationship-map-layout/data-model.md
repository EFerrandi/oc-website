# Data Model: Relationship Map Interaction and Layout

## Persistence

No database migration or persistent model change is required. Character and relationship data remain unchanged.

## Runtime View Model

### Relationship Area

One of the SFW or NSFW map regions rendered by the public relationships page.

| Property | Meaning | Invariant |
|---|---|---|
| Rating | SFW or NSFW | NSFW rows remain excluded server-side unless the visitor has opted in. |
| Nodes | Characters referenced by visible relationship rows | A node is never added from a character that is absent from the already-filtered rows. |
| Edges | Visible relationships between nodes | Existing direction, sidedness, label and text-equivalent semantics do not change. |
| Layout | Deterministic node and edge coordinates | Computed on the server; independent per rating region. |

### Character Map Node

An existing SVG link representing a character.

| Property | Meaning | Invariant |
|---|---|---|
| Character identity and URL | Existing node identity and character-page link | Remains focusable and keyboard-activatable. |
| Avatar | Existing avatar preview or placeholder | Continues to use the current avatar resolution and media route. |
| Position | Temporary SVG coordinates | Updated only by a pointer/touch drag originating on the face hit area; not persisted and reset on reload. |
| Attached edges | Existing relationships connected to this node | Their paths and labels follow the moved node. |

## State and Validation

- Pointer/touch movement changes only the current SVG node transform and connected edge geometry.
- A drag exceeding the existing gesture threshold suppresses link navigation; a simple click/tap continues to navigate.
- Pointer cancellation and release clear the active drag state and do not leave another node movable.
- Empty-canvas gestures and keyboard arrow input do not change positions.
- No new URL, database, session, or browser-storage state is introduced.
