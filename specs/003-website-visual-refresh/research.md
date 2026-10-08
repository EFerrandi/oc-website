# Research: Website-Wide Visual Refresh

**Feature**: `003-website-visual-refresh` | **Date**: 2026-10-02

## R-001 — Preserve the current dark-theme direction

**Decision**: Keep dark neutral backgrounds and use the selected purple trio for accents, selected states, focus, and decorative surfaces. Use accessible light text and neutral borders on dark surfaces.

**Rationale**: The user selected the dark-neutral option, matching the current site's direction. A wholesale light/dark inversion would be an unnecessary visual and accessibility change.

**Contrast assessment**: Relative-luminance calculations on the current dark surfaces show:

| Foreground | `#14121A` | `#1F1C29` | `#2A2637` |
|---|---:|---:|---:|
| Light purple `#DD92FB` | 8.47:1 | 7.62:1 | 6.69:1 |
| Medium purple `#8D79FF` | 5.58:1 | 5.02:1 | 4.41:1 |
| Dark purple `#3E4EB4` | 2.61:1 | 2.35:1 | 2.06:1 |
| Existing light text `#ECE9F3` | 15.48:1 | 13.94:1 | 12.24:1 |

The light and medium purples meet normal-text contrast against the first two backgrounds; medium purple narrowly misses normal-text contrast on the lighter raised surface. The dark purple is not a readable text or fine-boundary colour on dark backgrounds and must instead be used as a filled/decorative accent, or paired with a tested light foreground. Contrast is evaluated for actual foreground/background pairs, not inferred from palette membership.

**Alternatives considered**:
- Light neutral theme: explicitly not selected by the user.
- Blue-purple `#3E4EB4` as dark text on dark surfaces: insufficient contrast.
- Use all three palette colours equally for body text: rejected because the dark member fails contrast on dark surfaces.

## R-002 — Use one token system and existing CSS

**Decision**: Centralize palette, neutral surfaces, spacing, radii, typography, and shadows in CSS custom properties in `src/public/css/main.css`; style existing shared chrome, components, public pages, and admin pages from those tokens.

**Rationale**: The project already has one shared stylesheet and a small server-rendered template set. Extending it keeps the refresh auditable and avoids duplicating styles or adding build machinery.

**Alternatives considered**:
- Add a CSS framework or component library: no demonstrated need; increases dependency and build friction.
- Create separate public and admin theme systems: would preserve the very visual disconnect being addressed.
- Rebuild page templates: behavior is explicitly out of scope and the existing semantic structure is reusable.

## R-003 — Preserve behavior and semantics

**Decision**: Treat routes, content, form fields/actions, navigation, accessibility relationships, and content-rating visibility as invariants. Prefer CSS-only changes. Where a template edit is necessary, retain element semantics, names, destinations, and source/document order.

**Rationale**: FR-003, FR-006, FR-009, FR-010, and FR-011 require a presentation-only change that remains accessible and operable without JavaScript.

**Alternatives considered**:
- Alter or consolidate controls as part of the redesign: rejected because it changes actions or navigation.
- Hide or reveal content with new client-side rules: rejected because it can violate the server-side rating guarantee and JavaScript-free operation.

## R-004 — Validate the full interface surface

**Decision**: Combine the existing automated suite with a page inventory and PC-browser review at 320px, 768px, 1280px, and 1920px widths. Check keyboard focus, color contrast, page overflow, and the preservation of form labels and route destinations.

**Rationale**: CSS changes can regress multiple templates without changing JavaScript test results. Automated tests protect structural constraints; a viewport review catches layout and overlap defects that the repository's existing test runner does not render in a browser.

**Alternatives considered**:
- Rely only on unit tests: insufficient to establish visual contrast, responsive layout, or actual overflow.
- Add browser automation dependencies: unnecessary for this feature; use existing tools and PC-browser inspection unless later evidence demonstrates a gap that cannot be covered otherwise.
