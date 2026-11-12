# Feature Specification: Merged Rating Chart and Prefilled Permissions on Edit

**Feature Branch**: `008-chart-rating-merge-and-permissions-prefill`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "on the graph for nsfw and sfw combine all of the same on the same side so it only show 2 continuous colors. Also the rights on the character should be saved so I don't have to put them again when editing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Two continuous rating colors in the statistics chart (Priority: P1)

An admin looking at the statistics pie chart sees exactly two continuous regions: all SFW images grouped together in one color, and all NSFW images grouped together in the other, instead of alternating SFW/NSFW pieces character by character.

**Why this priority**: The alternating pieces make the SFW/NSFW proportion hard to read, which is the main purpose of the chart.

**Independent Test**: Open the dashboard with several characters having both ratings; the chart shows one SFW region and one NSFW region, each in a single color, with sizes matching the overall SFW and NSFW percentages.

**Acceptance Scenarios**:

1. **Given** several characters with both SFW and NSFW images, **When** the admin opens the statistics panel, **Then** the chart shows one continuous SFW region and one continuous NSFW region.
2. **Given** the chart, **When** compared to the totals shown beside it, **Then** each region's size matches the overall SFW and NSFW percentages.
3. **Given** only SFW (or only NSFW) images exist, **When** the chart is displayed, **Then** it shows a single full region of that rating's color.
4. **Given** no images, **When** the chart is displayed, **Then** no colored region is shown.
5. **Given** the chart, **When** a reader needs per-character numbers, **Then** the per-character table still provides total, SFW and NSFW counts, and the legend still names both colors.

---

### User Story 2 - Permissions are prefilled when editing a character (Priority: P1)

When an admin opens the edit form of an existing character, the saved permissions (can be regifted, retraded, resold) are already selected, so they don't have to be entered again.

**Why this priority**: Permissions are required; today re-entering them on every edit is an obstacle and risks accidentally changing them.

**Independent Test**: Create a character with a mix of allowed and not allowed permissions, open its edit form, and verify each permission shows its saved value; save without touching them and verify nothing changed.

**Acceptance Scenarios**:

1. **Given** a character with saved permissions, **When** its edit form opens, **Then** each permission shows its saved Allowed or Not allowed choice.
2. **Given** an unchanged permission set, **When** the admin saves the form, **Then** the permissions stay exactly as before.
3. **Given** the admin changes one permission, **When** saved, **Then** only that one changes.
4. **Given** a validation error on the edit form, **When** the form is redisplayed, **Then** the permission choices the admin made are kept.
5. **Given** the "Add a character" form, **When** it first opens, **Then** no permission is preselected, so the admin must choose each one.

### Edge Cases

- A permission saved as "Not allowed" must be shown as selected, not treated as empty.
- Characters created before this fix must show their stored permissions correctly.
- A chart with a single character still shows two regions when it has both ratings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The statistics chart MUST group all SFW images into one continuous region and all NSFW images into one continuous region, each in its own consistent color.
- **FR-002**: The size of each region MUST match the overall SFW and NSFW shares shown in the statistics text.
- **FR-003**: The chart MUST omit a region with no images, and show no region when there are no images.
- **FR-004**: The legend, per-character table, totals and percentages MUST remain available and unchanged.
- **FR-005**: The edit form MUST preselect each saved permission (regift, retrade, resell), including those saved as "Not allowed".
- **FR-006**: Saving an edit without changing permissions MUST leave them unchanged.
- **FR-007**: Permission choices MUST be kept when the edit form is redisplayed after a validation error.
- **FR-008**: The creation form MUST keep requiring an explicit permission choice, with none preselected.

### Key Entities

- **Character permissions**: Three yes/no settings per character (regift, retrade, resell), required.
- **Rating share**: The overall count of SFW and NSFW image associations used by the chart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The chart shows at most 2 colored regions regardless of the number of characters.
- **SC-002**: Each region's share matches the displayed SFW and NSFW percentages, within rounding.
- **SC-003**: 100% of saved permission values appear preselected when opening a character's edit form.
- **SC-004**: An admin can edit any other character field without re-entering permissions, and permissions are unchanged afterwards.

## Assumptions

- Per-character detail is no longer visible in the chart; it remains in the per-character table, as requested by merging same-rating pieces.
- Region order is SFW first, then NSFW; colors stay the ones from the previous fix.
- "Rights" means the character's permissions (regift, retrade, resell).
- This supersedes the per-character SFW/NSFW arc split from feature 006, which is replaced by two merged regions.
