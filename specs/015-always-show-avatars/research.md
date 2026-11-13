# Research: Always Show Avatars

## R1: Where to enforce the exemption
- **Decision**: In the media gate, via one predicate `isCurrentAvatar(db, imageId)` in `avatars.js`, reused by the resolver's rules.
- **Rationale**: Principle I forbids bypassing the single gate; the HTML cannot show an avatar the route refuses to serve.
- **Alternatives**: A separate avatar route (a new bypass, rejected); a static copy of avatars (rejected, Principle I).

## R2: What counts as a current avatar
- **Decision**: An image is a current avatar if (a) some character's `avatar_image_id` equals it and it is not a video, or (b) it is the oldest non-video linked image of a character whose designated avatar is unset or a video.
- **Rationale**: Mirrors the resolver (spec FR-003, clarified: fallback ignores rating). Changing the avatar re-hides the old image automatically because it is computed per request.

## R3: Preview only
- **Decision**: The exemption applies to `/media/:id` (preview) only; `/media/:id/full` keeps the normal rating check.
- **Rationale**: Minimises exposure: avatars are thumbnails; full-size NSFW stays opt-in. Not requested otherwise.
- **Alternatives**: Exempt both (more exposure, no need).

## R4: Caching
- **Decision**: Keep `private, no-store` for NSFW images, including avatars.
- **Rationale**: Safe if an avatar later changes; cost is negligible at this scale.

## R5: Character page
- **Decision**: The header avatar uses the same resolver; the picture list is unchanged and still rating-filtered.

## R6: Constitution version
- **Decision**: 2.0.0 (MAJOR): it permits what Principle I previously forbade, per the versioning policy.
