# Feature Specification: Modern Interface & Interactive Relationship Map

**Feature Branch**: `002-modern-ui-relationship-map`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "l'interface doit être plus moderne et la carte des relations doit être de la forme suivante : chaque personnage est représenté par son avatar et a un trait qui va vers l'avatar de l'autre personnage. On peut voir la relation marquée au milieu du trait. Il faut pouvoir bouger les avatars si on veut et par défaut on a la vision avec les traits qui se coupent le moins pour que ce soit lisible. Aussi ajoute un bouton pour supprimer les personnages pour l'admin et ajoute un bouton pour retourner à la page d'admin si on est connecté en admin"

## Context

This feature refines the existing OC photo gallery (see `specs/001-oc-photo-gallery/spec.md`). It changes how the relationship overview page is presented, refreshes the visual design across the site, and closes two gaps in the admin experience.

It supersedes the *presentation* described in 001 FR-007 (relationship overview rendered as two text lists). It does **not** change the relationship data model, the NSFW gating rules (001 FR-009 to FR-015), or the deletion confirmation rule (001 FR-053).

## Clarifications

### Session 2026-10-01

- Q: How should a character's detail page be laid out? → A: Avatar top-left, with the basic-information summary beside it; below that, the image gallery and then the story gallery.
- Q: How should a character's stories be presented on the detail page? → A: The story text itself must be shown on the detail page, not offered as a link to somewhere else.
- Q: Should every story's full text be expanded at all times, or start collapsed? → A: Each story starts collapsed to its title and opening lines, and expands in place on the same page.
- Q: Should a visitor's dragged map arrangement be remembered between visits? → A: No. The map resets to the default arrangement on every reload; no positions are stored.
- Q: What should a visitor see when the map's interactive behaviour is unavailable? → A: The map arrives already drawn — avatars, lines, and midpoint labels — with the same default arrangement; interactivity adds only dragging.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read relationships as a visual map (Priority: P1)

A visitor opens the relationship page and sees each character drawn as their avatar. A line connects every pair of characters that have a relationship, and the relationship label is written at the middle of that line. The visitor can tell at a glance who is connected to whom and how, without reading a list.

**Why this priority**: This is the core of the request and the main reason the page exists. The current two-list presentation does not convey the shape of the cast's connections.

**Independent Test**: Load the relationship page with a seeded cast that has several relationships; confirm every character involved in at least one relationship appears as an avatar, every relationship appears as a line between the correct two avatars, and every line carries its label at the line's midpoint.

**Acceptance Scenarios**:

1. **Given** two characters with a recorded SFW relationship, **When** a visitor opens the relationship page, **Then** both characters appear as their avatar images, a line joins the two avatars, and the relationship label is shown at the midpoint of that line.
2. **Given** a character with no relationships, **When** a visitor opens the relationship page, **Then** that character is not drawn on the map.
3. **Given** a character whose relationships exist but whose avatar is not viewable under the visitor's current NSFW setting, **When** the map is drawn, **Then** the character is represented by the same neutral placeholder used on the gallery, and no hidden image is transferred.
4. **Given** a visitor hovers over or focuses an avatar on the map, **When** the avatar is activated, **Then** the visitor is taken to that character's detail page.
5. **Given** two characters connected by more than one relationship, **When** the map is drawn, **Then** each relationship is distinguishable and each label is readable rather than overlapping into an unreadable cluster.

---

### User Story 2 - Keep the SFW and NSFW maps separate (Priority: P1)

A visitor who has not opted in sees only SFW relationships on the map. A visitor who has opted in sees both, still presented as two clearly separated maps so it is obvious which relationships are NSFW.

**Why this priority**: The project's first principle is that NSFW content never leaks to a visitor who has not opted in. Changing the presentation must not weaken that.

**Independent Test**: Request the relationship page without the opt-in and inspect everything the page returns; confirm no NSFW character name, label, avatar, or coordinate is present anywhere in the response.

**Acceptance Scenarios**:

1. **Given** a visitor who has not opted in, **When** the relationship page is returned, **Then** the NSFW map contains no relationship data of any kind and shows the existing invitation to tick "Show NSFW content".
2. **Given** a visitor who has not opted in, **When** a character appears only in NSFW relationships, **Then** that character's avatar and name do not appear on the page at all.
3. **Given** a visitor who has opted in, **When** the relationship page is returned, **Then** a separate SFW map and a separate NSFW map are both drawn, each clearly labelled.

---

