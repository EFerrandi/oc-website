# Feature Specification: Gallery and Admin Enhancements

**Feature Branch**: `[005-gallery-admin-enhancements]`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "1. fusionne les designers et les artistes sous le même onglet "artistes". Un designer est un artiste. 2. dans l'upload d'image, ajoute la possibilité de créer des artistes au moment de l'upload 3. pour les tags et les genres, je ne veux pas des checkbox, mais des bulles avec le texte en son centre sur lesquelles je peux appuyer 4. les sins et virtues sont des tags 5. sur la fiche d'un personnage met tags en haut à droite 6. sur la fiche de détails met l'ownership tout en bas et cache le si ce n'est pas l'admin qui regarde 7. Ajoute dans le dashboard admin un panneau de statistiques pour donner le nombre d'images par persos (total, sfw, nsfw), le nombre total d'images (total, sfw et nsfw) et la porpotions d'images SFW par rapport au nsfw en pourcentage avec un camembert pour le nombre d'images par personnage 8. Met les relations au dessus des histoires 9. Pour l'avatar, permet de crop l'image"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage artists in one place (Priority: P1)

As an admin, I want character designers and image artists to be represented in one artist catalogue, so artist identity and website links are consistent across character credits, image credits, and the Artists page.

**Why this priority**: Artists are shared credit data used throughout the gallery, and combining designers with artists avoids duplicate or incomplete identities.

**Independent Test**: Create or select one artist for an image and a character design; confirm both credits resolve to the same artist and appear under the single Artists destination.

**Acceptance Scenarios**:

1. **Given** a character has a designer and images have artists, **When** a visitor opens site navigation and the Artists page, **Then** there is one Artists destination and both design and image credits use the same artist identity and website link.
2. **Given** an artist has a design credit, image credits, or both, **When** the Artists page is opened, **Then** the artist appears once and their related artwork remains grouped under that artist.
3. **Given** existing designer and artist records are migrated, **When** the migration completes, **Then** character design credits and image credits still point to the correct artist identities and no credit is lost.

### User Story 2 - Create an artist while uploading an image (Priority: P1)

As an admin uploading artwork, I want to add an artist without leaving the upload flow, so I can credit new artists immediately.

**Why this priority**: Uploading requires an artist credit, and a separate artist-management detour interrupts the common workflow.
 
**Independent Test**: Upload an image, create a new artist with a name and optional website link in that flow, and confirm the saved image and Artists page use the new artist.

**Acceptance Scenarios**:

1. **Given** an admin is uploading an image, **When** they choose to create an artist, **Then** they can enter the artist's name and optional website link and complete the upload without leaving the page.
2. **Given** artist creation or image upload validation fails, **When** the form is redisplayed, **Then** entered values and validation errors are preserved and no partial image or artist is created.
3. **Given** an artist already exists, **When** an admin uploads an image, **Then** they can select that artist without creating a duplicate.

### User Story 3 - Choose genders and tags with tappable bubbles (Priority: P1)

As a visitor or admin, I want genders and tags presented as tappable text bubbles wherever I choose or filter them, so selection is clear and easy without checkbox controls.

**Why this priority**: Gender and tag selection is used in both public browsing and character management; a consistent control improves both workflows.

**Independent Test**: Use only keyboard and pointer/touch to select and clear gender and tag bubbles in the gallery filters and character forms, then confirm the selected values and resulting characters are correct.

**Acceptance Scenarios**:

1. **Given** gender options are available, **When** they are presented for selection or filtering, **Then** they appear as centered-text bubbles, selection is visibly distinct, and the existing single-gender behavior is preserved.
2. **Given** tag options are available, **When** they are presented for selection or filtering, **Then** they appear as centered-text bubbles, support the existing multi-selection behavior, and selected tags are visibly distinct.
3. **Given** a selected bubble is activated again, **When** the control permits deselection, **Then** it is deselected and the corresponding form/filter value is removed.
4. **Given** a user navigates by keyboard or uses assistive technology, **When** they reach a bubble group, **Then** its purpose and selected state are announced and every option can be operated without a pointer.
5. **Given** sins or virtues are currently recorded on characters, **When** the taxonomy is unified, **Then** each value becomes a reusable ordinary tag and remains associated with every character that previously had it.

