# Research: Relationship Map Redesign

## R-001 - Extend the existing shared SVG map

**Decision**: Keep one shared server-rendered relationship-map partial for the global rating-specific maps and profile-centered map.

**Rationale**: Both routes already build the same SVG contract. The profile and global routes apply rating filters before rendering; the shared map interaction module already handles node identity, edge identity, focus emphasis, and pointer/touch face dragging.

**Alternatives considered**:
- Replace the existing maps with a client-rendered graph: rejected because the server-rendered map is the no-JavaScript baseline and the rating gate must remain authoritative.
- Build separate map components for profile and global pages: rejected because it duplicates the visual and interaction contract.

## R-002 - Derive avatar size from visible connected characters

**Decision**: For each character, count distinct other endpoints among rating-visible relationship records. Parallel or reverse-direction records between the same pair count once, and self-relationships do not increase the count. Use that count to assign a bounded, monotonic radius so higher counts always produce larger nodes. Keep count and radius request-local.

**Rationale**: Global rows come from `listRelationshipCards`, which is already rating-filtered; profile rows come from the already-filtered character repository. Counting distinct neighbors at the shared map-model boundary ensures that hidden relationships cannot affect an avatar’s size and that duplicate records do not exaggerate how many characters someone is connected to.

**Alternatives considered**:
- Count each relationship record separately: rejected because parallel and reverse-direction records would make a character appear connected to more people than they are.
- Persist a character degree or size: rejected because it becomes stale as relationships or rating visibility change.
- Count all database relationships regardless of visitor setting: rejected because hidden relationships would influence the visible map.
- Allow unbounded linear radius growth: rejected because a highly connected node could consume the whole map.

## R-003 - Keep SVG layout usable with variable node sizes

**Decision**: Extend the current per-node layout geometry to use each node radius for avatar separation, fit bounds, edge endpoint inset, and focus/drag bounds. Give each avatar a matching clip path.

**Rationale**: Current layout uses a shared `NODE_RADIUS` in planar spacing, ring packing, crop geometry, edge handling, and SVG clipping. Merely changing the image dimensions would cause overlaps and clipped avatars. The graph and template must share the same radius for every node.

**Alternatives considered**:
- Change only the rendered image size: rejected because edges, hit targets, fit bounds, and clipping would still use the old fixed radius.
- Keep equal nodes and use another size cue: rejected because the user explicitly chose larger avatars for more visible relationships.

## R-004 - Server baseline with native SVG map controls

**Decision**: Render complete nodes, names, links, paths, and relationship details on the server. Use the existing browser module to enable label toggling, viewBox zoom, relationship selection, and browser fullscreen. Hide or disable enhancement-only controls until their handlers are attached.

**Rationale**: The map remains meaningful when scripts are unavailable. SVG viewBox changes preserve the server-calculated geometry and can use existing screen-to-SVG transforms for pointer dragging. The Fullscreen API is browser-native and may be unsupported, so normal-frame behavior remains complete.

**Alternatives considered**:
- Depend on a graph or zoom package: rejected because SVG, DOM, and Fullscreen APIs already meet the bounded feature needs.
- Make controls depend on server requests: rejected because labels and zoom are temporary presentation state and do not need persistence.

## R-005 - Selectable relationship details with progressive fallback

**Decision**: Associate every relationship path with a stable anchor to its full server-rendered relationship detail. Let JavaScript additionally show a map-local detail panel and maintain selected-path emphasis. Keep a visible details list or disclosure on the page as the no-JavaScript fallback.

**Rationale**: The existing global map already emits a text equivalent after its SVG and the profile has a visible textual list. Native links preserve keyboard navigation and meaningful behavior without scripts; enhancement can avoid page navigation and focus the selected relationship in the map.

**Alternatives considered**:
- Make a click-only JavaScript tooltip the sole way to read a relationship: rejected because the content would disappear for users without JavaScript and lacks a robust keyboard fallback.
- Put full labels permanently on every path: rejected because the reference’s Labels control refers to character names and the request asks to inspect relationship details separately.

## R-006 - Match the supplied visual reference without changing rating behavior

**Decision**: Apply the shared dark blue/teal map frame, muted-gold curved paths and arrows, circular avatars, separated clusters, and lower-right controls to both existing map types. Retain the distinct global SFW and NSFW sections.

**Rationale**: The screenshot establishes the intended appearance and location of controls; the user confirmed that the style applies to both global and profile maps. The existing rating-separated architecture is a security invariant, not a styling choice.

**Alternatives considered**:
- Merge SFW and NSFW maps into one visible graph: rejected because it weakens the existing server-side rating presentation and can expose excluded relationship structure.
- Apply the redesign only to the global page: rejected by the user's clarification that profile diagrams should match too.
