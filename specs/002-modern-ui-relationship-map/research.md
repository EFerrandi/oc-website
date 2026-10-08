# Phase 0 Research: Modern Interface & Interactive Relationship Map

**Feature**: `002-modern-ui-relationship-map` | **Date**: 2026-10-01

All Technical Context unknowns are resolved below. No NEEDS CLARIFICATION remains.

---

## R-001 — Where the map layout is computed

**Decision**: Compute node positions on the server and deliver the map as complete SVG in the HTML response. The browser script adds dragging only.

**Rationale**: Clarification FR-021 settled that a visitor without scripting sees the real map, not a fallback list, and with the *same* arrangement. That is only possible if the arrangement exists before the response is sent. It also keeps Constitution Principle III's underlying reason intact: if the page assembled itself on the client, the server would no longer be the authority on what bytes were delivered, which is what makes the rating gate (Principle I) auditable.

A second benefit follows for free: SC-004 (identical arrangement across 10 loads) becomes trivially true, because the same input produces the same output on one machine rather than depending on browser timing.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Client-side force-directed layout (d3-force, cytoscape) | Non-deterministic by nature — it relaxes toward an equilibrium influenced by iteration count and timing, directly contradicting FR-013/SC-004. Produces nothing at all without script, contradicting FR-021. Adds a dependency against Principle V. |
| Client-side deterministic layout | Still produces nothing without script. Moves page assembly to the client for no gain. |
| Pre-rendering a static image server-side | Avatars would have to be composited into a raster, which would bypass the `/media` gate and bake rated content into a cacheable file. Flatly incompatible with Principle I. Also kills dragging and keyboard access. |

---

## R-002 — Layout strategy

**Decision**: Place each connected component's nodes evenly around its own circle, size the circle by the component's node count, and pack components onto a grid ordered by descending size.

**Rationale**: A circular layout has three properties that matter here:

1. **Nodes never overlap**, because they are evenly spaced on a circle whose radius grows with node count — satisfying FR-015 and the "dragged on top of each other" edge case at the default arrangement.
2. **Crossings are exactly countable and cheap to evaluate** (see R-004), so FR-012's "no worse than naive" becomes a measurable, enforceable property rather than an aspiration.
3. **Everything stays inside a known bounding box**, which is what FR-015 and FR-018 need and what makes the SVG `viewBox` responsive without horizontal scrolling (SC-011).

Separate circles per component directly satisfy FR-014 (unrelated groups placed apart) and make isolated pairs read as isolated pairs rather than being absorbed into one ring.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Single circle for all characters | Violates FR-014 — unrelated groups interleave around the ring, and every long chord crosses many others. Readability collapses past ~15 nodes. |
| Layered / hierarchical (Sugiyama) | Designed for directed acyclic graphs. Relationships here are symmetric and cyclic; layering them imposes a hierarchy the data does not have. Substantially more code. |
| Grid with edge routing | Orthogonal edge routing is a large algorithm and makes "label at the midpoint of the line" (FR-003) ambiguous, since a routed edge has no single meaningful midpoint. |
| Deterministic seeded force-directed on the server | Plausible, but needs tuning per cast size, has no crossing guarantee, and is far more code than a circular ordering for a worse guarantee. |

---

## R-003 — How the node ordering is chosen

**Decision**: For each component, generate a small fixed set of deterministic candidate orderings, count crossings for each, and keep the lowest-scoring one. Ties break on the ordering's index so the result is total and stable.

Candidates, in order:

1. **Naive** — characters in name order. Included deliberately: because it is always a candidate, the chosen ordering can never be worse than naive, which turns FR-012 into a guarantee by construction rather than an empirical hope.
2. **Depth-first pre-order**, seeded from the lowest-named node. For a component that is a tree, this yields a crossing-free circular embedding — the basis of the achievable half of SC-003.
3. **Breadth-first order**, same seed. Often better than naive on dense components.
4. **Barycentre refinement** of the best of the above: repeatedly reposition each node to the circular median of its neighbours, for a fixed iteration count, keeping the result only if it scores better.

