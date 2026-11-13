# Feature Specification: Always Show Avatars in Listings

**Feature Branch**: `015-always-show-avatars`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "For the avatars in the listings, do not hide them, whether NSFW is active or not."

## Clarifications

### Session 2026-11-13

- Q: Sans avatar désigné, que montrer dans les listes avec le NSFW désactivé ? → A: la plus ancienne image quelle que soit sa classification (même NSFW), jamais une vidéo ; le placeholder seulement s'il n'y a aucune image.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Avatars always visible in the gallery (Priority: P1)

A visitor who has not turned on NSFW opens the main gallery and sees every character with their real avatar, even when that avatar is an NSFW image. Today such a character shows a substitute image or the placeholder.

**Why this priority**: This is the whole request: the avatar is the face of the character in every list and should not depend on the NSFW switch.

**Independent Test**: Designate an NSFW image as a character's avatar, leave NSFW off, open the gallery: the card shows that avatar.

**Acceptance Scenarios**:

1. **Given** a character whose designated avatar is NSFW and NSFW is off, **When** the visitor opens the gallery, **Then** the card shows that designated avatar with its crop.
2. **Given** the same character and NSFW on, **When** the visitor opens the gallery, **Then** the card looks identical.
3. **Given** a character without a designated avatar, **When** the gallery is shown with NSFW off, **Then** the card shows the character's oldest image (any rating, videos excluded), or the placeholder if there is none.
4. **Given** a character whose avatar is NSFW, **When** the visitor toggles NSFW, **Then** the avatar does not change.

---

### User Story 2 - Same avatars on the relationship map and other listings (Priority: P1)

Every other place that lists characters with an avatar (the relationship maps and any similar list) shows the same avatar as the gallery, regardless of the NSFW switch.

**Why this priority**: The gallery and the map must stay consistent (the map already mirrors the gallery avatar).

**Independent Test**: With NSFW off, compare a character's avatar in the gallery and on the relationship map: identical.

**Acceptance Scenarios**:

1. **Given** NSFW is off, **When** the visitor opens the relationships page, **Then** each character shown there uses the same avatar as the gallery.
2. **Given** a character who appears only in NSFW relationships, **When** NSFW is off, **Then** the character is still not listed (relationship visibility is unchanged; only avatars are affected).

---

### User Story 3 - Nothing else becomes visible (Priority: P1)

Only the avatar image of a character is exempt from the NSFW switch. All other NSFW content stays hidden until the visitor opts in.

**Why this priority**: The rest of the site's adult-content protection must not weaken.

**Independent Test**: With NSFW off, request an NSFW image that is not anyone's avatar: it is still reported as not found. Open a character page: NSFW pictures, stories and relationships are still hidden.

**Acceptance Scenarios**:

1. **Given** NSFW is off and an NSFW image that is nobody's avatar, **When** it is requested directly, **Then** it is not found.
2. **Given** NSFW is off and a character whose avatar is NSFW, **When** the visitor opens the character page, **Then** the avatar is shown as the page header, but the NSFW image does not appear in the character's picture list.
3. **Given** NSFW is off, **When** any other image of an NSFW-avatar character is requested directly, **Then** it is not found.
4. **Given** an image that was an avatar and stops being one, **When** NSFW is off, **Then** it is hidden again from the visitor.

## Edge Cases

- A character's designated avatar is a video: it is not used as an avatar, as today; the fallback applies.
- An NSFW avatar shared by several characters: shown for each, and nowhere else.
- The avatar image is deleted or unlinked from the character: the fallback applies.
- Alt text on an NSFW avatar is shown with it; it must not describe more than the avatar itself.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A character's avatar MUST be shown in every character listing (gallery, relationship maps, other lists) whether the visitor has NSFW on or off.
- **FR-002**: The avatar shown MUST be the same with NSFW on and off, and the same in every listing.
- **FR-003**: Avatar choice MUST be: the designated avatar if set (not a video); otherwise the character's oldest image regardless of rating (not a video); otherwise the placeholder.
- **FR-004**: The saved avatar crop MUST continue to apply.
- **FR-005**: An image MUST be viewable with NSFW off only if it is the avatar currently shown for at least one character; every other NSFW image MUST still be reported as not found.
- **FR-006**: The exemption MUST NOT reveal any other NSFW content: pictures, stories, relationships, and the existence of NSFW-only characters or relationships stay governed by the NSFW switch.
- **FR-007**: The project constitution MUST be amended to record this exemption before the feature is delivered, since the content-rating principle currently forbids it.
- **FR-008**: The admin MUST be able to tell, when choosing an avatar, that an NSFW image will be visible to everyone.

### Key Entities

- **Avatar**: the image that represents a character in listings; may be of either rating; defined by the designated avatar or the fallback rule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of characters in listings show the same avatar with NSFW on and off.
- **SC-002**: 0 NSFW images other than current avatars are viewable with NSFW off.
- **SC-003**: Gallery and relationship map show the same avatar for 100% of characters.
- **SC-004**: With NSFW off, 0 NSFW pictures, stories, or relationships appear on a character page or in any list.

## Assumptions

- "Listings" means every list or card view of characters, including the gallery and relationship maps; the character detail page header also uses the avatar.
- The fallback (no designated avatar) also ignores rating, so an NSFW-only character is never shown with a placeholder just because of the switch.
- This is a deliberate, owner-requested relaxation of the existing adult-content rule, limited to avatars; it needs a constitution amendment (FR-007).
- Sorting, filtering and which characters are listed are unchanged.
