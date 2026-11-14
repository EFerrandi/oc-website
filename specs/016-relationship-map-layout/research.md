# Research: Relationship Map Interaction and Layout

## R-001 — Keep the server-rendered SVG as the baseline

**Decision**: Continue generating both maps with the existing server-side graph layout and SVG template. JavaScript only handles temporary pointer/touch movement.

**Rationale**: The current implementation already renders complete relationships, names, links, labels, and positions in the response. This retains the no-JavaScript reading and navigation path and avoids introducing a client-side graph dependency.

**Alternatives considered**:
- Move graph layout and rendering to the browser: rejected because it would make the map's meaningful layout dependent on JavaScript.
- Add a graph library: rejected because the existing SVG layout and script already support the needed interactions.

## R-002 — Restrict movement to the avatar face

**Decision**: Start a drag only from the visible face hit area. Remove empty-canvas panning and keyboard movement, while preserving normal link activation by pointer and keyboard.

**Rationale**: This follows the owner's explicit interaction request and makes each movement gesture unambiguous. A drag still suppresses navigation only when movement exceeds the existing click threshold.

**Alternatives considered**:
- Keep mouse panning or arrow-key repositioning: rejected because the owner explicitly asked to remove the other movement modes.
- Make the entire node, including its name, a drag surface: rejected because the requested gesture begins on the face and names should remain straightforward links.

## R-003 — Preserve legibility on narrow screens with map-local scrolling

**Decision**: Make the SFW and NSFW sections a single vertical column and increase avatar and text sizes. Keep any necessary horizontal scroll inside an individual map frame, not on the document.

**Rationale**: The owner selected large, readable faces and text over shrinking a dense graph to fit a phone's width. Confined overflow keeps the page layout intact.

**Alternatives considered**:
- Scale a dense map until it fits the phone: rejected because faces and labels would become too small.
- Permit the entire page to overflow horizontally: rejected because it moves surrounding content and controls off screen.

## R-004 — No model or persistence change

**Decision**: Keep moved positions in the current page's DOM only; do not persist positions or add fields to relationship or character records.

**Rationale**: The specification requires the default arrangement after reload, and the graph already has deterministic server-generated coordinates.

**Alternatives considered**:
- Save positions in browser or server storage: rejected because persistence is out of scope and contrary to FR-006.

## R-005 — Record the requested keyboard movement exception before implementation

**Decision**: Amend Principle III before changing the map to disable keyboard repositioning. Use a MAJOR constitution version increment and explicitly retain keyboard focus and link activation.

**Rationale**: The existing principle requires every interactive control to be keyboard-operable. The owner selected pointer/touch-only repositioning after being informed of the conflict. Governance requires the exception and its replacement safeguards to be written down.

**Alternatives considered**:
- Leave the constitution unchanged: rejected because implementation would violate an unmodified MUST principle.
- Keep arrow-key repositioning as a fallback: rejected by the owner's explicit choice.

## R-006 — Reference-site scope

**Decision**: Treat the West Marches Games Connections tab as inspiration for stacked, legible relationship areas and direct character manipulation, not as a requirement to reproduce its branding or unrelated behavior.

**Rationale**: The existing OC site's design system, accessibility and content-rating behavior remain authoritative.

**Alternatives considered**:
- Reproduce the reference site's complete visual design: rejected because the request concerns the relationship display and does not request a site-wide redesign.
