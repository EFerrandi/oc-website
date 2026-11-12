# Quickstart: Character Profile and Tag Filters

## Prerequisites

- Node.js 22 or newer and the project dependencies installed.
- Run commands from the repository root.

## Automated Validation

Run the focused suites:

```powershell
node --test tests/integration/character-profile.test.js tests/contract/gallery.test.js tests/integration/accessibility.test.js
```

Expected result: profile section ordering and description rendering tests pass; tag filtering retains the selected gender and tags in the GET query state; keyboard/focus assertions continue to pass.

Run the complete suite and the dedicated NSFW suite:

```powershell
npm test
npm run test:nsfw
```

Expected result: all tests pass, confirming the presentation and filtering changes did not regress the existing application or content-rating protections.

## Manual Interaction Check

1. Open the character listing and select a tag in the filter controls.
2. Verify the page updates without pressing Apply filters and the resulting URL includes the selected tag.
3. Add or remove another tag and verify the current gender selection and other selected tags remain applied.
4. Reload or open the resulting URL in another tab and verify the same filters are selected.
5. Disable JavaScript, select one or more tags, submit with Apply filters, and verify the same result.
6. Open a character profile with all three sections populated; verify Personality, Physical Description, and Relationships appear in that order. Confirm paragraphs remain visible and styled consistently with story text.
