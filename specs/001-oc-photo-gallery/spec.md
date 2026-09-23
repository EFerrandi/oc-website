# Feature Specification: OC Photo Gallery Website

**Feature Branch**: `001-oc-photo-gallery`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Create a NodeJS website for a photo gallery of my OC. Each OC have a name, a gender, a short description, one or more job title, images, terms of use, permissions (can be regifted, retraded or resold), a designer (name and link to their website), tags, stories and relationships with other OCs. Images and stories can be SFW or NSFW and can be linked to multiple OC. Images have a short description, an alt text to help, an artist name and an artist link to their website. The main page should be a photo gallery with the avatar, name and job titles of the OC. When you click on one, you go to the details page of the OC with all pictures and stories, the tags, the relationships, etc. You should have an admin to add a new OC, add a new picture, add a new text, edit an OC, etc. On the main page you can filter by tags. You should also have a page that shows the card relationships of everyone. You should have one card for SFW relationships and one for NSFW ones. The user must check a box on the top right corner of the website to see all NSFW content. By default it will only show SFW. The admin login is on the right side of the NSFW box."

## Clarifications

### Session 2026-09-23

- Q: Which fields are mandatory when creating a character? → A: Name, gender, short description, at least one job title, at least one image, at least one tag, a designer, the three permissions, and terms of use
- Q: Which user roles exist in the system? → A: Admin only; all other visitors are anonymous with no account
- Q: Is the artist name required on every image? → A: Yes — an image cannot be saved without an artist name
- Q: Is there a page for browsing all images grouped by artist? → A: Yes — a dedicated artists page grouping every image by its artist
- Q: Must the site be responsive? → A: Yes — all pages must adapt to phone, tablet, and desktop widths
- Q: Can the gallery be filtered by anything besides tags? → A: Yes — visitors can also filter by gender
- Q: What happens when a visitor clicks an artist name? → A: The artist's website opens in a new browser tab
- Q: Should gender be free text, a reusable admin-managed list, or a fixed built-in list? → A: A reusable admin-managed list of gender values that the admin picks from
- Q: Should artists and designers be reusable managed records or typed freshly on each image/character? → A: Reusable managed records (name + website link stored once) that the admin selects from
- Q: How is the mutual requirement between a character needing an image and an image needing a character resolved at creation time? → A: The character creation form includes the first image upload; character and image are saved together in a single step
- Q: When a character's only images are NSFW and the visitor has not opted in, is the character hidden or shown with a placeholder? → A: Shown in the gallery with a neutral placeholder avatar; its detail page shows SFW information and omits NSFW media
- Q: Should admin deletions require confirmation or be reversible? → A: Edits publish immediately; deletions require an explicit confirmation step and are permanent
- Q: Should each character have a place for their sins or virtues, reusable across characters like tags? → A: Yes — a reusable admin-managed list of traits the admin assigns to any number of characters
- Q: Should sins and virtues be one shared list or two separate lists? → A: One reusable list in which each entry is marked as either a sin or a virtue, displayed grouped by kind
- Q: Must every character have at least one sin or virtue? → A: No — traits are optional; a character may have zero, one, or many
- Q: Should visitors be able to filter the gallery by sins and virtues? → A: Yes — a third filter that combines with the existing tag and gender filters
- Q: Is there a limit on the size of an uploaded image? → A: No practical limit for artwork, but a high safety ceiling (100 MB) rejects clearly mistaken files
- Q: What does the visitor see by default, and what happens on click? → A: A reduced-size preview by default; clicking it opens the image at its original size
- Q: Is the enlarged view an overlay or its own page? → A: Each preview is a real link to a full-size view, enhanced into an on-page overlay when JavaScript is available
- Q: Is the reduced-size preview a separate smaller file or the original scaled down by the browser? → A: A genuinely smaller copy generated when the image is uploaded, so gallery pages never download originals

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the OC gallery and open a character (Priority: P1)

A visitor arrives on the site and sees a gallery grid of original characters. Each gallery entry shows the character's avatar, name, and job titles. The visitor clicks an entry and lands on that character's detail page, which shows the description, gender, job titles, tags, the character's sins and virtues, terms of use, usage permissions, designer credit (name linking to the designer's site), the character's images (each with short description, alt text, and artist credit linking to the artist's site), the character's stories, and the character's relationships to other characters.

