# Feature Specification: Website-Wide Visual Refresh

**Feature Branch**: `003-website-visual-refresh`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Modernize all interface in the website. For colors use DD92FB light, 8D79FF medium, 3E4EB4 dark, or B43E4E dark, FF8D79 medium, FBDE92 light."

## Context

This feature refreshes the appearance of the existing OC gallery, character and image pages, relationship map, artist pages, and admin area as one coherent website. It changes presentation only: existing routes, content, permissions, NSFW gating, and available actions remain unchanged.

The selected palette is the purple palette: light `#DD92FB`, medium `#8D79FF`, dark `#3E4EB4`. These colours are the visual identity, not a requirement to use every colour for every type of text. Text and controls must retain accessible contrast; supporting neutral colours may be used where needed.

## Clarifications

### Session 2026-10-02

- Q: Which overall theme should the purple palette use: a dark neutral background with purple accents, a light neutral background with purple accents, or a blue-purple-tinted background based on #3E4EB4? → A: Use dark neutral backgrounds with purple accents; retain the current dark-theme direction while using accessible contrast for text and controls.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse a visually coherent gallery (Priority: P1)

As a visitor, I want the gallery, navigation, character details, artist pages, and relationship map to feel like parts of the same modern website, so I can browse content without encountering inconsistent visual styles.

**Why this priority**: These public pages are the main way visitors experience the site; an inconsistent or dated presentation undermines the gallery as a whole.

**Independent Test**: Open the gallery, a character page, an artist page, and the relationship map, then confirm the same palette, typography, spacing, surfaces, and control treatment are recognisable on each.

**Acceptance Scenarios**:

1. **Given** a visitor opens any public page, **When** they move between pages, **Then** the page uses the same visual language and purple palette.
2. **Given** the gallery contains cards, filters, tags, and empty states, **When** each is displayed, **Then** their visual hierarchy is clear and consistent with the rest of the site.
3. **Given** a visitor opens the relationship map or a character profile, **When** they view its specialised content, **Then** the map and profile retain their existing structure and remain visually integrated with the refreshed site.

### User Story 2 - Use the admin area without a visual disconnect (Priority: P1)

As the site admin, I want the admin dashboard, lists, forms, and destructive actions to share the site's visual identity, so that administration remains clear and confident rather than feeling like a separate, unfinished product.

**Why this priority**: The admin area is the only way to maintain the gallery; inconsistent styling makes important actions harder to identify and trust.

**Independent Test**: Sign in and open the dashboard, a list, and an edit form; confirm they share the public palette and type system while making primary and destructive actions visually distinct.

**Acceptance Scenarios**:

1. **Given** the admin opens any admin page, **When** they navigate between dashboard, list, and edit views, **Then** the same colours, typography, spacing, and surfaces are used.
2. **Given** a form has primary and destructive actions, **When** the admin scans it, **Then** each action is distinguishable by more than colour alone.
3. **Given** validation errors or success messages appear, **When** they are displayed, **Then** they are legible, associated with the relevant action, and consistent across admin pages.

### User Story 3 - Read and operate the site at different screen sizes (Priority: P1)

As a visitor or admin, I want every page and control to remain readable and operable at narrow and wide screen sizes, so I can use the site without clipped content or unnecessary horizontal scrolling.

**Why this priority**: A visual refresh must not trade away the site's existing responsive behaviour or keyboard accessibility.

**Independent Test**: Review representative public and admin pages at 320px, 768px, 1280px, and 1920px widths; navigate controls with a keyboard and verify visible focus and readable contrast.

**Acceptance Scenarios**:

1. **Given** any public or admin page is opened at widths from 320px to 1920px, **When** the layout adapts, **Then** content does not overlap or require page-level horizontal scrolling.
2. **Given** a user navigates by keyboard, **When** focus moves through links, fields, and buttons, **Then** the focused control is visibly identifiable.
3. **Given** text, controls, and status messages use the new palette, **When** viewed in their normal and interactive states, **Then** each remains readable and identifiable against its background.

### Edge Cases

- A long character name, artist name, relationship label, or URL must wrap or otherwise fit without forcing page-level horizontal scrolling.
- Empty states, validation errors, and success messages must retain their meaning and contrast in the refreshed palette.
- A narrow viewport must not obscure the NSFW opt-in or the admin sign-in/return control.
- A destructive action must remain distinguishable when colour perception is limited.
- Existing SFW/NSFW content visibility must not change as a result of styling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST use dark neutral backgrounds with the selected purple palette (`#DD92FB`, `#8D79FF`, `#3E4EB4`) as its shared visual identity and accents across public and admin pages.
- **FR-002**: The site MUST apply a consistent visual system for typography, spacing, page surfaces, borders, cards, navigation, buttons, forms, badges, and messages across all existing pages.
- **FR-003**: The refreshed appearance MUST preserve every existing route, control, content item, and user action; it MUST NOT change application behaviour or content visibility.
- **FR-004**: The gallery, character profiles, image pages, artist pages, relationship map, and admin pages MUST each have a clear visual hierarchy appropriate to their existing content.
- **FR-005**: Primary, secondary, and destructive actions MUST be distinguishable through more than colour alone.
- **FR-006**: Text, interactive controls, focus indicators, and status messages MUST remain readable and identifiable against their backgrounds using recognised accessibility contrast guidance.
- **FR-007**: Every public and admin page MUST remain usable at widths from 320px to 1920px without overlapping content or page-level horizontal scrolling.
- **FR-008**: Long unbroken content MUST wrap or otherwise remain within its containing region.
- **FR-009**: Keyboard focus MUST remain visibly apparent on every interactive control after the refresh.
- **FR-010**: The existing NSFW opt-in and admin controls MUST remain visible and usable at narrow and wide viewport widths.
- **FR-011**: The site MUST remain readable and operable in document order when visual styling is unavailable.

### Key Entities

- **Visual palette**: The selected shared colour identity and supporting accessible neutrals used throughout the website.
- **Interface surface**: An existing public or admin page, component, control, or status message whose visual appearance is refreshed without changing its behaviour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing public and admin page types use the selected purple palette and a consistent typography, spacing, and surface system.
- **SC-002**: 100% of tested forms that include primary and destructive actions distinguish them by both clear labels and at least one visual cue other than colour.
- **SC-003**: Every existing page is readable and operable at 320px, 768px, 1280px, and 1920px widths, with no page-level horizontal scrolling or overlapping content.
- **SC-004**: 100% of interactive controls show a visible focus indicator during keyboard navigation.
- **SC-005**: All sampled text and control combinations meet recognised accessibility contrast guidance.
- **SC-006**: 100% of existing routes, controls, and content remain available after the visual refresh.
- **SC-007**: With styling unavailable, each page retains a readable content order and usable links and form controls.
- **SC-008**: The NSFW content visibility tests pass unchanged; a visual change never exposes content that the visitor has not opted in to see.

## Assumptions

- The purple palette is selected over the offered warm palette.
- Dark neutral backgrounds are the foundation; the hex colours define the brand palette and accents. Accessible neutral colours may be used for text, borders, and focus states.
- The refresh applies to every existing public and admin surface, not only the relationship map and character profile.
- This is a presentation-only change. The data model, routes, access rules, rating rules, content, and interactions are preserved.
- PC users are the target for the manual browser interaction checks in feature 002; touch-specific checks are not required for those manual scenarios.
- Existing responsive and accessibility behaviour is part of the baseline and must not regress.
