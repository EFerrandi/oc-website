# Data Model: Always Show Avatars

No schema change.

**Avatar (derived)**: for a character, computed in one place (`src/repositories/avatars.js`):
1. `character.avatar_image_id` if that image exists and is not a video;
2. else the oldest linked non-video image (`created_at`, then `id`);
3. else none (placeholder).
The rating is not an input.

**Current-avatar predicate** `isCurrentAvatar(imageId)`: true iff the image is the result of the rule above for at least one character. Used only by the media preview gate.

**Invariants**
- I-A1: Listings and the media gate agree on what an avatar is (single definition).
- I-A2: Only the preview variant of a current avatar bypasses the rating check.
- I-A3: An image that stops being an avatar is gated again immediately (no stored flag).
- I-A4: Character visibility, relationship visibility, image lists and stories are unaffected.
