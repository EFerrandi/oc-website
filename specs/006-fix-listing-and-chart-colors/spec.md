# Feature Specification: Fix Listing Text Overlap and Chart Rating Colors

**Feature Branch**: `006-fix-listing-and-chart-colors`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "1. Fix the bug where, in the character listing, the name and jobs are hidden by the image. 2. For the statistics pie chart, use a different color for SFW and NSFW."

## Clarifications

### Session 2026-11-11

- Q: How should the pie chart show SFW vs NSFW? → A: Keep one slice per character, each split into an SFW part and an NSFW part with the two rating colors.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read character name and jobs in the listing (Priority: P1)

A visitor browsing the main character listing must always see each character's name and job titles below the avatar, even when the avatar has a custom crop or zoom applied.

**Why this priority**: The listing is the main page; hidden names and jobs make it unusable for identifying characters.

**Independent Test**: Open the listing with characters that have a zoomed/cropped avatar and verify name and jobs are fully visible and not covered by any image.

**Acceptance Scenarios**:

1. **Given** a character with a zoomed or repositioned avatar, **When** the listing is displayed, **Then** the avatar stays within its own frame and the name and job titles are fully visible below it.
2. **Given** a character with no crop, **When** the listing is displayed, **Then** name and job titles remain visible and the layout is unchanged.
3. **Given** a phone, tablet or desktop viewport, **When** the listing is displayed, **Then** no tile has its name or jobs covered by an image.
4. **Given** a character with several or long job titles, **When** the listing is displayed, **Then** the text is not hidden by the image (it may wrap).

---

### User Story 2 - Distinguish SFW and NSFW in the statistics chart (Priority: P2)

An admin viewing the statistics dashboard must be able to tell SFW images from NSFW images in the pie chart at a glance, because each rating has its own distinct color.

**Why this priority**: Improves readability of an existing admin feature; no data changes.

**Independent Test**: Open the dashboard with characters having both SFW and NSFW images and verify SFW and NSFW use two clearly different colors, explained by a legend.

**Acceptance Scenarios**:

1. **Given** characters with both SFW and NSFW images, **When** the admin opens the statistics panel, **Then** SFW parts and NSFW parts of the chart use two different, consistent colors.
2. **Given** the chart, **When** the admin looks at it, **Then** a legend identifies which color is SFW and which is NSFW.
3. **Given** a character with only SFW or only NSFW images, **When** the chart is displayed, **Then** only the matching color appears for that character.
4. **Given** a user who cannot distinguish colors, **When** they read the statistics, **Then** the accompanying text/table still gives the SFW and NSFW counts per character.

### Edge Cases

- Avatar with extreme zoom or offset must never extend outside its frame.
- Characters with zero images in the chart: no empty or misleading segment.
- Chart where all images are of a single rating: one color only, legend still shown.
- The two rating colors must remain distinguishable from each other and from the chart background.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The character listing MUST keep each avatar clipped inside its own frame so it never overlaps the name or job titles.
- **FR-002**: The listing MUST show each character's name and job titles in full (wrapping allowed) on all supported screen sizes.
- **FR-003**: Avatar crop/zoom settings MUST continue to be honored in the listing and on the character page.
- **FR-004**: The statistics pie chart MUST use one color for SFW images and a different color for NSFW images, consistently.
- **FR-005**: The statistics chart MUST display a legend identifying the SFW and NSFW colors.
- **FR-006**: The chart MUST still convey the number of images per character, with each character's portion split into its SFW and NSFW parts.
- **FR-007**: The textual statistics (per-character, totals and SFW/NSFW percentages) MUST remain available as an accessible alternative to the chart.

### Key Entities

- **Character image count**: Per character, the total, SFW and NSFW number of images used by the statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of listing tiles, including those with cropped avatars, name and job titles are fully visible.
- **SC-002**: An admin can identify the SFW and NSFW share in the chart in under 5 seconds using only colors and the legend.
- **SC-003**: No regression: avatar crops still display as configured on the listing and the character page.

## Assumptions

- The pie chart keeps one portion per character (confirmed in Clarifications); each portion is divided into an SFW segment and an NSFW segment with the two global colors, instead of per-character colors.
- The listing fix does not change the tile design beyond preventing overlap.
- The two colors are fixed and not configurable by the admin.
- Existing statistics numbers and the text table are unchanged.
