# Feature Specification: ToyHouse-Inspired Home Gallery

**Feature Branch**: `004-toyhouse-gallery-home`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "let's focus on the main page. I want a more modern UI inspired by ToyHouse character's page"

## Context

This feature redesigns only the public home page: the character gallery. The design takes inspiration from the character-listing layouts familiar to ToyHouse users: a compact, image-first grid of uniform character thumbnails, names directly beneath each thumbnail, an identity header for the collection, and a compact horizontal filter bar above the grid.

This is inspiration only. The site must not copy ToyHouse branding, logos, artwork, wording, or proprietary assets. It keeps the existing dark-neutral theme and purple palette (`#DD92FB`, `#8D79FF`, `#3E4EB4`) established in feature 003.

Character pages, image pages, the artists page, the relationship map, and the admin area are out of scope except for shared header/footer elements already used by the home page.

## Clarifications

### Session 2026-10-08

- Q: Which page should the ToyHouse-inspired redesign target? → A: The home gallery page only, with the character grid styled like ToyHouse character listings.
- Q: Where should the filter panel sit on wide screens? → A: In a horizontal bar above the grid, not a sidebar.
- Q: What should each character tile show beneath its avatar? → A: Name and job titles only, as today.
- Q: Where should the collection header's heading and introduction come from? → A: Fixed text: "Original characters" plus a one-line generic introduction; no admin setting.
- Q: How should the filter bar present its many tag and sin/virtue options? → A: A compact bar shows the gender filter and actions; tags and sins/virtues are in expandable sections, collapsed by default.
## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan characters in an image-first grid (Priority: P1)

As a visitor, I want the home page to present every visible character as a uniform, image-first thumbnail tile with the character's name and job titles directly beneath it, so I can quickly scan the collection and choose a character.

**Why this priority**: The character grid is the primary purpose of the home page and delivers the requested ToyHouse-inspired browsing experience on its own.

**Independent Test**: Open the home page with several characters and confirm every character appears as a same-sized tile with avatar, name, and job titles, and that selecting a tile opens that character's details page.

**Acceptance Scenarios**:

1. **Given** the gallery contains visible characters, **When** a visitor opens the home page, **Then** each character appears as a tile with a square avatar thumbnail, the character name, and their job titles.
2. **Given** avatars have different original proportions, **When** the grid is displayed, **Then** all thumbnails have the same size and shape without stretching the image.
3. **Given** a visitor points at or keyboard-focuses a tile, **When** the tile receives attention, **Then** it shows a clear hover or focus state, and activating it opens the character details page.
4. **Given** a character has a long name or many job titles, **When** its tile is displayed, **Then** the text remains readable and does not overlap neighbouring tiles.

---

### User Story 2 - Filter from a compact bar above the grid (Priority: P1)

As a visitor, I want the existing gender, tag, and sin/virtue filters in a compact horizontal bar above the grid, so I can refine the collection without filters pushing characters far down the page.

**Why this priority**: Filtering is an existing core home-page capability; the redesign must keep it usable and integrated with the new layout.

**Independent Test**: Apply a gender filter and a tag filter from the filter bar, then confirm the grid narrows to matching characters and the active filters are visible and clearable.

**Acceptance Scenarios**:

1. **Given** a visitor opens the home page at any width, **When** the page loads, **Then** the filter bar appears between the collection header and the character grid, showing the gender filter and the apply action directly.
2. **Given** the tag and sin/virtue sections contain no active filter, **When** the page loads, **Then** those sections are collapsed and each can be expanded to show its options.
3. **Given** a visitor uses a narrow screen, **When** the filter bar is shown, **Then** its controls wrap onto as many rows as needed without horizontal scrolling, and the grid remains reachable without excessive scrolling.
4. **Given** one or more filters are applied, **When** results are shown, **Then** the active filters are visible as removable chips near the result count, and a clear-all action is available.
5. **Given** no character matches the filters, **When** results are shown, **Then** a friendly empty state explains that nothing matches and offers to clear the filters.

---

### User Story 3 - Understand the collection at a glance (Priority: P2)

As a visitor, I want a collection header showing the gallery heading, a short introduction, and the number of characters currently shown, so I immediately understand what the gallery contains.

**Why this priority**: The header adds a ToyHouse-like profile feeling and context, but the grid and filters work without it.

**Independent Test**: Open the home page with and without filters and confirm the header shows the gallery heading, introduction, and an accurate visible-character count.

**Acceptance Scenarios**:

1. **Given** a visitor opens the home page, **When** the header is displayed, **Then** it shows the heading "Original characters", a fixed one-line introduction, and the number of characters currently listed.
2. **Given** filters reduce the result set, **When** the page is shown, **Then** the count reflects only the characters currently shown.
3. **Given** NSFW content is disabled, **When** the count is displayed, **Then** it counts only characters the visitor is allowed to see and reveals no hidden content.

