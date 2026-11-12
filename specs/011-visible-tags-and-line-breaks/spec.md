# Feature Specification: Visible Tags and Preserved Line Breaks

**Feature Branch**: `011-visible-tags-and-line-breaks`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "le gender est un tag aussi, il faut pouvoir voir tous les tags sans avoir à les collapser. Dans les textes, prend en compte les retours à la ligne"

## Clarifications

### Session 2026-11-12

- Q: Quand vous dites que le genre est aussi un tag, souhaitez-vous simplement afficher les choix de genre avec tous les tags dans les filtres, ou fusionner les genres dans une liste unique de tags sélectionnables ? → A: Afficher ensemble, genre à choix unique.
- Q: Sur quels contenus faut-il préserver les retours à la ligne : descriptions de personnage et histoires seulement, ou aussi conditions d’utilisation et descriptions courtes des images ? → A: Descriptions, histoires et conditions d’utilisation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse all character filters at a glance (Priority: P1)

As a visitor, I can see gender choices and character tags together without expanding a collapsed list, and select them to filter the gallery.

**Why this priority**: Visitors need to discover available character categories and apply filters without an extra interaction to reveal them.

**Independent Test**: Open the gallery with JavaScript enabled and disabled; verify all gender choices and tags are visible at once, gender remains single-select, tags remain multi-select, and selecting a choice applies the resulting filter.

**Acceptance Scenarios**:

1. **Given** the gallery has gender choices and character tags, **When** a visitor opens the filter area, **Then** every available gender choice and tag is visible without expanding a control.
2. **Given** a visitor selects a gender choice, **When** the filter is applied, **Then** the gallery shows characters of that gender while preserving selected character tags.
3. **Given** a visitor selects or clears a character tag, **When** the filter is applied, **Then** the gallery reflects the changed tag selection while preserving the selected gender and other tags.
4. **Given** a visitor shares or reloads a filtered gallery URL, **When** the page loads, **Then** the same gender and tag selections are reflected.
5. **Given** JavaScript is unavailable, **When** a visitor selects gender and tag filters and submits the form, **Then** the gallery applies those selections.

### User Story 2 - Preserve line breaks in authored text (Priority: P1)

As a visitor, I can read multiline character descriptions, stories, and terms of use with the line breaks entered by the author preserved.

**Why this priority**: Line breaks can separate sentences, list-like passages, and paragraphs; losing them changes the meaning and readability of authored text.

**Independent Test**: Save multiline text containing both single and blank-line breaks in the relevant fields, then verify every authored line boundary remains visible on public pages.

**Acceptance Scenarios**:

1. **Given** a character description contains a single line break, **When** the profile is displayed, **Then** the line break remains visible.
2. **Given** a story contains single and blank-line breaks, **When** it is read on a character profile or its own page, **Then** its line boundaries and paragraph spacing remain visible.
3. **Given** terms of use contain line breaks, **When** they are displayed on a profile, **Then** their line breaks remain visible.
4. **Given** text contains Windows, Unix, or legacy Mac line endings, **When** it is displayed, **Then** line breaks are presented consistently.

### Edge Cases

- When a visitor selects a gender, any already-selected tags remain selected and applied.
- When a visitor selects a tag, the currently selected gender remains applied.
- Empty lines used to separate paragraphs remain visually distinct without creating empty content sections.
- Text containing only line endings or whitespace must not create misleading visible content.
- A gender value and a character tag with the same displayed name remain distinguishable as separate filter choices.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The gallery filter area MUST display all available gender choices and character tags without requiring a visitor to expand or collapse a control.
- **FR-002**: Gender MUST be offered as a filter category alongside character tags, with at most one gender selected at a time.
- **FR-003**: Character tags MUST support selecting multiple values.
- **FR-004**: Selecting or clearing a gender or character tag MUST apply the current filter choices immediately when the enhanced interaction is available.
- **FR-005**: Applying a gender or tag choice MUST preserve all other active filter choices, and the resulting state MUST be represented in a reloadable and shareable URL.
- **FR-006**: The gender and tag filters MUST remain usable through ordinary form submission when JavaScript is unavailable.
- **FR-007**: Multiline character descriptions, story bodies, and terms of use MUST preserve each authored line break when displayed.
- **FR-008**: Blank lines MUST retain paragraph separation, while empty or whitespace-only passages MUST NOT create empty sections.
- **FR-009**: Line breaks using CRLF, LF, or CR conventions MUST render consistently.
- **FR-010**: Filter controls MUST remain keyboard-operable and provide visible focus indicators.

### Key Entities *(include if data is involved)*

- **Gender filter choice**: A single-select character classification used alongside the gallery's character tags.
- **Character tag filter choice**: A reusable character label that can be selected with other tags.
- **Multiline authored text**: Character descriptions, story bodies, and terms of use whose line boundaries are part of their displayed content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All gender choices and character tags are visible in the gallery filter area without an expand action.
- **SC-002**: A visitor can select or clear gender and tag filters and see the resulting gallery without a separate apply action.
- **SC-003**: Every selected filter remains represented after reload and when a filtered URL is shared.
- **SC-004**: Every authored line break in a non-empty character description, story body, or terms-of-use text is visible in the rendered content.
- **SC-005**: Gender and tag filtering remains operable with JavaScript disabled using the existing form submission behavior.

## Assumptions

- Gender is presented alongside reusable character tags in the filter area, but remains a mutually exclusive filter category rather than being stored or managed as a reusable character tag.
- Both selecting gender and selecting character tags immediately apply filters when JavaScript is available.
- A single newline produces a visible line break; consecutive newlines retain paragraph spacing.
- Line-break preservation applies to character descriptions, story bodies, and terms of use. Short image descriptions, labels, and truncated previews are out of scope.
- Existing server-side filter matching, URL parameter names, and available-character facets remain unchanged.