### User Story 3 - Rearrange the map (Priority: P2)

A visitor finds two avatars sitting awkwardly close and drags one of them to a clearer spot. The connecting lines and their labels follow the avatar as it moves.

**Why this priority**: Explicitly requested, and it is what makes a dense map usable. It is an enhancement layered on top of User Story 1, which remains valuable on its own.

**Independent Test**: With a map on screen, drag an avatar from one position to another and confirm the avatar settles where it was released and every line attached to it has been redrawn to the new position with its label re-centred.

**Acceptance Scenarios**:

1. **Given** a map with at least two connected characters, **When** the visitor drags an avatar to a new position, **Then** the avatar moves with the pointer and every line attached to it stays attached at both ends.
2. **Given** an avatar has been dragged, **When** the drag ends, **Then** each affected relationship label is still positioned at the midpoint of its line.
3. **Given** a visitor dragging an avatar beyond the edge of the map area, **When** the drag ends, **Then** the avatar remains within the visible map area.
4. **Given** a visitor using a keyboard only, **When** they focus an avatar and use the documented repositioning keys, **Then** the avatar moves in the same way as with a pointer.
5. **Given** a visitor has rearranged the map, **When** they reload the page, **Then** the map returns to the default arrangement described in User Story 4.

---

### User Story 4 - Get a readable arrangement by default (Priority: P2)

A visitor opens the relationship page and the avatars are already laid out so the connecting lines cross each other as little as possible, making the map readable before any manual adjustment.

**Why this priority**: Without a sensible default the map is a tangle and User Story 1 fails in practice. It is separable because a simple arrangement still delivers a working map.

**Independent Test**: Load the relationship page for a seeded cast and count line crossings; confirm the selected arrangement has the lowest count among the deterministic layouts evaluated, is no worse than the naive arrangement, and is identical every time the same data is loaded.

**Acceptance Scenarios**:

1. **Given** a cast with several deterministic candidate layouts, **When** the page loads, **Then** the system uses an evaluated layout with the fewest crossings; a crossing-free result is preferred but is not required.
2. **Given** the same set of characters and relationships, **When** the page is loaded twice, **Then** the default arrangement is identical both times.
3. **Given** a cast split into several groups with no relationships between the groups, **When** the page loads, **Then** the groups are placed apart from one another rather than overlapping.
4. **Given** the map is viewed on a narrow phone-width screen, **When** the page loads, **Then** the whole map is reachable, avatars do not overlap each other, and labels remain readable.

---

### User Story 5 - Admin deletes a character (Priority: P2)

An admin realises a character should no longer be on the site. From the admin area they use a clearly marked delete control, confirm the deletion by naming the character, and the character disappears from the gallery, the relationship map, and the artist pages.

**Why this priority**: The ability to delete a character already exists behind the scenes but there is no way to reach it from the interface, so the feature is currently unusable.

**Independent Test**: Sign in as admin, open the character list, use the delete control on a character, confirm, and verify the character and its dependent content are gone from every public page.

**Acceptance Scenarios**:

1. **Given** an admin viewing the character list, **When** they look at a character's row, **Then** a clearly marked delete control is available for that character.
2. **Given** an admin viewing a character's edit page, **When** they scroll to the end of the form, **Then** a clearly marked delete control is available, visually distinguished from the save action.
3. **Given** an admin activates the delete control, **When** they are asked to confirm, **Then** they must type the character's name exactly before the deletion is accepted.
4. **Given** an admin confirms with a name that does not match, **When** they submit, **Then** the character is not deleted and the mismatch is explained.
5. **Given** a character has been deleted, **When** any public page is loaded, **Then** the character, its images, its stories, and its relationships no longer appear anywhere.
6. **Given** a visitor who is not signed in as admin, **When** they view any public page, **Then** no delete control is present.

---

### User Story 6 - Return to the admin area (Priority: P3)

An admin following a "view" link lands on a public page, finishes checking it, and uses a visible control to go straight back to the admin area instead of retyping the address.

**Why this priority**: A small but constant friction for the only person who administers the site. Independent of every other story.

**Independent Test**: Sign in as admin, navigate to a public page, and confirm a control returning to the admin home is visible and works; sign out and confirm the control is gone.

**Acceptance Scenarios**:

