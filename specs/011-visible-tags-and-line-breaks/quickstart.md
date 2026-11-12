# Quickstart: Visible Tags and Preserved Line Breaks

## Prerequisites

- Node.js 22 or newer and the project dependencies installed.
- Run commands from the repository root.

## Automated Validation

Run the focused suites:

```powershell
node --test tests/contract/gallery.test.js tests/integration/accessibility.test.js tests/integration/character-profile.test.js tests/integration/story.test.js tests/integration/enhance.test.js
```

Expected result: all gender choices and tags render expanded; selected gender and tags persist through GET filtering; filter controls remain accessible; single and blank-line breaks render consistently in descriptions, stories, and terms of use.

Run the complete suite and the dedicated NSFW checks:

```powershell
npm test
npm run test:nsfw
```

Expected result: all tests pass, including the existing guarantee that non-opted-in visitors receive no NSFW story content.

## Manual Interaction Check

1. Open the gallery and verify all gender choices and tags are visible without expanding a section.
2. Select a gender and at least one tag; verify each selection immediately applies and the other selection remains active.
3. Reload or share the resulting URL and confirm all selections are restored.
4. Disable JavaScript and verify the same choices remain visible and the form submit button applies them.
5. View a character profile containing single and blank-line breaks in descriptions, story content, and terms of use; confirm all line boundaries remain readable.
6. Open a standalone story with mixed line endings and confirm formatting is consistent, then verify an NSFW story remains absent unless opted in.
