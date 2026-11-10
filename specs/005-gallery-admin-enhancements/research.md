# Research: Gallery and Admin Enhancements

**Feature**: `005-gallery-admin-enhancements`

## R-001: Consolidate designer and artist identities

- **Decision**: The existing `artist` identity becomes the canonical creator record. Migrate each character's `designer_id` to the canonical artist ID, then remove the separate designer taxonomy and use artist IDs for both design and image credits.
- **Rationale**: The spec requires one artist identity and one Artists destination. Reusing the existing artist table minimizes schema churn and preserves image-credit associations.
- **Alternatives considered**: Keep separate designer and artist records and combine them only in templates (does not provide identity reuse); rename designer to creator and move both tables (unnecessary table rebuild).
- **Migration rule**: Match names case-insensitively after trimming/collapsing whitespace. For a designer matching an artist, preserve the artist row and its non-empty website link; if that link is empty, fill it from the designer. For a designer with no match, create an artist from its name/link and repoint character credits. For a same-name designer/artist with two different non-empty URLs, retain the artist URL as clarified.
- **Conflict handling**: Where several legacy spellings normalize to one identity, deterministic normalized matching applies; migration tests cover mixed case, whitespace, empty URLs, and differing URLs. The migration must not discard credit links.

## R-002: Consolidate sins and virtues into tags

- **Decision**: Move each `trait` name to the reusable `tag` taxonomy and merge case-insensitive duplicate names. Union each old `character_trait` and `character_tag` association into `character_tag`; remove trait associations and taxonomy after preserving all character memberships.
- **Rationale**: Sins and virtues become ordinary tags and should share tag selection, filtering, and administration. The character's current tag/trait memberships are the authoritative data to preserve.
- **Alternatives considered**: Keep traits in a hidden parallel table (contradicts unified tag management); encode sin/virtue as metadata on tags (not requested and retains the distinction the spec removes).
- **Migration safeguard**: Verify post-migration that each old character-trait membership has a corresponding character-tag membership and preserve the existing character minimum-tag invariant.

## R-003: Native bubble controls

- **Decision**: Use real radio controls for the single gender selection and real checkbox controls for multi-tag selection, visually styled as centered-text bubbles. Controls remain in the document and keyboard-accessible; the bubble label presents the selected/unselected state. Forms remain ordinary GET/POST submissions.
- **Rationale**: Native controls preserve form semantics, keyboard interaction, selected-state announcements, and no-JavaScript behavior while replacing the visible checkbox/select presentation.
- **Alternatives considered**: JavaScript-only toggle buttons (no-JavaScript failure and state/serialization work); custom ARIA widgets (unnecessary complexity and greater accessibility risk).

## R-004: Per-character square avatar crop

- **Decision**: Store a normalized square crop's focal position and zoom with the character's avatar assignment. Use the existing source image and its rating-aware resolution; render a square crop viewport. Provide server-submitted numeric/range controls as the complete baseline and an optional browser preview enhancement.
- **Rationale**: Crop belongs to the character-avatar assignment, not a shared image; storing normalized values avoids modifying original files or creating additional media variants/routes.
- **Alternatives considered**: Destructively rewrite the image (violates clarified requirement); generate stored crop derivatives (adds file lifecycle, rating-gated media variants, and cleanup complexity); CSS-only object positioning without persisted focal/zoom controls (does not provide a complete crop editing interaction).
- **Validation**: Clamp/validate focal coordinates to 0–100% and zoom to 1.0–3.0×; center crop is the default. Keep the avatar source resolution subject to existing NSFW rules.

## R-005: Dashboard image statistics and chart

- **Decision**: Calculate counts from `character_image` joined to `image`, grouped by character and rating. Count each association once, including the overall total. Compute SFW and NSFW percentages as shares of all associations. Render a server-generated SVG pie chart with a readable per-character table as its equivalent.
- **Rationale**: A single aggregate query avoids per-character query growth. SVG is dependency-free, works without JavaScript, and can be paired with the table for accessibility and chart fallback.
- **Alternatives considered**: Count image rows only (would disagree with the user's clarified per-character-linked total); client-side chart package (new dependency and script requirement); CSS conic-gradient only (less useful for explicit per-character accessible slices and less robust print/assistive fallback).
- **Zero and rounding rules**: With no associations, both percentages are 0%. Otherwise calculate shares from exact counts and round displayed percentages consistently; chart angles use exact counts, not rounded percentages.

## R-006: Inline artist creation and upload atomicity

- **Decision**: Keep the upload form on the existing endpoint and allow either selecting an artist or submitting new artist name and optional URL. Validate before file persistence where possible; create artist and image/link records in one SQLite transaction. If a later operation fails, remove the stored image and preview using the existing cleanup service.
- **Rationale**: This preserves the existing upload flow and the constitution's all-or-nothing multi-table invariant.
- **Alternatives considered**: Separate AJAX endpoint (unneeded JavaScript/API surface); create the artist before file validation in a separate transaction (can leave orphaned artist records).
- **Duplicate rule**: Case-insensitive duplicate names are rejected with an actionable field error and the existing artist can be selected instead.

## R-007: Admin-only ownership

- **Decision**: Pass an explicit admin-view option when loading a character detail and omit ownership fields from anonymous view data where practical; only render ownership at the end of the admin's profile page. Dashboard access remains behind the existing admin middleware.
- **Rationale**: Server-side omission prevents accidental exposure in rendered HTML and keeps public response tests meaningful.
- **Alternatives considered**: Hide ownership with CSS (leaks the content); client-side conditional rendering (also leaks it).

## R-008: Migration operational behavior

- **Decision**: Add a new ordered migration; never edit `001_initial.sql`. Apply data rewrites and schema rebuilds in one transaction using the existing migration runner and foreign-key discipline. Test on representative legacy rows before accepting the migration.
- **Rationale**: Migrations are forward-only by project constitution, and this feature changes foreign keys and removes two taxonomies.
- **Alternatives considered**: Modify the initial schema in place (breaks existing installs); perform application-start data cleanup outside migration tracking (non-repeatable and difficult to audit).