**Why this priority**: This is the core value of the site — publicly presenting the character collection. Without it there is nothing to administer, filter, or moderate. It is a complete, demonstrable product on its own.

**Independent Test**: With a seeded set of characters, load the home page, confirm avatars/names/job titles render, click a character, and confirm every detail-page section renders with the correct content and working external credit links.

**Acceptance Scenarios**:

1. **Given** at least one published character exists, **When** a visitor opens the home page, **Then** a gallery card is shown for each character displaying avatar, name, and all job titles.
2. **Given** a visitor is on the home page, **When** they select a character card, **Then** they are taken to that character's detail page.
3. **Given** a character has a designer with a website link, **When** the visitor views the detail page, **Then** the designer name is shown and links to the designer's website in a new tab.
4. **Given** a character's image has an artist name and link, **When** the visitor views that image, **Then** the artist credit and link are displayed alongside the image's short description, and the image exposes its alt text to assistive technology.
5. **Given** a character has permissions defined for regifting, retrading, and reselling, **When** the visitor views the detail page, **Then** each permission is clearly shown as allowed or not allowed, along with the terms of use text.
6. **Given** a character has no images, no stories, or no relationships, **When** the visitor views the detail page, **Then** the corresponding section is either hidden or shows an explicit empty-state message rather than a broken layout.
7. **Given** a character has sins and virtues assigned, **When** the visitor views the detail page, **Then** they are displayed grouped under separate "Sins" and "Virtues" headings.
8. **Given** a character has no sins and no virtues assigned, **When** the visitor views the detail page, **Then** the sins and virtues section is omitted without a broken layout.

---

### User Story 2 - NSFW opt-in gating (Priority: P1)

Every page shows an NSFW toggle checkbox in the top-right corner of the site header. By default it is off and only SFW content is visible anywhere on the site. When the visitor checks the box, NSFW images, NSFW stories, and NSFW relationships become visible in addition to SFW content. Unchecking it hides NSFW content again.

**Why this priority**: Content safety is a hard requirement that affects every surface of the site. Shipping the gallery without correct default-safe behaviour would expose visitors to unwanted content, so it must land with the first release.

**Independent Test**: With seeded SFW and NSFW content, load any page with a fresh session and confirm zero NSFW items appear; toggle the checkbox on and confirm NSFW items appear; toggle off and confirm they disappear again; reload and confirm the chosen state is respected.

**Acceptance Scenarios**:

1. **Given** a first-time visitor with no prior choice, **When** any page loads, **Then** the NSFW checkbox is unchecked and no NSFW image, story, or relationship is displayed or retrievable through normal navigation.
2. **Given** a visitor checks the NSFW box, **When** the page updates, **Then** NSFW images, stories, and relationships become visible across the gallery, detail pages, and relationship page.
3. **Given** a visitor checked the NSFW box, **When** they navigate to another page or reload the site, **Then** their NSFW preference persists for the session.
4. **Given** a visitor unchecks the NSFW box, **When** the page updates, **Then** all NSFW content is hidden again immediately.
5. **Given** NSFW mode is off, **When** a character's only images are NSFW, **Then** the character's gallery card shows a neutral placeholder avatar instead of an NSFW image.
6. **Given** NSFW mode is off, **When** someone requests an NSFW item directly by its address, **Then** the item is not served and the visitor sees a "not available" response rather than the content.

---

### User Story 3 - Filter the gallery by tags, gender, and traits (Priority: P2)

On the home page, the visitor can narrow the gallery by one or more tags, by gender, and by one or more traits (sins or virtues). Selecting multiple tags narrows the results to characters that carry all selected tags, and the same applies to traits. A gender selection narrows results to characters of that gender. All three filters combine. Clearing the filters restores the full gallery.

**Why this priority**: Filtering becomes valuable once the collection grows, but the gallery is usable without it.

**Independent Test**: With characters carrying distinct tag sets, genders, and traits, select one tag and confirm only matching characters remain; select a second tag and confirm results narrow further; add a gender and a trait selection and confirm results narrow again; clear filters and confirm the full gallery returns.

**Acceptance Scenarios**:

1. **Given** the home page is loaded, **When** the visitor views the filter controls, **Then** all tags, genders, and traits in use by at least one visible character are offered, with traits grouped under "Sins" and "Virtues" labels.
2. **Given** the visitor selects a tag, **When** the gallery refreshes, **Then** only characters carrying that tag are shown.
3. **Given** the visitor selects two tags, **When** the gallery refreshes, **Then** only characters carrying both tags are shown.
4. **Given** the visitor selects a gender, **When** the gallery refreshes, **Then** only characters of that gender are shown.
5. **Given** the visitor selects a sin or a virtue, **When** the gallery refreshes, **Then** only characters carrying that trait are shown.
6. **Given** the visitor selects two traits, **When** the gallery refreshes, **Then** only characters carrying both traits are shown.
7. **Given** the visitor has a tag, a gender, and a trait selected, **When** the gallery refreshes, **Then** only characters satisfying all three criteria are shown.
8. **Given** a filter combination matches no character, **When** the gallery refreshes, **Then** an empty-state message is shown with a way to clear the filters.
9. **Given** filters are active, **When** the visitor clears them, **Then** the full gallery is restored.

---

### User Story 4 - Relationship overview page (Priority: P2)

A dedicated page shows the relationships across the whole cast as cards. The page presents one card for SFW relationships and one card for NSFW relationships. Each relationship entry names the two characters involved, the type/label of the relationship, and links to both characters' detail pages. The NSFW relationship card only appears when the NSFW toggle is checked.

**Why this priority**: It gives an at-a-glance view of the cast's connections, but individual relationships are already visible on each detail page, so it is an enhancement rather than a blocker.

**Independent Test**: With seeded SFW and NSFW relationships, open the relationship page with NSFW off and confirm only the SFW card appears with correct pairs; enable NSFW and confirm the NSFW card appears with its own pairs.

**Acceptance Scenarios**:

1. **Given** SFW relationships exist, **When** the visitor opens the relationship page, **Then** an SFW relationship card lists every SFW relationship with both character names and the relationship label.
2. **Given** NSFW mode is off, **When** the visitor opens the relationship page, **Then** no NSFW relationship card or NSFW relationship entry is shown.
3. **Given** NSFW mode is on, **When** the visitor opens the relationship page, **Then** a separate NSFW relationship card is shown listing NSFW relationships.
4. **Given** the visitor selects a character name in any relationship entry, **When** the link is followed, **Then** that character's detail page opens.
5. **Given** no relationships of a given rating exist, **When** the relationship page loads, **Then** the corresponding card shows an empty-state message.

---

### User Story 5 - Browse all images grouped by artist (Priority: P3)

A dedicated artists page lists every image on the site grouped under the artist who drew it. Each group is headed by the artist's name, which opens that artist's website in a new tab when clicked. Under each artist heading, the visitor sees that artist's images with their short descriptions and links through to the characters each image is linked to. Only images visible at the current NSFW setting are included.

**Why this priority**: It credits artists prominently and offers an alternative way to explore the collection, but the same images are already reachable through character detail pages.

**Independent Test**: With images from several artists, open the artists page and confirm each artist appears once with all of their visible images beneath them, that artist names link out in a new tab, and that toggling NSFW changes which images and artists appear.

**Acceptance Scenarios**:

1. **Given** images by multiple artists exist, **When** the visitor opens the artists page, **Then** each artist appears exactly once as a group heading with all of their visible images grouped beneath.
2. **Given** an artist has a website link recorded, **When** the visitor clicks the artist name, **Then** the artist's website opens in a new browser tab.
3. **Given** an artist has no website link recorded, **When** the visitor views the artist group, **Then** the artist name is displayed as plain text with no broken link.
4. **Given** NSFW mode is off, **When** the visitor opens the artists page, **Then** no NSFW image is shown, and an artist whose images are all NSFW does not appear at all.
5. **Given** NSFW mode is on, **When** the visitor opens the artists page, **Then** that artist's NSFW images are included in their group.
6. **Given** the visitor selects an image on the artists page, **When** the link is followed, **Then** they can reach the detail page of a character that image is linked to.

---

### User Story 6 - Administer characters, images, and stories (Priority: P2)

the admin signs in through an admin login entry point placed immediately to the right of the NSFW checkbox in the site header. Once authenticated, the admin can create a new character, edit or delete an existing character, upload and describe images, write and edit stories, manage tags, manage relationships between characters, and set each image's and story's SFW/NSFW rating. Images and stories can be linked to more than one character.