1. **Given** an admin is signed in, **When** they view any public page, **Then** a control returning them to the admin area is visible in the site header.
2. **Given** an admin activates that control, **When** the page loads, **Then** they arrive at the admin home page.
3. **Given** a visitor who is not signed in, **When** they view any public page, **Then** no such control is shown and nothing reveals whether an admin exists beyond the existing sign-in entry point.
4. **Given** an admin is already inside the admin area, **When** they view an admin page, **Then** navigation back to the admin home remains available without duplicating the control confusingly.

---

### User Story 7 - A more modern interface (Priority: P2)

A visitor arriving at the site sees a contemporary, polished presentation — considered spacing, a coherent colour and type system, and gallery cards and detail pages that feel current rather than like an unstyled document.

**Why this priority**: Explicitly requested and affects every page, but the site is functional without it, so it does not block the map work.

**Independent Test**: Load every page type at phone, tablet, and desktop widths and confirm the refreshed presentation is applied consistently, with all existing content, controls, and links still present and operable.

**Acceptance Scenarios**:

1. **Given** the refreshed interface, **When** any page is loaded, **Then** spacing, colours, and typography follow one consistent system across the gallery, character detail, relationship, artist, and admin pages.
2. **Given** the refreshed interface, **When** a page is loaded at any width from a small phone to a wide desktop, **Then** the layout adapts without horizontal scrolling or overlapping content.
3. **Given** the refreshed interface, **When** any interactive control is reached by keyboard, **Then** it shows a clearly visible focus indicator.
4. **Given** the refreshed interface, **When** text and controls are inspected for contrast, **Then** they meet recognised accessibility contrast guidance.
5. **Given** the refreshed interface, **When** styling is unavailable, **Then** every page's content and controls remain readable and operable in document order.

---

### User Story 8 - Read a character's page as a single profile (Priority: P2)

A visitor opens a character's page and immediately sees the character's avatar at the top left with all the basic facts about them laid out beside it. Scrolling down, they find the character's images, and below that the character's stories — with each story's text written out on the page, so there is nothing further to click through to read it.

**Why this priority**: The character page is the destination of every gallery click and currently has no avatar and no readable story text. Fixing it delivers value on its own, independent of the relationship map.

**Independent Test**: Open a character who has an avatar, several images, and at least one story; confirm the avatar sits at the top left with the summary beside it, the image gallery follows, the story gallery follows that, and each story's full text is readable without leaving the page.

**Acceptance Scenarios**:

1. **Given** a character with a viewable avatar, **When** their detail page is opened, **Then** the avatar appears at the top left of the page with the character's name, gender, job titles, short description, tags, sins and virtues, designer, terms of use, and permissions presented beside it.
2. **Given** a character whose avatar is not viewable under the visitor's current content setting, **When** their detail page is opened, **Then** the same neutral placeholder used on the gallery appears in the avatar position.
3. **Given** a character with images, **When** their detail page is opened, **Then** the image gallery appears below the avatar-and-summary block.
4. **Given** a character with stories, **When** their detail page is opened, **Then** the story gallery appears below the image gallery, and each story's title and opening lines are shown.
5. **Given** a story shown collapsed on a character's page, **When** the visitor expands it, **Then** the full text appears in place on the same page without navigating away.
6. **Given** a character has a story the visitor is not allowed to see under their current content setting, **When** the detail page is built, **Then** neither that story's title nor any part of its text is present in the page.
7. **Given** the detail page is viewed at phone width, **When** it is opened, **Then** the avatar and summary stack readably instead of being squeezed side by side.

---

### Edge Cases

- What happens when no relationships exist at all? The map area shows the existing empty-state message rather than a blank frame.
- What happens when the cast is large (for example 100 characters and several hundred relationships)? The map must still render and remain navigable, and the arrangement must still be produced within a time that does not make the page feel broken.
- What happens when two characters have relationships in both directions, or several relationships with different labels? Each must be individually readable.
- What happens when a relationship label is very long? The label must not cover neighbouring avatars or become unreadable; it is shortened or wrapped while the full text stays available.
- What happens when a character has no avatar image at all? The same neutral placeholder as the gallery is used.
- What happens when an avatar is dragged exactly on top of another? Both must remain individually identifiable and selectable.
- What happens when an admin deletes a character while another admin view of that character is open? The second attempt reports that the character no longer exists rather than failing opaquely.
- What happens when an admin's session expires while they are on a public page? The return-to-admin control stops being shown, and following a stale one leads to the sign-in page.

## Requirements *(mandatory)*

### Functional Requirements

#### Relationship map

