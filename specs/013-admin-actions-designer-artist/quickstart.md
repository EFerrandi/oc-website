# Quickstart: Validation Guide

## Prerequisites

`npm install` done; sign in at `/admin`.

## Scenarios

1. Open `/admin`. The three buttons appear first, large and accent-colored, before the counts and statistics. Narrow the window to phone width: no horizontal scroll. Press Tab: the first stops are the three buttons with a visible focus ring.
2. Open `/admin/characters/new`. Choose a designer, tick "Same artist as the designer", fill the rest (no image artist) and submit. The character is created and its first image credits the designer on `/artists`.
3. Repeat with a new designer name: only one new artist appears in the artist list.
4. Untick the box and leave the image artist empty: the form is refused with the artist error.
5. Tick the box but pick a different image artist: the designer is used.
6. Trigger another validation error with the box ticked: the box stays ticked on redisplay.

## Automated

```text
node --test tests/integration/admin-dashboard-actions.test.js tests/integration/character-same-artist.test.js
npm test
npm run test:nsfw
git diff --check
```