**Why this priority**: The site can launch with seeded content, but it cannot be maintained without the admin screens. They are essential shortly after the public experience works.

**Independent Test**: Sign in as the admin, create a character together with its first image and a story, link that image to a second character, sign out, and confirm the new content appears correctly on the public pages with the right rating behaviour.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they attempt to reach any admin screen or perform any admin action, **Then** they are denied and redirected to the login entry point.
2. **Given** the admin is signed in, **When** they create a character supplying name, a gender chosen from the managed gender list, short description, one or more job titles, terms of use, regift/retrade/resell permissions, a selected designer, at least one tag, optionally any number of traits, and a first image, **Then** the character and its first image are saved together and the character appears in the public gallery.
3. **Given** the admin is creating a character, **When** they omit the image, the tags, the designer, the permissions, or the terms of use, **Then** the submission is rejected naming the missing field and neither the character nor any image is created.
4. **Given** the admin is signed in, **When** they upload an additional image supplying alt text, a selected artist, an SFW/NSFW rating, and one or more linked characters, **Then** the image is saved and appears on every linked character's detail page subject to the rating rules.
5. **Given** the admin is uploading an image, **When** no artist is selected, **Then** the upload is rejected with a message naming the missing artist.
6. **Given** the admin is signed in, **When** they create a story with a title, body, SFW/NSFW rating, and one or more linked characters, **Then** the story appears on every linked character's detail page subject to the rating rules.
7. **Given** the admin is signed in, **When** they define a relationship between two characters with a label and SFW/NSFW rating, **Then** the relationship appears on both characters' detail pages and on the relationship page in the matching card.
8. **Given** the admin is signed in, **When** they edit a character, image, story, or relationship, **Then** the change is reflected on the public pages immediately after saving.
9. **Given** the admin chooses to delete any item, **When** the deletion is requested, **Then** an explicit confirmation naming the item is required before it is permanently removed.
10. **Given** the admin is signed in, **When** they edit an artist's or designer's name or link, **Then** the updated credit appears everywhere that artist or designer is credited.
11. **Given** the admin submits an admin form with a required field missing or an invalid link, **When** they save, **Then** the entry is rejected with a message naming the offending field and no partial record is created.
12. **Given** the admin deletes a character that is linked to shared images or stories, **When** the deletion completes, **Then** those shared items remain available to the other characters they are linked to.
13. **Given** the admin is signed in, **When** they choose to sign out, **Then** the admin session ends and admin screens become inaccessible again.
14. **Given** the admin is signed in, **When** they create a trait marked as a sin or a virtue and assign it to several characters, **Then** it appears on each of those characters' detail pages under the matching heading and in the gallery trait filter.
15. **Given** the admin renames a trait or changes it from a sin to a virtue, **When** they save, **Then** every character carrying it and the gallery filter reflect the change.
16. **Given** the admin deletes a trait that is assigned to characters, **When** the deletion is confirmed, **Then** the trait is removed from those characters and they remain valid.

---

### Edge Cases

