# Quickstart: Gallery and Admin Enhancements

## Prerequisites

- Node.js 22+ and the repository dependencies installed.
- A disposable test database created by the existing test helpers.
- Test fixtures with: same-name designer/artist records; traits matching and not matching existing tags; SFW and NSFW images; an image shared by multiple characters; at least one character with an avatar image.
- Admin session for admin-only scenarios.

## Automated checks

Run the project suite:

```powershell
npm test
npm run test:nsfw
```

Focused scenarios should also run by the existing Node test runner, including migration, admin upload, character profile, gallery filters, access control, accessibility, and NSFW gating suites.

## Migration validation

1. Create a legacy-schema database with designer and artist identities that match by case and whitespace, including conflicting and empty URLs.
2. Add character design credits, image credits, tags, traits, and overlapping tag/trait memberships.
3. Run the normal migration command against the disposable database.
4. Verify one canonical artist per normalized identity, the artist URL precedence rule, and preserved character/image credits.
5. Verify every former trait membership appears as a tag membership, with duplicate memberships merged.
6. Run the migration again and confirm it is not reapplied and data does not change.

## Public UI validation

1. Open the gallery at 320px, 768px, 1280px, and 1920px.
2. Select/deselect gender and multiple tag bubbles by pointer and keyboard; submit with JavaScript disabled and confirm filter URLs/results remain correct.
3. Open an artist page with NSFW disabled and enabled; verify only permitted artwork is included.
4. Open a character page anonymously and confirm tags are upper-right, Relationships precede Stories, and no terms, permissions, or design-ownership data occur in HTML.
5. Open that profile as admin and confirm ownership appears at the bottom.
6. Change an avatar crop, save, and verify the square crop persists. Repeat with a shared image and verify the second character and original image remain unchanged.

## Admin upload and dashboard validation

1. Upload an image while creating a new artist in the same form; verify the image credit and Artists page use the new identity.
2. Submit a duplicate artist name and invalid URL; verify field-specific errors and no partial image, artist, or stored file.
3. Open the admin dashboard with SFW and NSFW images, including a multi-character image; compare overall and per-character counts to image-character links.
4. Verify percentages use association totals and sum to 100% (or both show 0% when no associations exist).
5. Verify chart slices correspond to each character's total and the accessible table provides matching values.
6. Request the dashboard anonymously and confirm it is not served; inspect public HTML for absence of dashboard counts.

## Contract references

See [gallery-admin-enhancements.md](contracts/gallery-admin-enhancements.md) for user-facing invariants and [data-model.md](data-model.md) for migration, statistics, and crop rules.