### User Story 4 - See character tags and private ownership in the intended locations (Priority: P1)

As a visitor, I want a character's tags near the top-right of its profile and its ownership information at the bottom only when I am the admin, so public profile details remain focused while the admin retains ownership data.

**Why this priority**: Tags support quick recognition, while terms and permissions are owner-facing information that should not be exposed publicly.

**Independent Test**: Open the same character detail page as an anonymous visitor and as an authenticated admin; confirm tag placement is consistent, ownership is absent for the visitor, and the admin sees it at the bottom.

**Acceptance Scenarios**:

1. **Given** a character has tags, **When** its detail page is displayed, **Then** the tag bubbles appear in the upper-right area of the character profile.
2. **Given** a visitor is not authenticated as admin, **When** they view a character detail page, **Then** ownership, terms of use, and transfer permissions are not present in the rendered page.
3. **Given** the admin views a character detail page, **When** they reach the bottom, **Then** ownership, terms of use, and transfer permissions are shown there.
4. **Given** a character has no optional tags, **When** the profile is displayed, **Then** its layout remains usable without an empty tag area.

### User Story 5 - Review image statistics in the admin dashboard (Priority: P1)

As an admin, I want a dashboard summary of total, SFW, and NSFW images overall and for each character, plus an SFW/NSFW percentage breakdown and a per-character pie chart, so I can understand the gallery's image distribution.

**Why this priority**: The requested statistics provide an at-a-glance view of content volume and rating balance that is not available from the current dashboard.

**Independent Test**: Seed images with both ratings, including an image linked to multiple characters, then verify every count, percentage, chart slice, and accessible equivalent against the data.

**Acceptance Scenarios**:

1. **Given** the admin opens the dashboard, **When** image statistics are shown, **Then** overall totals separately report total, SFW, and NSFW linked-image counts.
2. **Given** a character has images of either rating, **When** per-character statistics are shown, **Then** that character has total, SFW, and NSFW counts.
3. **Given** an image is linked to multiple characters, **When** dashboard counts are computed, **Then** it contributes once to each linked character and once per character link to the overall linked-image total.
4. **Given** SFW and NSFW linked-image counts are shown, **When** their percentages are calculated, **Then** each is a share of the combined total and the two percentages sum to 100%, except when the total is zero, when both are 0%.
5. **Given** per-character counts are shown, **When** the pie chart is displayed, **Then** it has a slice for each character proportional to that character's total linked-image count and provides an equivalent readable text/table summary.
6. **Given** a visitor is not authenticated as admin, **When** they request or view the dashboard, **Then** no statistics or underlying breakdown are exposed.

### User Story 6 - Read relationships before stories and crop an avatar (Priority: P2)

As a visitor, I want relationships to appear before stories on a character profile; as an admin, I want to adjust the crop used for a character's avatar without changing the original artwork.

**Why this priority**: These focused profile changes improve information order and avatar presentation while preserving the original image.

**Independent Test**: Confirm relationships precede stories in the profile and set a non-default crop for an avatar, then verify the displayed avatar uses that crop while the original image remains unchanged.

**Acceptance Scenarios**:

1. **Given** a character has relationships and stories, **When** its detail page is read in document order, **Then** the Relationships section appears before Stories.
2. **Given** an admin selects an image as a character's avatar, **When** they adjust and save its crop, **Then** the character profile uses the saved crop for that avatar.
3. **Given** one image is used as the avatar for more than one character, **When** the crop is adjusted for one character, **Then** the other character's crop and the original image remain unchanged.
4. **Given** an avatar has no saved crop or is replaced, **When** it is displayed, **Then** a centered default crop is used and the admin can adjust it.