### Edge Cases

- A character with no avatar visible at the current content setting uses the existing neutral placeholder at the same tile size.
- A character with no job titles still has a tile of consistent height with no gap that looks broken.
- A very long unbroken character name or job title wraps or truncates, with the full value still available to assistive technology.
- A gallery with exactly one character still looks intentional rather than showing a stretched single tile.
- A gallery with hundreds of characters remains scannable and loads without visible layout jumps.
- Filters remain usable with JavaScript disabled, including expanding and collapsing the tag and sin/virtue sections.
- When a tag or sin/virtue filter is active, its section starts expanded so the selected option is visible.
- At 320px wide, the page has no horizontal scrolling and tiles remain large enough to recognise each character.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST display every character visible to the visitor as a tile containing a square avatar thumbnail, the character name, and all of the character's job titles; tiles MUST NOT add other character details such as gender, tags, or sins/virtues.
- **FR-002**: All tiles MUST share the same thumbnail size and shape, cropping images to fit without distortion.
- **FR-003**: Each tile MUST be a single keyboard-focusable link to the character's details page with clearly visible hover and focus states.
- **FR-004**: The grid MUST adapt its column count to the available width, showing at least two columns from 320px and more columns on wider screens.
- **FR-005**: At every width, the gender, tag, and sin/virtue filters MUST appear in a horizontal filter bar between the collection header and the character grid; the filters MUST NOT be placed in a sidebar.
- **FR-006**: The filter bar MUST show the gender filter and the apply action directly; tag and sin/virtue options MUST be grouped in separate expandable sections that are collapsed by default unless they contain an active filter. Expanding and collapsing MUST work without JavaScript, and the bar MUST wrap rather than scroll horizontally on narrow screens.
- **FR-007**: The page MUST show currently active filters as removable chips and MUST offer a clear-all action whenever at least one filter is active.
- **FR-008**: The page MUST show a collection header with the fixed heading "Original characters", a fixed one-line generic introduction, and a count of the characters currently shown; this text is not admin-editable.
- **FR-009**: The count, filters, tiles, and placeholders MUST continue to respect the visitor's NSFW setting and MUST NOT reveal NSFW images, NSFW-only details, or counts of hidden content.
- **FR-010**: Existing filter behaviour, shareable filter URLs, filter results, and character destinations MUST remain unchanged.
- **FR-011**: When no character matches, the page MUST show an empty state with a clear-filters action.
- **FR-012**: Long names and job titles MUST remain readable without overlapping other content; any visually truncated text MUST remain fully available to assistive technology.
- **FR-013**: The redesigned page MUST use the established dark-neutral theme and purple palette and MUST meet WCAG 2.1 AA contrast for text, controls, and focus indicators.
- **FR-014**: The page MUST remain usable from 320px to 1920px wide without page-level horizontal scrolling.
- **FR-015**: The design MUST NOT use ToyHouse logos, artwork, branding, wording, or proprietary assets.
- **FR-016**: Motion effects, if any, MUST be decorative only and MUST respect the visitor's reduced-motion preference.

### Key Entities

- **Character tile**: The home-page representation of one visible character: avatar or placeholder, name, job titles, and link to the character details page.
- **Filter bar**: The horizontal presentation of existing gender, tag, and sin/virtue filters above the grid, with collapsible tag and sin/virtue sections, active-filter chips, and a clear-all action.
- **Collection header**: The introductory area showing the fixed heading, fixed one-line introduction, and visible-character count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify and open a named character from a gallery of 30 characters in under 10 seconds.
- **SC-002**: At 1280px wide, at least 10 character tiles are visible on the first screen when there are 10 or more characters.
- **SC-003**: At 320px, 768px, 1280px, and 1920px, every tile within a viewport has identical thumbnail dimensions and no page-level horizontal scrolling occurs.
- **SC-004**: A visitor can apply a filter and then remove it using no more than 3 interactions each.
- **SC-005**: 100% of existing home-page filtering and NSFW-gating checks continue to pass.
- **SC-006**: All home-page text, controls, and focus indicators meet WCAG 2.1 AA contrast requirements.
- **SC-007**: Every tile and filter control can be reached and operated using only a keyboard.

## Assumptions

- "Main page" means the public home page that lists characters.
- "Inspired by ToyHouse" means an image-first character-listing aesthetic: uniform thumbnails, names below thumbnails, a collection header, and compact filtering; it does not mean cloning ToyHouse's layout pixel for pixel.
- The gallery introduction is fixed generic site text; a configurable profile bio or site setting is out of scope.
- No new character data, sorting options, pagination, folders, favourites, comments, or user accounts are added.
- Existing filter values remain gender, tags, and sins/virtues.
- Desktop PC browsers are the primary manual-validation target, while responsive behaviour down to 320px remains required.