- A character's images are all NSFW while NSFW mode is off — the gallery card must fall back to a neutral placeholder avatar (a character always has at least one image, so a truly imageless character cannot exist).
- The admin tries to remove a character's last image, last tag, or last job title, or to clear its designer, permissions, or terms of use — the change must be rejected because those are mandatory.
- The admin tries to save an image without an artist name — the upload must be rejected with a message naming the missing field.
- An artist has no website link recorded — the artist name must still be displayed as plain text on both image credits and the artists page, with no broken link.
- The admin tries to create an artist or designer whose name differs from an existing one only by letter case or surrounding whitespace — it must be rejected as a duplicate so the artists page keeps one group per artist.
- The admin tries to delete an artist, designer, gender value, or tag still referenced by an image or character — the deletion must be refused with a message identifying what still uses it.
- A gender or tag no longer matches any character after NSFW mode changes — it must disappear from the corresponding filter list.
- A trait is no longer assigned to any character — it must disappear from the gallery trait filter while remaining available in the admin trait list for reuse.
- The admin creates a trait whose name matches an existing one apart from letter case or surrounding whitespace — it must be rejected as a duplicate, even if the other entry has the opposite sin/virtue marking.
- The admin deletes a trait still assigned to characters — unlike tags, the deletion proceeds after confirmation and the trait is simply removed from those characters, because traits are optional.
- A character carries only sins, or only virtues — the detail page must show just the populated heading rather than an empty counterpart.
- An image or story is linked to characters and then unlinked from all of them — it must not become orphaned and unreachable for the admin to fix or delete.
- A relationship is defined between a character and itself, or the same pair is entered twice — both must be rejected with a clear message.
- A tag is removed from the last character using it — it must no longer appear in the home page filter list.
- An uploaded file is not a supported image type, or is so large it exceeds the safety ceiling — upload is rejected with a clear message and no partial record is stored.
- An uploaded image is already smaller than the preview dimensions — the preview must reuse it as-is rather than enlarging it, and clicking must still open the original.
- An image's preview copy is missing or failed to generate — the image must not render as broken; the admin must be able to see that the preview needs regenerating.
- A visitor with JavaScript disabled clicks a preview — the full-size view must still open as an ordinary page rather than doing nothing.
- A visitor opens the overlay and presses Escape or activates the close control — the overlay must close and keyboard focus must return to the preview that opened it.
- A visitor on a phone opens a very large original — the full-size view must remain pannable and must not break the page layout.
- A designer or artist link is missing or malformed — the name must still display without a broken link.
- Repeated failed admin sign-in attempts — further attempts must be throttled.
- An admin session is left idle for a long time — it must expire and require signing in again.
- Very long descriptions, stories, or long lists of job titles, tags, and traits — layout must remain readable without overflow.
- A visitor with images disabled or using a screen reader — alt text must convey each image's purpose.

## Requirements *(mandatory)*

### Functional Requirements

#### Public browsing

- **FR-001**: System MUST present a home page gallery containing one card per character, each showing the character's avatar, name, and all of its job titles.
- **FR-002**: System MUST link each gallery card to that character's detail page.
- **FR-003**: System MUST display on a character detail page: name, gender, short description, all job titles, tags, the character's sins and virtues grouped under separate "Sins" and "Virtues" headings, terms of use, the regift/retrade/resell permission values, designer name with link, all visible images, all visible stories, and all visible relationships.
- **FR-004**: System MUST display for each image its short description, alt text (exposed to assistive technology), artist name, and artist link.
- **FR-005**: System MUST open external designer and artist links in a new browser tab wherever the designer or artist name is displayed, and MUST display the name as plain text when no valid link is recorded.
- **FR-006**: System MUST show an explicit empty state for any detail-page section that has no visible content.
- **FR-007**: System MUST provide a relationship overview page containing a dedicated SFW relationship card and a dedicated NSFW relationship card, each listing relationships with both character names, the relationship label, and links to both character detail pages.
- **FR-036**: System MUST provide an artists page that lists every image visible at the current rating level, grouped under the name of the artist who created it, with each artist appearing exactly once.
- **FR-037**: System MUST omit an artist from the artists page entirely when none of their images are visible at the current rating level.
- **FR-038**: System MUST allow the visitor to reach a linked character's detail page from each image shown on the artists page.
- **FR-063**: System MUST display every image as a reduced-size preview by default wherever images appear — gallery avatars, character detail pages, and the artists page — and MUST NOT transfer the original file to render a preview.
- **FR-064**: System MUST make every preview activate a full-size view of that image at its original dimensions.
- **FR-065**: System MUST implement each preview as an ordinary link to a standalone full-size view so that it works with JavaScript unavailable, and MUST present that full-size view as an on-page overlay instead when JavaScript is available.
- **FR-066**: System MUST allow the full-size overlay to be dismissed by both a visible close control and the Escape key, and MUST return keyboard focus to the preview that opened it.

#### Content rating and gating

