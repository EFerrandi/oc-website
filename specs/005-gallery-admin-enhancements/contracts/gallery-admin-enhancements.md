# UI and Data Contract: Gallery and Admin Enhancements

## Public navigation and Artists page

- There is one public `Artists` destination.
- Every canonical artist is shown at most once.
- Artists credited for a character design remain discoverable even when they have no visible image.
- Artwork shown for each artist follows the current visitor's NSFW preference.
- Artist name links continue to open the artist website in a new tab when a valid URL exists.

## Bubble selection

- Gender uses one selected native option; tags use zero or more selected native options.
- Each option is presented as a centered-text bubble, with a visibly distinguishable selected state.
- No visible checkbox square is shown for tag bubbles.
- All controls have an accessible label and visible keyboard focus.
- GET filters and POST forms submit without JavaScript and preserve existing parameter names and semantics.

## Character detail

- Tags appear as bubbles in the profile's upper-right area.
- Relationships precede Stories in document/source order.
- Ownership (design artist, terms, transfer permissions) appears at the end of the profile for an authenticated admin only.
- Anonymous response HTML contains no ownership values or hidden ownership panel.
- Avatar display is square; saved crop applies only to the character and image selected as that character's avatar.

## Image upload

- The admin can select an existing artist or enter a new artist name with an optional website URL.
- Duplicate normalized artist names return a field-specific error and do not create an image or artist.
- On success, artist and image records are committed together; failures clean up uploaded original and preview files.

## Admin dashboard

- The dashboard is restricted to the authenticated admin.
- Overall totals are counts of image-character associations, separated into total, SFW, and NSFW.
- Per-character rows show total, SFW, and NSFW counts.
- SFW and NSFW percentages are shares of the combined association total; when the total is zero both display 0%.
- Pie chart slices represent each character's total association count. A data table provides the same counts and rating breakdown without requiring the chart.

## Migration

- Existing designer and artist names, links, image credits, and character design credits are preserved through canonical artist IDs.
- For matching names, the existing artist website URL wins when both URLs are non-empty; if it is empty, a non-empty designer URL is copied.
- Existing tag and trait names and character assignments are preserved as tags, with duplicate associations merged.
- Migration is forward-only, recorded, transactional, and does not change uploaded image files.

## Requirement coverage

| Requirements | Contract sections |
|---|---|
| FR-001–FR-004 | Public navigation and Artists page; Migration |
| FR-005–FR-006 | Image upload |
| FR-007–FR-010 | Bubble selection |
| FR-011–FR-012, FR-019–FR-022 | Character detail |
| FR-013–FR-018 | Admin dashboard |
| FR-023 | Public navigation and Artists page; Character detail |
| FR-024 | Bubble selection; Character detail; Image upload |
