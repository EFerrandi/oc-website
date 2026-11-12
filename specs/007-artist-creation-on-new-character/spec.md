# Feature Specification: Create Artists While Creating a Character

**Feature Branch**: `007-artist-creation-on-new-character`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "the add new artist is when creating the character not editing it"

## Clarifications

### Session 2026-11-11

- Q: Which artist choices on the "Add a character" form offer "Add a new artist…"? → A: Both the designer and the first image's artist.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a new artist from the "Add a character" form (Priority: P1)

An admin creating a character must be able to create a new artist right there, instead of having to leave the form, create the artist elsewhere, and come back. This applies to both artist choices on that form: the character's designer and the artist of the first image.

**Why this priority**: Creating a character requires a designer and an image with an artist. Today the form only lists existing artists, so adding a character with a new artist forces extra navigation and loses the typed data.

**Independent Test**: Open "Add a character", choose "Add a new artist…" for the designer and for the first image's artist, enter names (and optional websites), submit; the character is created with the new artists.

**Acceptance Scenarios**:

1. **Given** the "Add a character" form, **When** the admin opens either artist selector, **Then** an "Add a new artist…" option is offered, and choosing it reveals a name field and an optional website field.
2. **Given** a new artist name and valid character details, **When** the form is submitted, **Then** the character, its first image and the new artist are created together and the character's designer or image artist is that new artist.
3. **Given** the designer and the first-image artist are both new and share the same name (case-insensitive), **When** the form is submitted, **Then** one artist is created and used for both.
4. **Given** a new artist name matching an existing artist (case-insensitive), **When** the form is submitted, **Then** the existing artist is reused and no duplicate is created.
5. **Given** the admin chose "Add a new artist…" but left the name empty or entered an invalid website, **When** the form is submitted, **Then** nothing is created, the error names the offending field, and every entered value, including the new-artist fields and the selection, is kept.
6. **Given** the submission fails for any reason, **When** the error is shown, **Then** no character, image, file or artist is left behind.
7. **Given** JavaScript is unavailable, **When** the admin uses the form, **Then** the new-artist fields are still reachable and the form still works.

---

### User Story 2 - Editing a character does not create artists (Priority: P2)

Creating a new artist is part of character creation only. The "Edit character" form keeps selecting among existing artists for the designer, with no "Add a new artist…" option.

**Why this priority**: Matches the request that new-artist creation belongs to character creation, not editing; artists can still be added through the image upload form or the artists administration.

**Independent Test**: Open the edit form of an existing character; the designer selector lists existing artists only and has no new-artist option.

**Acceptance Scenarios**:

1. **Given** the "Edit character" form, **When** it is displayed, **Then** the designer selector has no "Add a new artist…" option or new-artist fields.
2. **Given** a crafted edit submission that carries new-artist fields, **When** it is submitted, **Then** no artist is created from it.

### Edge Cases

- The same new artist is used for designer and first image: created once.
- New artist website left blank: the artist is created without a link.
- Whitespace around names is ignored when matching existing artists.
- Failure after the artist would have been created (for example an invalid image): the artist is not created either.
- The existing image-upload form behavior for new artists is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Add a character" form MUST offer "Add a new artist…" for both the designer and the first image's artist, each revealing a name field and an optional website field.
- **FR-002**: Creating the character, its first image and any new artists MUST be one atomic operation; on any failure nothing is persisted and no uploaded file remains.
- **FR-003**: A new artist whose name matches an existing artist (case-insensitive, whitespace trimmed) MUST reuse that artist; two new artists in the same submission with the same name MUST result in a single artist.
- **FR-004**: A chosen "Add a new artist…" with an empty name, or a website that is not a valid absolute web address, MUST be rejected with an error naming the field, and the form MUST keep all entered values.
- **FR-005**: The new-artist fields MUST be usable without JavaScript.
- **FR-006**: The "Edit character" form MUST NOT offer new-artist creation, and edit submissions MUST NOT create artists.
- **FR-007**: The existing image-upload new-artist behavior and the existing artist rules (name uniqueness, link validation) MUST remain unchanged.

### Key Entities

- **Artist**: A creator with a name and an optional website; used as character designer and as image artist.
- **Character creation submission**: The character, its first image and any new artists, saved together or not at all.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a character with a brand-new designer and a brand-new image artist in a single form submission, without visiting another page.
- **SC-002**: 0 duplicate artists are created from the same-name cases above.
- **SC-003**: After any failed submission, 0 partial records or files remain and 100% of entered values are redisplayed.
- **SC-004**: The "Edit character" form offers no new-artist option.

## Assumptions

- "Add new artist" refers to the inline creation already available on the image upload form; it is extended to the character creation form (designer and first image artist) and deliberately excluded from character editing.
- The first image's artist and the designer are two separate selectors, each independently able to create a new artist.
- Artists can still be managed from the existing artists administration and the image upload form.