- **FR-008**: System MUST render an NSFW opt-in checkbox in the top-right corner of the site header on every page, unchecked by default.
- **FR-009**: System MUST show only SFW images, stories, and relationships while the NSFW checkbox is unchecked.
- **FR-010**: System MUST show both SFW and NSFW images, stories, and relationships while the NSFW checkbox is checked.
- **FR-011**: System MUST persist the visitor's NSFW choice across page navigation and reloads within the same browser session, without requiring an account.
- **FR-012**: System MUST refuse to serve NSFW items (including direct requests for an NSFW image file or story address) when the requester has not opted in, returning a "not available" response instead.
- **FR-070**: System MUST apply the same NSFW gating to an image's preview copy, its full-size original, and its standalone full-size view, so that opting out makes every variant equally unavailable.
- **FR-013**: System MUST hide the NSFW relationship card entirely when the visitor has not opted in.
- **FR-014**: System MUST substitute a neutral placeholder avatar on a gallery card when the character has no image visible at the current rating level, and MUST still list that character in the gallery rather than hiding it.
- **FR-052**: System MUST keep a character's detail page reachable and display its non-media information (name, gender, description, job titles, tags, terms of use, permissions, designer) even when none of its images or stories are visible at the current rating level.

#### Filtering

- **FR-015**: Users MUST be able to filter the home page gallery by one or more tags, with multiple selected tags narrowing results to characters carrying all selected tags.
- **FR-016**: System MUST offer only tags that are in use by at least one character visible at the current rating level.
- **FR-017**: System MUST show an empty-state message with a clear-filters action when a filter selection matches no character.
- **FR-018**: System MUST reflect the active tag, gender, and trait filters in the page address so a filtered gallery can be shared and reloaded.
- **FR-039**: Users MUST be able to filter the home page gallery by gender, and the gender filter MUST combine with any active tag filter so that only characters satisfying both criteria are shown.
- **FR-040**: System MUST offer only gender values in use by at least one character, and MUST provide a way to clear the gender filter.
- **FR-054**: Users MUST be able to filter the home page gallery by one or more traits (sins or virtues), with multiple selected traits narrowing results to characters carrying all selected traits.
- **FR-055**: System MUST combine the trait filter with any active tag and gender filters so that only characters satisfying all active criteria are shown.
- **FR-056**: System MUST present trait filter options grouped under separate "Sins" and "Virtues" labels, offering only traits in use by at least one character, and MUST provide a way to clear the trait filter.

#### Administration