### Edge Cases

- An artist may be credited as both a designer and an image artist; the artist appears once in navigation and on the Artists page.
- Existing designer and artist entries may have the same name; migration must preserve credit links and resolve duplicate identities consistently.
- A new artist name may duplicate an existing name with different capitalization; the upload flow must explain the conflict and allow the existing artist to be selected.
- A character may have many tags or long tag names; bubbles wrap without clipping or creating horizontal page scroll.
- SFW/NSFW percentages are well-defined when no images exist and when all linked images have one rating.
- A multi-character image counts once for each character association in both per-character counts and overall linked-image totals.
- The statistics chart remains understandable and has an equivalent summary when many characters are present or visual charts are unavailable.
- A cropped avatar may be deleted or become unavailable; the existing avatar fallback behavior remains available.
- Guests must not receive ownership data or admin statistics in page markup, not merely have them hidden visually.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST use one reusable artist identity for both character design credits and image artist credits.
- **FR-002**: The public navigation MUST provide one Artists destination for artists credited as designers, image artists, or both.
- **FR-003**: The Artists page MUST list each artist once and continue grouping visible artwork by artist; artists with design credits remain discoverable even if they have no visible image.
- **FR-004**: A data migration MUST preserve existing designer and artist names, website links, character credits, image credits, and artwork associations while consolidating identities.
- **FR-005**: The admin image-upload flow MUST allow selecting an existing artist or creating an artist with a name and optional website link without leaving the upload flow.
- **FR-006**: Artist creation and image upload MUST validate all fields and either save the complete operation or leave no partial artist/image records or files.
- **FR-007**: Gender options MUST be represented as centered-text selectable bubbles wherever genders are chosen or filtered, including public filters and admin character forms; the single-selection behavior MUST remain unchanged.
- **FR-008**: Tag options MUST be represented as centered-text selectable bubbles wherever tags are chosen or filtered, including public filters and admin character forms; multi-selection and existing filter semantics MUST remain unchanged.
- **FR-009**: Gender and tag bubbles MUST visibly distinguish selected and unselected states, MUST NOT display square checkbox controls, MUST wrap at narrow widths, and MUST be keyboard-operable with accessible names and state.
- **FR-010**: Sins and virtues MUST be consolidated into the reusable tag taxonomy, preserving their names and character associations; they MUST no longer be managed or filtered as a separate taxonomy.
- **FR-011**: The character detail page MUST show its tags as bubbles in the upper-right area of the profile.
- **FR-012**: The character detail page MUST place ownership information, terms of use, and transfer permissions at the bottom of the page and MUST render them only for the authenticated admin.
- **FR-013**: The admin dashboard MUST show overall total, SFW, and NSFW linked-image counts.
- **FR-014**: The admin dashboard MUST show total, SFW, and NSFW linked-image counts for each character.
- **FR-015**: Each image-to-character association MUST contribute one count to that character and one count to the overall linked-image total; an image linked to multiple characters contributes once per association.
- **FR-016**: The dashboard MUST show SFW and NSFW percentages as shares of the combined overall linked-image total, with both percentages set to 0% when the total is zero.
- **FR-017**: The dashboard MUST provide a pie chart representing per-character total linked-image counts and an equivalent accessible text or table summary.
- **FR-018**: Dashboard statistics and all character ownership data MUST be available only to the authenticated admin and MUST NOT be included in pages shown to anonymous visitors.
- **FR-019**: The character detail page MUST display Relationships before Stories.
- **FR-020**: An admin MUST be able to adjust and save a square crop used to display a selected image as a character's avatar.
- **FR-021**: Avatar crop settings MUST be specific to the character-avatar assignment, leaving the original image and any other character's crop unchanged.
- **FR-022**: An avatar without saved crop settings MUST use a centered square crop and retain existing fallback behavior if the image is unavailable.
- **FR-023**: The existing NSFW access rules MUST remain unchanged; public artist groupings and character pages MUST include only content visible under the visitor's NSFW preference.
- **FR-024**: All new layouts and controls MUST remain responsive, keyboard-operable, usable without JavaScript, and meet the site's accessibility and contrast standards.

