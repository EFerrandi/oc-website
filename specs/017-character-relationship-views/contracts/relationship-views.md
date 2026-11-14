# Contract: Character Relationship Views

## Public profile page: `GET /characters/:slug`

- Renders a relationship section for the current character.
- With visible relationships, the profile character is centered and every directly related visible character is represented by a complete name, avatar preview or placeholder, and native profile link.
- Every visible relationship row is represented, including multiple relationships between the same endpoints and existing directionality.
- Without visible relationships, the section shows an explicit empty state.
- The existing textual relationship list remains available as a complementary description.
- Relationship rows and endpoint nodes are selected only after server-side rating filtering. No NSFW-only name, link, relationship label, or accessible text is emitted without opt-in.
- The diagram, nodes, links, labels, and text equivalent are present in the server response and remain readable without JavaScript.

## Global relationship page: `GET /relationships`

- Keeps the existing vertically stacked SFW and NSFW sections and their server-side rating filtering.
- Uses the same crossing-reduction guarantees and hover/focus behavior as profile diagrams.
- SFW geometry and markup remain independent of NSFW-only data.

## Shared SVG contract

- Each node has a stable character ID, a usable profile link where applicable, a complete name, and a safe avatar preview URL.
- Each edge has stable source and target character IDs, its relationship identity, complete label, and direction semantics.
- Layout retains every rating-visible character and relationship, with complete names and labels.
- Global simple graphs use a deterministic planar embedding and straight-line layout when possible. Other graphs use the deterministic bounded search, including the input-order arrangement as a no-worse baseline.
- Parallel relationship records remain distinct and visible even when the planar embedding uses one edge per endpoint pair.
- A narrow viewport may scroll inside the map frame; the page itself does not gain horizontal overflow.

## Emphasis interaction

- Hovering a character or keyboard-focusing its profile link emphasizes all and only its incident relationship lines and labels in the global and profile maps.
- Other relationships remain visible but subdued.
- Pointer exit and focus loss restore normal presentation unless the same character remains active by the other input mode.
- Emphasis never prevents normal link activation and never changes or hides the underlying relationship text.
- Without JavaScript, all content and links remain available; only temporary emphasis is absent.