- **FR-019**: System MUST provide an admin sign-in entry point positioned immediately to the right of the NSFW checkbox in the site header.
- **FR-020**: System MUST restrict all content-management screens and actions to an authenticated admin and redirect unauthenticated requests to the sign-in entry point.
- **FR-021**: Admin MUST be able to create, edit, and delete characters, supplying name, a gender selected from the managed gender list, short description, one or more job titles, terms of use, the regift/retrade/resell permissions, a selected designer, one or more tags, and optionally any number of traits.
- **FR-057**: System MUST store traits as a reusable, admin-managed list in which every entry has a name and is marked as either a sin or a virtue, and MUST allow the admin to assign any number of existing traits to any number of characters.
- **FR-058**: Admin MUST be able to create, rename, re-classify (sin ↔ virtue), and delete traits, and MUST be able to create a new trait inline while editing a character.
- **FR-059**: System MUST treat trait names that differ only by letter case or surrounding whitespace as the same trait and reject creating a duplicate.
- **FR-060**: System MUST allow a character to have zero traits, and MUST NOT block character creation or editing on the absence of traits.
- **FR-061**: System MUST propagate a trait rename or re-classification to every character carrying that trait and to the gallery trait filter.
- **FR-041**: System MUST reject a character that does not have all of the following: a name, a gender, a short description, at least one job title, at least one linked image, at least one tag, a designer, the three permission values, and terms of use text.
- **FR-043**: System MUST require the admin to select a character's gender from a reusable, admin-managed list of gender values rather than typing free text, and MUST allow the admin to create, rename, and remove entries in that list.
- **FR-044**: System MUST prevent removal of a gender value that is still assigned to at least one character.
- **FR-049**: System MUST include the first image upload within the character creation form, saving the character and its first image together in a single step so that neither can be left in an invalid state.
- **FR-050**: System MUST abandon the whole submission — creating neither the character nor the image — when either part of a combined character-and-first-image creation fails validation.
- **FR-051**: System MUST reject removing an image from a character when it is that character's only remaining image.
- **FR-022**: Admin MUST be able to upload, edit, and delete images, supplying short description, alt text, a selected artist, SFW/NSFW rating, and links to one or more characters.
- **FR-042**: System MUST reject an image that does not have an artist.
- **FR-045**: System MUST store artists and designers as reusable records holding a name and an optional website link, and MUST require the admin to select an existing record (or create a new one inline) rather than retyping the name and link on each image or character.
- **FR-046**: Admin MUST be able to create, edit, and delete artist and designer records, and the system MUST prevent deletion of a record still referenced by an image or character.
- **FR-047**: System MUST propagate an edit to an artist's or designer's name or link to every image and character crediting that record.
- **FR-048**: System MUST treat artist or designer names that differ only by letter case or surrounding whitespace as the same record and reject creating a duplicate.
- **FR-023**: Admin MUST be able to create, edit, and delete stories, supplying title, body text, SFW/NSFW rating, and links to one or more characters.
- **FR-024**: Admin MUST be able to create, edit, and delete relationships between two distinct characters, supplying a relationship label and an SFW/NSFW rating.
- **FR-025**: System MUST allow a single image or story to be linked to multiple characters and display it on every linked character's detail page.
- **FR-026**: Admin MUST be able to designate which image serves as a character's gallery avatar.
- **FR-027**: System MUST validate admin submissions, rejecting entries with missing required fields, malformed links, unsupported file types, or files above the upload safety ceiling, and MUST report which field failed without creating a partial record.
- **FR-067**: System MUST accept uploaded images of any dimensions and of any file size up to a high safety ceiling of 100 MB, imposing no minimum size, and MUST reject a file above that ceiling with a message stating the actual and maximum size.
- **FR-068**: System MUST generate and store a reduced-size preview copy of every uploaded image at upload time, keeping the original file unmodified, and MUST report the failure without saving a partial record if the preview cannot be generated.
- **FR-069**: System MUST reuse the original as its own preview when the original is already no larger than the preview dimensions, rather than enlarging it.
- **FR-028**: System MUST reject self-referencing relationships and duplicate relationships for the same character pair and label.
- **FR-029**: System MUST preserve shared images and stories for their remaining linked characters when one linked character is deleted.
- **FR-053**: System MUST require an explicit confirmation naming the item before deleting any character, image, story, relationship, tag, trait, gender value, artist, or designer, and MUST treat confirmed deletions as permanent.
- **FR-062**: System MUST remove a deleted trait from every character carrying it rather than blocking the deletion, since traits are optional.
- **FR-030**: System MUST allow the admin to sign out, ending the admin session.
- **FR-031**: System MUST throttle repeated failed sign-in attempts and expire idle admin sessions.
- **FR-032**: System MUST make every publicly published change visible on the public pages immediately after it is saved.

#### Quality and accessibility

- **FR-033**: System MUST present a responsive layout that adapts to phone, tablet, and desktop screen widths on every page, including the gallery, character detail pages, the relationship page, the artists page, and all admin screens.
- **FR-034**: System MUST provide accessible names, keyboard operability, and visible focus for the NSFW checkbox, the tag, gender, and trait filters, the gallery cards, the image previews and their full-size overlay, and the admin sign-in entry point.
- **FR-035**: System MUST preserve the visitor's tag filter, gender filter, trait filter, and NSFW selections when returning to the gallery from a character detail page.

### Key Entities