- **FR-001**: System MUST present the relationship overview as a map in which each character involved in at least one relationship is drawn once, represented by their avatar image.
- **FR-002**: System MUST draw a line between the two avatars of every relationship the visitor is allowed to see.
- **FR-003**: System MUST display each relationship's label at the midpoint of its line.
- **FR-004**: System MUST omit from the map any character that has no relationship visible to the current visitor.
- **FR-005**: System MUST make each avatar on the map a link to that character's detail page.
- **FR-006**: System MUST keep every relationship distinguishable and every label readable when two characters share more than one relationship.
- **FR-007**: System MUST show the existing empty-state message when a map has no relationships to draw.
- **FR-008**: System MUST continue to present SFW relationships and NSFW relationships as two separate, clearly labelled maps.
- **FR-009**: System MUST exclude every piece of NSFW relationship data — character names, avatars, labels, and positions — from the relationship page when the visitor has not opted in.
- **FR-010**: System MUST use the same neutral placeholder as the gallery for any character whose avatar is not viewable under the visitor's current NSFW setting, without transferring the hidden image.
- **FR-011**: System MUST serve map avatars as reduced-size previews rather than originals.

#### Default arrangement

- **FR-012**: System MUST select a default arrangement with the fewest crossing lines among its evaluated deterministic candidate layouts, preferring a crossing-free arrangement when one is evaluated; if a crossing-free arrangement is not found, the system MUST still choose the lowest-crossing evaluated layout and MUST NOT do worse than the naive name-ordered arrangement.
- **FR-013**: System MUST produce the same default arrangement every time for the same set of characters and relationships.
- **FR-014**: System MUST place groups of characters that have no relationships between them apart from one another.
- **FR-015**: System MUST keep every avatar and every label inside the map area in the default arrangement, at screen widths from small phone to wide desktop.

#### Rearranging

- **FR-016**: Users MUST be able to move any avatar on the map to a new position by pointer drag and by touch drag.
- **FR-017**: System MUST redraw every line attached to a moved avatar, keeping both ends attached and each label at the new midpoint, while the avatar is moving and once it is released.
- **FR-018**: System MUST keep a dragged avatar within the visible map area.
- **FR-019**: Users MUST be able to move a focused avatar using the keyboard, and the available keys MUST be discoverable on the page.
- **FR-020**: System MUST reset the map to the default arrangement when the page is reloaded, and MUST NOT store avatar positions for any visitor or for the site as a whole.
- **FR-021**: System MUST deliver the map already drawn — avatars, connecting lines, and midpoint labels — so that it is fully readable without any interactive behaviour, with the same default arrangement in both cases. Interactive behaviour MUST add only the ability to drag avatars.
- **FR-021a**: System MUST convey every visible relationship to assistive technology as a readable pairing of the two character names and the relationship label, independent of the drawn map.

#### Admin character deletion

- **FR-022**: System MUST offer a clearly marked delete control for each character in the admin character list.
- **FR-023**: System MUST offer a clearly marked delete control on the admin character edit page, visually distinguished from the save action.
- **FR-024**: System MUST require the admin to type the character's name exactly before accepting a character deletion, and MUST reject and explain a mismatch without deleting.
- **FR-025**: System MUST remove a deleted character's images, stories, and relationships from every public page, including the gallery, the artist page, and the relationship map.
- **FR-026**: System MUST NOT show any delete control to a visitor who is not signed in as admin.
- **FR-027**: System MUST report clearly when a delete is attempted on a character that no longer exists, rather than failing opaquely.

#### Return to admin

- **FR-028**: System MUST show a control in the site header, on every public page, that returns a signed-in admin to the admin home page.
- **FR-029**: System MUST hide that control from visitors who are not signed in as admin.
- **FR-030**: System MUST place the control so it does not displace or obscure the existing NSFW opt-in checkbox or the sign-in/sign-out entry point.

#### Character detail page

- **FR-037**: System MUST display a character's avatar at the top left of their detail page, with the character's basic information summary presented beside it.
- **FR-038**: System MUST include the character's name, gender, job titles, short description, tags, sins and virtues, designer, terms of use, and permissions in that summary.
- **FR-039**: System MUST use the same neutral placeholder as the gallery when a character's avatar is not viewable under the visitor's current content setting.
- **FR-040**: System MUST place the character's image gallery below the avatar-and-summary block, and the character's story gallery below the image gallery.
- **FR-041**: System MUST display each visible story's full text on the character's detail page rather than linking to it elsewhere.
- **FR-041a**: System MUST show each story collapsed to its title and opening lines by default, and MUST let the visitor expand it to its full text in place on the same page without navigating away.
- **FR-041b**: System MUST keep every visible story's full text reachable when the expand control cannot run interactively.
- **FR-042**: System MUST exclude both the title and the text of any story the visitor is not allowed to see under their current content setting.
- **FR-043**: System MUST stack the avatar and the summary readably at narrow screen widths rather than keeping them side by side.