**Rationale**: Determinism (FR-013) is non-negotiable, so anything random is out. A fixed candidate set with exact scoring is the simplest thing that is both deterministic and provably no-worse-than-naive. The fixed iteration cap bounds the cost.

**Alternatives considered**: simulated annealing and genetic ordering both score better on dense graphs but are randomised, violating FR-013, and would need a seeded PRNG plus a justification for the iteration budget. Exhaustive permutation is factorial and infeasible beyond ~10 nodes.

**Known limitation**: see R-011.

---

## R-004 — Counting crossings

**Decision**: Count exactly. Two chords `(a,b)` and `(c,d)` on a circle cross if and only if exactly one of `c`, `d` lies strictly inside the arc from `a` to `b`. Sum over all edge pairs: O(E²).

**Rationale**: At the stated scale ceiling of 300 relationships (SC-007) this is ~45,000 integer comparisons per candidate ordering — sub-millisecond. Exactness matters because FR-012 and SC-003 are stated as comparisons between crossing counts; an approximation would make them untestable.

**Alternatives considered**: a sweep-line count is O(E log E) but is more code and unnecessary at this scale. Estimating crossings would make the acceptance criteria unverifiable.

---

## R-005 — Drawing multiple relationships between the same pair

**Decision**: Draw the first relationship between a pair as a straight line, and each additional one as a quadratic arc whose control point is offset perpendicular to the chord, alternating side and increasing magnitude. Place each label at the corresponding curve's midpoint.

**Rationale**: FR-006 requires each relationship between a shared pair to stay individually distinguishable and each label readable. Stacking identical straight lines would hide all but one; offsetting arcs separates both the strokes and the label anchors with a few lines of arithmetic. A quadratic Bézier's midpoint is a closed-form expression, so FR-003's "label at the midpoint" stays exact rather than approximate.

**Alternatives considered**: a single line carrying a merged label loses which label belongs to which relationship. Splitting into multiple visual nodes per character contradicts FR-001 ("each character drawn once").

---

## R-006 — Avatars inside the SVG

**Decision**: `<image href="/media/:imageId">` clipped to a circle by a `<clipPath>`, wrapped in an `<a>` to the character's detail page. Characters whose avatar is not viewable use the existing `/img/placeholder-avatar.svg`.

**Rationale**: Reuses the existing gated media route exactly as the gallery and detail pages already do, so no new path to stored content is created and `tests/integration/route-audit.test.js` needs no change — which is precisely what Principle I's re-verification clause is checking for. `/media/:imageId` already serves the reduced preview, satisfying FR-011 without special handling. An SVG `<a>` is natively focusable and activatable, giving FR-005 and keyboard access for free.

**Alternatives considered**: HTML elements absolutely positioned over an SVG edge layer would make dragging and coordinates harder to keep in sync and complicate the `viewBox` scaling that SC-011 depends on. Embedding avatars as base64 data URIs would bypass the gate entirely — unacceptable.

---

## R-007 — Dragging and keyboard repositioning

**Decision**: Pointer Events (`pointerdown`/`pointermove`/`pointerup` with `setPointerCapture`) in `src/public/js/relationship-map.js`. Arrow keys move a focused avatar by a fixed step; Shift+Arrow moves by a larger step. The available keys are stated in visible on-page help text.

**Rationale**: Pointer Events are a platform built-in that covers mouse, touch, and pen through one code path — FR-016 asks for both pointer and touch, and this avoids writing two. `setPointerCapture` keeps the drag alive when the pointer leaves the avatar, which is the usual source of "the node got stuck" bugs. Coordinates are converted through the SVG's own `viewBox` transform so dragging stays correct at every zoom and screen width.

Positions are clamped to the `viewBox` bounds on every move, satisfying FR-018.