- **Character (OC)**: An original character. Required attributes: name, gender, short description, at least one job title, terms of use text, permission flags for regifting, retrading and reselling, a designer, at least one tag, and at least one linked image (one of which is the designated avatar). Optional: designer website link, any number of traits (sins or virtues). Related to tags, traits, images, stories, and relationships.
- **Image**: A picture asset stored as an unmodified original plus a generated reduced-size preview copy. Required attributes: original file, preview file, alt text, an artist, SFW/NSFW rating, and at least one linked character. Optional: short description, artist website link.
- **Story**: A written piece. Attributes: title, body text, SFW/NSFW rating. Linked to one or more characters.
- **Tag**: A reusable label applied to characters and used to filter the gallery. Attributes: name.
- **Trait (Sin or Virtue)**: A reusable moral characteristic maintained by the admin in a managed list and assignable to any number of characters, used both for display and as a gallery filter. Attributes: name, kind (sin or virtue). Optional on a character.
- **Gender**: A reusable value maintained by the admin in a managed list, assigned to each character and used as a gallery filter criterion. Attributes: name.
- **Relationship**: A connection between two distinct characters. Attributes: the two characters involved, a descriptive label, SFW/NSFW rating.
- **Designer**: A reusable record for the creator credited with a character's design, selected when creating a character. Attributes: name (required), website link (optional).
- **Artist**: A reusable record for the creator credited with an image, selected when uploading an image, and the grouping key of the artists page. Attributes: name (required), website link (optional).
- **Admin**: The only role in the system — the single privileged account that manages all content. Attributes: sign-in credentials, session state. All other visitors are anonymous and have no account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor with no prior choice sees zero NSFW items on 100% of public pages, verified across the gallery, every character detail page, the relationship page, and the artists page.
- **SC-002**: A visitor can go from landing on the home page to viewing a specific character's full details in 2 interactions or fewer.
- **SC-003**: The home page gallery and any character detail page become readable within 3 seconds on a typical broadband connection with a collection of 100 characters and 1,000 images.
- **SC-004**: Applying or clearing a tag, gender, or trait filter updates the visible gallery within 1 second.
- **SC-005**: The admin can publish a complete new character — including at least one image and one story — in under 5 minutes without consulting documentation.
- **SC-006**: 100% of displayed images carry non-empty alt text, and all interactive controls are reachable and operable by keyboard alone.
- **SC-007**: 100% of unauthenticated attempts to reach admin screens or perform admin actions are rejected.
- **SC-008**: 100% of images and stories linked to multiple characters appear on every one of their linked characters' detail pages at the correct rating level.
- **SC-009**: Every page is usable without horizontal scrolling at screen widths from 360px to 1920px.
- **SC-010**: 100% of published characters carry at least one image, at least one tag, a designer, all three permission values, and terms of use, and 100% of published images carry an artist name.
- **SC-011**: The artists page lists every visible image exactly once, under exactly one artist group.
- **SC-012**: 100% of traits assigned to a character appear on that character's detail page under the correct "Sins" or "Virtues" heading, and every trait in use is selectable in the gallery filter.
- **SC-013**: Rendering the home page gallery transfers only preview copies, so the bytes downloaded for a gallery of 100 characters stay independent of how large the originals are.
- **SC-014**: 100% of previews open the corresponding original at full dimensions, both with JavaScript enabled and with JavaScript disabled, and the overlay is dismissible by keyboard alone.

## Assumptions

- The site has a single admin; no multi-user roles, registration, or public accounts are needed.
- Visitors browse anonymously; no visitor account, comment, or rating features are in scope.
- The NSFW opt-in is an honour-based self-declaration; no age verification or identity check is in scope.
- The 100 MB upload ceiling exists only to catch clearly mistaken files; real artwork is expected to sit far below it, so the admin should never encounter the limit in normal use.
- A single preview size is sufficient for every context where previews appear; per-breakpoint image variants are not required.
- Preview copies are regenerable from the stored originals, so losing a preview is recoverable and does not require re-uploading the artwork.
- The NSFW preference is stored client-side per browser session and is not tied to any persistent visitor identity.
- All published content is public; there are no per-character or per-visitor visibility rules beyond the SFW/NSFW split.
- "Gender" values are drawn from a reusable list the admin maintains, so any value can be added while keeping the gallery filter free of near-duplicates.
- Permissions (regift, retrade, resell) are simple allowed/not-allowed flags, complemented by the free-text terms of use.
- A relationship carries one rating; a pair of characters may have separate SFW and NSFW relationship entries if the admin creates both.
- Confirmed deletions are permanent; no archive, trash, or undo is provided in the first release.
- Sins and virtues are modelled as one reusable "trait" list where each entry carries a sin-or-virtue marking, kept optional on characters so no character has to be given a moral label.
- Traits are not rated SFW or NSFW; they are always visible regardless of the NSFW setting.
- Relationship labels are free text chosen by the admin rather than a fixed vocabulary.
- Image uploads are stored and served by this site; hotlinking to external image hosts is not required.
- Designer and artist credits are reusable records selected when creating characters and images, so a single correction updates every place that credit appears.
- Content is authored in a single language; localisation is out of scope.
- Expected scale is on the order of low hundreds of characters and low thousands of images — not a high-traffic public platform.
- Search by free text, pagination, and sorting beyond the default gallery order are out of scope for the first release.
