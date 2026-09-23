# Contract: Public HTTP Routes

**Feature**: `001-oc-photo-gallery` | **Audience**: anonymous visitors | **Response type**: `text/html` unless stated

## Shared request context

Every public route resolves these before rendering:

| Input | Source | Default | Effect |
|---|---|---|---|
| NSFW opt-in | `nsfw` cookie, value `1` | absent → **off** | Gates images, stories, relationships (FR-009, FR-010) |
| Signed-in admin | session cookie | absent | Only toggles the header's admin link |

**Rating rule applied by every route and query below**: when NSFW is off, rows with `is_nsfw = 1` are excluded from results *and* refused when requested directly. This is enforced server-side; it is never a client-side hide (FR-012).

Every response renders the shared header containing the NSFW checkbox (top-right) and the admin sign-in entry point immediately to its right (FR-008, FR-019).

---

## `GET /`

The gallery (FR-001, FR-002, FR-015–FR-018, FR-039, FR-054–FR-056).

**Query parameters** — all optional, all repeatable where noted:

| Parameter | Cardinality | Semantics |
|---|---|---|
| `tag` | repeatable | Character must carry **all** given tags (AND) |
| `trait` | repeatable | Character must carry **all** given traits (AND) |
| `gender` | single | Character's gender must equal this value |

Filters combine with AND across all three kinds (FR-055). Unknown or no-longer-matching values are ignored rather than erroring; the canonical set of applied filters is reflected back into the rendered form so the URL remains shareable and reloadable (FR-018).

**Response `200`** contains, for each matching character: effective avatar (see below), name, and all job titles.

**Facets**: the offered tag, gender, and trait options are derived from the currently visible character set, not the full taxonomy tables, so no option can yield zero results (FR-016, FR-040, FR-056). Trait options are grouped under `Sins` and `Virtues` labels (FR-056).

**Effective avatar**: designated avatar if visible at the current rating → else the oldest visible linked image → else the static neutral placeholder. The character is always listed; it is never hidden for lack of a visible image (FR-014).

**Empty result**: renders an empty-state message plus a clear-filters control (FR-017). Status remains `200`.

---

## `GET /characters/:slug`

Character detail (FR-003–FR-006, FR-052).

**Response `200`** renders: name, gender, short description, all job titles, tags, traits grouped under separate `Sins` and `Virtues` headings, terms of use, the three permission values shown explicitly as allowed / not allowed, designer credit, visible images, visible stories, visible relationships.

- Sections with no visible content are omitted or show an explicit empty state (FR-006). A character carrying only sins, or only virtues, shows just the populated heading.
- The page stays reachable and renders all non-media information even when every image and story is hidden by the current rating (FR-052).
- Designer and artist names link to their website with `target="_blank" rel="noopener noreferrer"`; with no valid URL recorded, the name renders as plain text (FR-005).
- Each image shows its short description, its artist credit, and carries a non-empty `alt` attribute (FR-004).

**Response `404`**: unknown slug.

---

## `GET /media/:imageId`

Image bytes. **This is the only path by which uploaded files are reachable** — the upload directory is never served statically (FR-012, research R-006).

| Condition | Status |
|---|---|
| Image exists and is SFW | `200` + image bytes |
| Image exists, is NSFW, visitor opted in | `200` + image bytes |
| Image exists, is NSFW, visitor has **not** opted in | `404` |
| Image does not exist | `404` |

The NSFW-without-opt-in case returns `404`, not `403`: a `403` would confirm that a specific NSFW image exists at that id.

**Headers**: `Content-Type` from the stored MIME type; `Cache-Control: private, no-store` for NSFW images so a shared or proxy cache cannot serve them to a visitor who has not opted in.

---

## `GET /stories/:slug`

A single story.

| Condition | Status |
|---|---|
| SFW story | `200` |
| NSFW story, visitor opted in | `200` |
| NSFW story, no opt-in | `404` (FR-012) |
| Unknown slug | `404` |

---

## `GET /relationships`

Relationship overview (FR-007, FR-013).

**Response `200`** renders an SFW relationship card listing every visible SFW relationship. Each entry names both characters, shows the relationship label, and links to both detail pages.

- When the visitor has opted in, a **separate** NSFW relationship card is rendered in addition.
- When the visitor has not opted in, the NSFW card is omitted **entirely** — not rendered empty, not rendered collapsed (FR-013).
- A rendered card with no entries shows an empty-state message.

---

## `GET /artists`

All images grouped by artist (FR-036–FR-038).

**Response `200`**: each artist appears **exactly once** as a group heading, with all of their images visible at the current rating beneath it. Every visible image appears exactly once, under exactly one group (SC-011).

- The artist name links to their website in a new tab; with no URL recorded it renders as plain text (FR-005).
- An artist with no images visible at the current rating is omitted from the page entirely (FR-037).
- Each image links through to a detail page of a character it is linked to (FR-038).

---

## `POST /preferences/nsfw`

Toggles the NSFW opt-in (FR-008, FR-011).

**Body**: `nsfw` present (checked) → opt in; absent → opt out. `return_to` carries the path to come back to.

**Effect**: sets or clears the `nsfw` cookie — session-scoped (no `maxAge`, so it clears when the browser closes), `sameSite=lax`, tied to no identity (Assumptions).

**Response `303`** redirecting to `return_to`, which must be a same-origin path (validated to prevent open redirects); otherwise `/`. Redirecting back preserves any active filters in the URL, so the visitor's tag, gender, and trait selections survive the toggle (FR-035).

---

## Error responses

| Status | When |
|---|---|
| `404` | Unknown resource, **or** any NSFW resource requested without opt-in |
| `400` | Malformed route parameter (e.g. non-numeric image id) |
| `500` | Unexpected failure; renders a generic page and leaks no internals |

---

## Cross-cutting guarantees

- **Safe by default**: a first-time visitor with no cookie sees zero NSFW items across the gallery, every detail page, the relationship page, and the artists page (SC-001).
- **No-JS operable**: every filter and the NSFW toggle are native form controls submitting `GET`/`POST`; JavaScript only auto-submits on change as an enhancement (FR-034, SC-006).
- **Responsive**: usable without horizontal scrolling from 360px to 1920px (FR-033, SC-009).
