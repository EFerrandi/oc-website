# Contract: Website-Wide Visual Refresh

**Feature**: `003-website-visual-refresh` | **Date**: 2026-10-02

## Scope Contract

This is a presentation-only refresh. The following must remain unchanged:

- Existing route inventory and link destinations.
- Existing page content, including rating-filtered content.
- Form actions, methods, input names, required markers, CSRF controls, and validation behavior.
- Authentication, authorization, and admin-only controls.
- Server-side NSFW gating and media access.
- Meaningful image alternative text, accessible names, landmarks, and document order.

## Palette Contract

| Role | Color | Permitted use |
|---|---|---|
| Light purple | `#DD92FB` | Brand highlight, selected state, decorative detail, text where its pair passes contrast |
| Medium purple | `#8D79FF` | Brand accent, primary interaction, focus/border treatment where its pair passes contrast |
| Dark purple | `#3E4EB4` | Filled/decorative brand surface or other role only with a measured, accessible foreground/background pair |
| Dark neutral | Existing dark neutral ramp | Page and component backgrounds |
| Accessible neutrals | Selected as needed | Text, secondary text, borders, and supporting surfaces |

The palette is not a command to use the three colors as equivalent text colors. Normal text requires at least 4.5:1 contrast; large text and meaningful control boundaries require at least 3:1. Interactive states must remain distinguishable without relying on color alone.

## Surface Inventory

The implementation must cover:

- Shared header, NSFW preference control, admin sign-in/return controls, navigation, main region, and footer.
- Gallery, filters, cards, tags, badges, and empty states.
- Character profile, image detail, artist grouping, story detail, and relationship maps.
- Admin dashboard, navigation, lists, create/edit forms, validation errors, status messages, and destructive actions.

## Responsive and Accessibility Contract

- Representative public and admin pages remain usable at widths 320px, 768px, 1280px, and 1920px.
- No page-level horizontal scrolling, overlapping controls, or clipped required content.
- Keyboard focus remains visible on all interactive controls.
- Semantic HTML and source order continue to convey the content when CSS is unavailable.
- Existing text equivalents, labels, and alternative text remain intact.

## Validation Contract

- `npm test` and `npm run test:nsfw` pass without weakening or deleting existing rating-safety assertions.
- Existing route-audit output remains unchanged.
- All existing navigation destinations and form destinations remain unchanged.
- PC-browser inspection covers the listed surfaces, viewport widths, keyboard focus, contrast pairs, and document order.
