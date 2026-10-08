# Quickstart: Website-Wide Visual Refresh

**Feature**: `003-website-visual-refresh` | **Date**: 2026-10-02

Validation guide for the presentation-only refresh. Run commands from the repository root in PowerShell.

## Prerequisites

Install dependencies and configure the existing application as described in the repository README. Start the site with `npm start` and open it in a PC browser.

## Automated Regression

```powershell
npm test
npm run test:nsfw
node --test tests/integration/route-audit.test.js
```

**Expected**: all tests pass. The existing NSFW assertions and route inventory remain unchanged.

## Palette and Shared Design

Inspect the gallery, character profile, image page, artist page, relationship map, story page, admin dashboard, an admin list, and an admin edit form.

**Expected**: all surfaces use the dark-neutral foundation, shared purple palette, and consistent typography, spacing, component borders, and control treatments. The purple colors are used only in roles where their contrast against the actual background is sufficient.

## PC Viewport Review

Use the browser's responsive viewport controls at 320px, 768px, 1280px, and 1920px. Review the same public and admin pages.

**Expected**:

- No page-level horizontal scrollbar or overlapping content.
- Long names, labels, and URLs wrap within their containing region.
- The NSFW preference and admin controls remain visible and operable.
- The relationship map and character profile retain their intended layout and interaction.

## Keyboard and Styling-Free Review

Use only the keyboard to traverse links, buttons, and form controls. Then disable CSS in the browser and revisit representative public and admin pages.

**Expected**: focus remains visibly apparent when styles are enabled; without styling, page content remains readable in document order and links and forms remain operable.

## Contrast Review

Inspect normal and large text, interactive labels, focus indicators, boundaries, badges, and success/error states against their actual backgrounds.

**Expected**: normal text is at least 4.5:1, large text and meaningful control boundaries at least 3:1. The dark purple is not used as small text on dark neutral surfaces.

## Behavior Preservation

Compare the route audit and representative form/link destinations to their existing values. Verify the NSFW checkbox remains server-submitted and gated content remains absent when opt-in is off.

**Expected**: no route, content, action, permission, or content-rating behavior has changed.
