# Research: ToyHouse-Inspired Home Gallery

## R-001: ToyHouse inspiration without copying

- **Decision**: Use general listing patterns only: a collection header, compact filtering above the content, uniform square thumbnails, and names beneath images. Apply the site's own dark-neutral purple tokens, wording, and assets.
- **Rationale**: Delivers the requested familiar character-listing feel while satisfying FR-015.
- **Alternatives considered**: Recreating ToyHouse's exact layout, colours, iconography, or text was rejected because it could copy proprietary branding.

## R-002: Filter bar disclosure without JavaScript

- **Decision**: Keep one GET form. Show the gender select and actions directly; place tags and sins/virtues in native `<details>` sections, adding `open` when a section contains an active filter.
- **Rationale**: Native disclosure is keyboard-operable and works without script; GET preserves shareable URLs (FR-006, FR-010).
- **Alternatives considered**: A JavaScript drawer would violate Constitution III; always-expanded options would push the grid down; a single collapsed "Filters" control was rejected during clarification.

## R-003: Removable active-filter chips

- **Decision**: Build an `activeFilters` view model in the gallery route. Each entry has its kind, label, and `removeHref` generated from the current applied filters with only that value removed, using `URLSearchParams`.
- **Rationale**: Links work without JavaScript, preserve all other filters, encode values correctly, and are easy to test (FR-007, SC-004).
- **Alternatives considered**: Building query strings in Nunjucks was rejected as harder to encode and test; JavaScript-only removal violates Constitution III.

## R-004: Visible-character count

- **Decision**: Display `characters.length` from the existing rating-aware, filter-aware query result, with singular/plural wording.
- **Rationale**: It is exactly the rendered set and cannot include hidden content (FR-008, FR-009).
- **Alternatives considered**: A separate total count query was rejected because it could diverge from the rendered list or count hidden characters.

## R-005: Uniform tile grid

- **Decision**: Use a fluid CSS grid with a two-column minimum below about 480px and auto-fill columns elsewhere. Thumbnails use a fixed square aspect ratio and `object-fit: cover`. Names and job titles wrap safely; tiles contain no gender, tag, or trait text.
- **Rationale**: Produces consistent, dense listing tiles from 320px to 1920px without page-level overflow (FR-001 to FR-004, FR-012, SC-002, SC-003).
- **Alternatives considered**: Masonry layout was rejected because thumbnail sizes would vary; fixed-column breakpoints alone would waste space or overflow.

## R-006: Accessibility and motion

- **Decision**: Keep native links, labels, fieldsets, and `<details>/<summary>`. Use the shared purple focus ring and limit motion to short hover transitions disabled by `prefers-reduced-motion`.
- **Rationale**: Meets keyboard, focus, contrast, and motion requirements without custom widgets (FR-003, FR-013, FR-016, SC-006, SC-007).
- **Alternatives considered**: Custom ARIA disclosure buttons were rejected as unnecessary machinery.