#### Interface refresh

- **FR-031**: System MUST apply one consistent visual system — spacing, colour, and typography — across every public and admin page.
- **FR-032**: System MUST preserve every existing page, control, link, and piece of content through the refresh. Page layout and the arrangement of sections within a page MAY be reorganised where it improves readability; routes and navigation structure MUST NOT change.
- **FR-033**: System MUST adapt every page to screen widths from small phone to wide desktop without horizontal scrolling or overlapping content.
- **FR-034**: System MUST show a clearly visible focus indicator on every interactive control reached by keyboard.
- **FR-035**: System MUST meet recognised accessibility contrast guidance for text and interactive controls.
- **FR-036**: System MUST keep every page's content and controls readable and operable in a sensible order when styling is unavailable.

### Key Entities

- **Map node**: One character shown on the relationship map. Carries the character's name, avatar (preview or placeholder), link to their detail page, and a position within the map area.
- **Map edge**: One relationship drawn as a line between two map nodes. Carries the relationship label, which is displayed at the line's midpoint, and the SFW/NSFW rating that decides which map it belongs to.
- **Map arrangement**: The set of node positions used to draw a map. Produced by default from the characters and relationships alone, and changed temporarily when a visitor drags an avatar.

No new stored data is introduced. Map arrangements are computed for display only and are never saved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of relationships a visitor is allowed to see appear on the map as a line between the correct two avatars, with the correct label at the line's midpoint.
- **SC-002**: 0 NSFW character names, avatars, labels, or positions appear anywhere in the relationship page delivered to a visitor who has not opted in.
- **SC-003**: The default arrangement has the lowest crossing count among the deterministic candidate layouts evaluated for the cast. A crossing-free layout is preferred when one is found, but 0 crossings are not required; the chosen layout never has more crossings than the naive name-ordered arrangement.
- **SC-004**: The default arrangement for a given set of characters and relationships is identical across 10 consecutive loads.
- **SC-005**: A visitor can move any avatar and see all its lines and labels follow it, with no line left detached, in 100% of attempts.
- **SC-006**: The relationship page shows every visible relationship as a drawn line with its label even when no interactive behaviour is available.
- **SC-007**: The relationship map for a cast of 100 characters and 300 relationships becomes readable within 3 seconds of the page appearing.
- **SC-008**: An admin can delete a character from the admin area in under 30 seconds, and the character is absent from 100% of public pages immediately afterwards.
- **SC-009**: 0 delete controls are reachable by a visitor who is not signed in as admin.
- **SC-010**: A signed-in admin can get from any public page back to the admin home in one action.
- **SC-011**: Every page renders without horizontal scrolling or overlapping content at every width from 320 pixels to 1920 pixels.
- **SC-012**: 100% of interactive controls show a visible focus indicator when reached by keyboard, and text and controls meet recognised contrast guidance.
- **SC-013**: Every page, control, and link that existed before the interface refresh is still present and operable afterwards.
- **SC-014**: 100% of a character's visible stories are readable in full on their detail page with 0 further navigation.
- **SC-015**: 0 titles or text fragments of non-viewable stories appear in a character detail page delivered to a visitor who has not opted in.

## Assumptions

- The relationship data model, the NSFW opt-in mechanism, and the existing confirmation-by-name deletion rule are reused unchanged; this feature changes presentation and adds missing controls only.
- "Avatar" means the character's existing representative image as already used on the gallery, served as a reduced-size preview.
- The map is read-only with respect to the data: dragging an avatar rearranges the view and never creates, edits, or deletes a relationship.
- Admin remains the only account type; the return-to-admin control and the delete controls are tied to the existing admin session.
- The admin home page already exists and is the correct destination for the return control.
- "More modern" is judged against the existing site, not against a named design system; no third-party visual framework is assumed to be required.
- Relationship labels are short phrases; very long labels are shortened or wrapped in the map view while the full text remains available.
- Manual browser interaction checks target PC users; touch-specific manual checks are not required.
- Existing responsive and accessibility requirements from feature 001 (FR-033, FR-034) continue to apply and are tightened here rather than replaced.