**Alternatives considered**: separate mouse and touch handlers duplicate logic and mishandle hybrid devices. A drag library would be a dependency replacing ~40 lines, failing Principle V's "justified by what it replaces" test. HTML5 drag-and-drop is designed for data transfer, not free positioning, and has poor touch support.

---

## R-008 — Story presentation on the character page

**Decision**: Each story is a native `<details>` with the title in `<summary>` and the opening lines always visible, expanding to the full text in place.

**Rationale**: The clarification required the text on the page, collapsed by default, expanding without navigation. `<details>` does exactly this with **no JavaScript at all**, so FR-041b is satisfied by construction rather than by a fallback that must be separately tested. It is keyboard-operable and announced correctly by assistive technology natively.

A useful finding from reading the code: `listStoriesForCharacter` **already selects `s.body`**, and `findCharacterBySlug` already returns `character.avatar`. Both are currently fetched and then discarded by the template. So FR-037–FR-043 are a template and stylesheet change with **no repository, service, or route change at all**.

**Alternatives considered**: a scripted expander would need a no-JS fallback, which is the thing `<details>` already is. Truncating server-side and fetching the rest on demand would add a route serving stored content, triggering Principle I re-verification for no benefit.

---

## R-009 — The interface refresh

**Decision**: Define design tokens as CSS custom properties on `:root` (colour ramp, spacing scale, radii, shadows, type scale) and restyle existing selectors to consume them. Use CSS Grid and Flexbox for layout, `clamp()` for fluid type. No preprocessor, no framework, no build step. Keep `main.css` as the single stylesheet.

**Rationale**: Clarification on FR-032 permits reorganising layout within a page while routes and navigation stay fixed. Custom properties give one place to change the palette and are a platform built-in, satisfying Principle V. Keeping one stylesheet preserves the existing no-build setup.

Contrast is checked against WCAG 2.1 AA (4.5:1 body text, 3:1 large text and interactive boundaries) to make FR-035/SC-012 measurable rather than subjective.

The existing `:focus-visible` rules are kept and extended rather than replaced — they were added deliberately and dropping them would regress FR-034.

**Alternatives considered**: Tailwind or any utility framework introduces a build step, violating Principle V with no demonstrated need. A component library would impose a visual identity and a large dependency for a single-maintainer site.

---

## R-010 — The admin delete control in the character list

**Decision**: The list row shows a clearly marked delete control that links to the delete section of that character's edit page, where the name-confirmation form lives. The edit page carries the actual form.

**Rationale**: FR-024 requires typing the character's name exactly, and the existing `deleteCharacter` service already enforces this and returns `422` with a `confirm_name` field error. Putting a name input in every row of the list would make the list noisy and would mean a failed confirmation has to re-render the whole list with a field error attached to one row — awkward, and it would spread the rendering of one error across two templates. Linking to the single confirmation form keeps exactly one place where deletion is confirmed and one place where its error is rendered, matching Principle II's "one enforcement point" reasoning applied to presentation.

The control is still present in the list, satisfying FR-022.

**Alternatives considered**: an inline form per row (rejected above). A dedicated confirmation page would be a new route for no gain over an anchor into the existing edit page.

**Finding**: `POST /admin/characters/:id/delete` exists and is fully implemented, but **no template anywhere links to or submits to it**. The capability has been unreachable since it was written. Similarly the header has no return-to-admin control. Both user requests are genuine gaps, not duplicates of existing UI.

---

## R-011 — Crossing-free layouts are preferred, not guaranteed

**Clarification accepted 2026-10-02.**

The user clarified that SC-003 should aim for as few crossings as possible and that zero crossings need not be achieved. A crossing-free drawing remains preferred whenever it is found, but it is not a universal acceptance condition.

The deterministic search evaluates a fixed set of orderings and selects the one with the lowest exact crossing count. This is a bounded promise: minimum among the evaluated candidates, not a claim of global mathematical optimality for every graph. The naive ordering remains in the candidate set, so the result cannot score worse than that baseline.

Manual browser checks target PC users; touch-specific checks are not required.
