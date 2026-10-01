# Contract: Admin Controls & Character Profile

**Feature**: `002-modern-ui-relationship-map` | **Date**: 2026-10-01

## Character deletion

### Existing route — unchanged

| Property | Value |
|----------|-------|
| Method & path | `POST /admin/characters/:id/delete` |
| Guarded by | `requireAdmin` (existing, applied in `src/app.js` before admin routers) |
| Body | `confirm_name` plus the session CSRF token |
| Success | `303` redirect to `/admin/characters` |
| Name mismatch | `422`, re-renders `admin/character-edit.njk` with a `confirm_name` field error |
| Missing CSRF token | `403` |
| Not signed in | redirect to the sign-in page |

**This route is already fully implemented and tested. Nothing in it changes.** What is missing is any UI that reaches it — see the finding in R-010. The work is presentation only.

### Controls to add

| Location | Control | Requirement |
|----------|---------|-------------|
| `admin/characters-list.njk`, each row | A clearly marked delete link to `/admin/characters/{id}/edit#delete` | FR-022 |
| `admin/character-edit.njk`, end of page | A `<form method="post" action="/admin/characters/{id}/delete">` with `id="delete"`, a `confirm_name` text input, the CSRF hidden field, and a destructive-styled submit button, visually separated from the save action | FR-023, FR-024 |

The delete form is placed in a visually distinct region with its own heading, and **must not be nested inside the edit form** — nested forms are invalid HTML and the inner one would be dropped by the parser, silently producing a delete button that submits the edit.

### Visibility

| Rule | Requirement |
|------|-------------|
| No delete control appears on any public page | FR-026 |
| No delete control is reachable by a visitor who is not signed in as admin | FR-026, SC-009 |
| Deleting a character removes it from the gallery, artist page, character page, and **both relationship maps** | FR-025 |
| Deleting a character whose id no longer exists reports clearly rather than failing opaquely | FR-027 |

FR-025's relationship-map clause needs no new code — nodes are derived from the relationship rows (I-M1), which the existing foreign-key cascade removes with the character. It is listed because it is the clause most likely to be assumed rather than tested.

FR-027 requires verifying the behaviour of `deleteCharacter` when the character is absent; the handler currently calls `next()` in that branch, which falls through to the 404 handler. If that produces an unhelpful outcome for an admin, it is fixed here — but only after a test demonstrates the current behaviour.

## Return to admin

| Property | Value |
|----------|-------|
| Location | `src/views/partials/header.njk`, inside `.site-controls` |
| Markup | `<a class="admin-entry" href="/admin">Admin</a>` |
| Shown when | `isAdmin` is true (the existing template local) |
| Hidden when | not signed in — the existing "Admin sign in" link continues to show instead |

| Rule | Requirement |
|------|-------------|
| Present in the header on every public page | FR-028 |
| Absent for anonymous visitors, and reveals nothing beyond the existing sign-in entry point | FR-029, SC-010 |
| Does not displace or obscure the NSFW checkbox or the sign-out control | FR-030 |

The header already renders a sign-out form for admins; the return control sits beside it. Ordering within `.site-controls` must keep the NSFW checkbox first, since FR-030 protects its position and the original specification placed the admin entry point to its right.

## Character profile page

| Property | Value |
|----------|-------|
| Route | `GET /characters/:slug` — **unchanged** |
| Handler | `src/routes/public/character.js` — **unchanged** |
| Data | `findCharacterBySlug` already returns `avatar` and `stories[].body` (R-008) |
| Change | `src/views/pages/character.njk` and `main.css` only |

### Required structure

```text
<article class="character-profile">
  <header class="profile-header">          ← avatar top-left, summary beside it   FR-037
    <img class="profile-avatar" ...>       ← /media/:id, or placeholder            FR-039
    <div class="profile-summary">          ← name, gender, job titles, short
                                             description, tags, sins & virtues,
                                             designer, terms, permissions          FR-038
  </header>
  <section class="profile-images">  ...    ← below the header                      FR-040
  <section class="profile-stories">        ← below the images                      FR-040
    <details class="story">
      <summary>{title}</summary>           ← collapsed by default                  FR-041a
      {body}                               ← full text, in place, no navigation    FR-041
    </details>
  <section class="profile-relationships">  ← retained from the current page
</article>
```

| Rule | Requirement |
|------|-------------|
| Avatar top-left with summary beside it at wide widths; stacked at narrow widths | FR-037, FR-043 |
| Placeholder used when the avatar is not viewable | FR-039 |
| Images section before stories section | FR-040 |
| Story text present in the page, not a link away | FR-041 |
| Collapsed to title plus opening lines, expanding in place | FR-041a |
| Full text reachable without script | FR-041b — satisfied natively by `<details>` |
| Neither title nor text of a non-viewable story appears | FR-042, SC-015 |

FR-042 needs no new filtering: `listStoriesForCharacter` already excludes hidden stories in SQL. The test exists to prove the template did not reintroduce them.

**`/stories/:slug` remains a route.** Stories stay independently addressable; the character page simply no longer requires that trip. Removing the route would change navigation structure, which clarification FR-032 forbids.

## Interface refresh

| Rule | Requirement |
|------|-------------|
| One token system across public and admin pages | FR-031 |
| Every existing page, control, and link still present and operable | FR-032, SC-013 |
| Routes and navigation structure unchanged | FR-032 |
| No horizontal scrolling or overlap, 320–1920 px | FR-033, SC-011 |
| Visible focus indicator on every interactive control | FR-034, SC-012 |
| WCAG 2.1 AA contrast for text and controls | FR-035, SC-012 |
| Content readable and operable in document order without styling | FR-036 |

The existing `:focus-visible` and `overflow-wrap` rules in `main.css` are **extended, not replaced**. They were added to close a real accessibility gap and removing them regresses FR-034.

**Regression guard**: the full existing suite (129 tests) must pass unchanged. Those tests assert page content and structure, so they are the practical enforcement of SC-013 — if the refresh deletes a control, an existing test fails. A refresh that requires editing many existing assertions has exceeded what FR-032 permits.