### Key Entities

- **Artist**: A single reusable creator identity with a name and optional website, credited for character designs, images, or both.
- **Tag**: A reusable label assigned to characters, including values formerly categorized as sins or virtues.
- **Gender selection**: A single selected gender represented by a tappable, accessible bubble.
- **Tag selection**: A set of selected reusable tags represented by tappable, accessible bubbles.
- **Avatar crop**: Per-character presentation settings for the image used as that character's avatar; it does not alter the source artwork.
- **Image-character association**: The link between an image and a character, counted once in that character's statistics and once in the overall linked-image total.
- **Image statistics**: Derived total, SFW, and NSFW counts and percentages based on image-character associations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every existing character designer credit and image artist credit resolves to one artist identity after migration, with 100% of names, available website links, and credit associations preserved.
- **SC-002**: An admin can create an artist and finish an image upload in one continuous upload flow, with no navigation to a separate artist page.
- **SC-003**: Visitors can filter by one gender and multiple tags using the bubble controls, and the resulting character set matches the existing filter semantics.
- **SC-004**: 100% of former sin and virtue values remain searchable as ordinary reusable tags associated with the same characters.
- **SC-005**: Anonymous page responses contain zero ownership fields and no dashboard statistics; an authenticated admin can see ownership at the bottom of a character detail page and the full statistics dashboard.
- **SC-006**: Overall and per-character dashboard counts exactly match the number of applicable image-character associations, separated correctly by SFW and NSFW rating.
- **SC-007**: Displayed SFW and NSFW percentages each match their share of total linked-image associations within one percentage point.
- **SC-008**: Every character has one proportional pie-chart slice and an equivalent text/table value for its total linked-image count.
- **SC-009**: An avatar crop can be changed without changing the source image or another character's crop, and the selected crop is visible after saving.
- **SC-010**: All new selection controls work with keyboard-only interaction and at viewport widths from 320px to 1920px without page-level horizontal scrolling.

## Clarifications

### Session 2026-11-10

- Gender and tag bubbles apply everywhere those values are selected or filtered, including public filters and admin forms.
- A multi-character image contributes once to each linked character and once per character link to the overall linked-image total.
- SFW and NSFW percentages are each calculated as a share of the combined linked-image total; for a zero total both are 0%.
- When same-name designer and artist entries have different website links, migration consolidates them and keeps the existing artist entry's link.
- Avatar recropping is presentation-only and specific to the character; it does not alter the original image or another character's crop.
- Avatar crops are always square.
- Q: Quand vous recadrez l’avatar d’un personnage, voulez-vous modifier seulement son affichage, sans toucher à l’image originale ni aux autres personnages ? → A: Oui, recadrage propre à ce personnage.
- Q: Le cadrage d’avatar doit-il toujours être carré, comme l’avatar affiché sur la fiche du personnage ? → A: Oui, cadrage carré.

## Assumptions

- The existing single-admin authentication and public NSFW preference remain the authority for access control.
- Existing artist and designer identities with the same case-insensitive name are consolidated into one artist; the existing artist entry's website link takes precedence if both entries have different non-empty links.
- The Artists page remains organized by artist and artwork; an artist with a design credit but no visible images is still listed.
- Bubbles preserve existing single-selection gender and multi-selection tag behavior, remain operable without JavaScript, and use native accessible form semantics.
- Ownership comprises the designer/artist credit for the design, terms of use, and regift/retrade/resale permissions already recorded for a character.
- Dashboard statistics are derived from image-character associations and include SFW and NSFW records because they are only available to the authenticated admin.
- Avatar crop settings affect only the rendered avatar presentation; original image files and image credits remain unchanged.
- A centered square crop is the default when no avatar crop has been saved.
