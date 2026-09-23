# Quickstart & Validation Guide

**Feature**: `001-oc-photo-gallery` | **Date**: 2026-09-23

How to run the site locally and verify it satisfies the specification. Data shapes are in [`data-model.md`](./data-model.md); route behaviour is in [`contracts/`](./contracts/).

---

## Prerequisites

- Node.js 22 LTS or newer (`node --version`) — required for the built-in `node:sqlite` and `node:test` modules
- npm 10+
- No database server and no native build toolchain required

---

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run admin:set-password        # prompts, writes the scrypt hash into .env
npm run db:migrate                # creates data/oc.db and applies migrations
npm run seed:dev                  # optional demo content for manual checks
npm run dev
```

Site at `http://localhost:3000`, admin at `http://localhost:3000/admin/login`.

`.env` keys: `PORT`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `DATABASE_PATH`, `UPLOAD_DIR`, `MAX_UPLOAD_BYTES`.

> `.env`, `data/oc.db*`, and `data/uploads/` must all be git-ignored. The password hash and session secret are never committed (research R-008).

---

## Automated checks

```powershell
npm test                  # full suite (node:test)
npm run test:nsfw         # the gating suite - the highest-risk area
```

The suite runs against a throwaway database seeded per run, so tests are order-independent.

---

## Manual validation scenarios

Each maps to acceptance scenarios and success criteria in [`spec.md`](./spec.md). Use the seeded demo data.

### V-1 — Safe by default (SC-001, FR-009)

1. Open the site in a **fresh private window**.
2. Confirm the NSFW checkbox is in the top-right of the header and **unchecked**, with the admin sign-in link immediately to its right.
3. Visit `/`, every character page, `/relationships`, and `/artists`.

**Expect**: zero NSFW images, stories, or relationships anywhere. No NSFW relationship card on `/relationships` at all — not an empty one.

### V-2 — Direct NSFW request is refused (FR-012) — *the critical security check*

1. In the same fresh window, request a known NSFW image directly: `/media/<nsfw image id>`.
2. Request a known NSFW story directly: `/stories/<nsfw slug>`.

**Expect**: `404` for both. Not a redirect, not a `403`, and definitely not the content.

3. Confirm `data/uploads/` is **not** reachable by any static path (e.g. `/uploads/<filename>` returns `404`).

### V-3 — Opting in and out (FR-010, FR-011)

1. Check the NSFW box. NSFW images, stories, and relationships appear; the NSFW relationship card appears on `/relationships`.
2. Navigate between pages and reload.

**Expect**: the choice persists across navigation and reload.

3. Uncheck it → NSFW content disappears immediately.
4. Close the browser entirely and reopen the site.

**Expect**: back to SFW-only — the preference is session-scoped.

### V-4 — Filtering (FR-015–FR-018, FR-039, FR-054–FR-056)

1. On `/`, select one tag → only characters carrying it remain.
2. Add a second tag → results narrow to characters carrying **both** (AND, not OR).
3. Add a gender, then a trait → results narrow further; all three filters combine.
4. Confirm traits are offered grouped under **Sins** and **Virtues**.
5. Copy the URL into a new tab.

**Expect**: the same filtered gallery, with the controls still showing the active selection.

6. Pick a combination matching nothing → empty-state message plus a working clear-filters control.
7. Confirm every offered filter option yields at least one result — no dead options (FR-016, FR-040, FR-056).

### V-5 — Character detail (FR-003–FR-006, FR-052)

Open a character and confirm: name, gender, description, all job titles, tags, **traits under separate Sins and Virtues headings**, terms of use, the three permissions shown explicitly as allowed / not allowed, and the designer credit.

- Designer and artist names open their sites in a **new tab**; a credit with no URL renders as plain text with no broken link (FR-005).
- Every image has a short description, an artist credit, and non-empty `alt` text.
- A character with only sins (or only virtues) shows just the populated heading.
- A character whose images are all NSFW, viewed with NSFW off: still listed on `/` with a **placeholder avatar**, and its detail page still renders name, description, tags, terms, and designer (FR-014, FR-052).

### V-6 — Artists page (FR-036–FR-038, SC-011)

1. Open `/artists`. Each artist appears **exactly once**; every visible image appears under exactly one artist.
2. Click an artist name → their site opens in a new tab.
3. Click an image → reaches a linked character's detail page.
4. With NSFW off, an artist whose images are all NSFW is **absent entirely**; enable NSFW and they appear.

### V-7 — Admin access control (FR-020, SC-007)

1. Signed out, request `/admin`, `/admin/characters/new`, and `POST /admin/characters`.

**Expect**: every one redirects to the login page; no admin screen renders and no write occurs.

2. Submit an admin form with a stale/missing CSRF token → `403`, nothing written.
3. Enter a wrong password repeatedly → throttled (`429`) after several attempts (FR-031).

### V-8 — Creating a character (FR-041, FR-049, FR-050, SC-005, SC-010)

1. Sign in, open the new-character form. Confirm it includes the **first image upload in the same form**.
2. Submit with the image missing → rejected, naming the missing field.
3. Submit with no tag, or no designer, or no terms of use → rejected, naming each offending field.
4. Submit leaving traits empty → **accepted** (traits are optional).
5. Submit a valid character with a bad image (e.g. a `.txt` renamed to `.png`) → rejected; confirm **no** character row was created and **no** file was left in `data/uploads/`.
6. Submit a fully valid character → appears in the gallery immediately.

Time step 6 end to end: it should take under 5 minutes without consulting docs (SC-005).

### V-9 — Images, artists, sharing (FR-025, FR-042, SC-008)

1. Upload an image with no artist selected → rejected naming the artist.
2. Upload an image linked to **two** characters → confirm it appears on both detail pages.
3. Mark it NSFW → it disappears from both pages while NSFW is off, and from `/artists`.
4. Edit the artist's name and URL → the updated credit appears everywhere that artist is credited (FR-047).

### V-10 — Traits vs tags on delete — *the asymmetry most likely to regress*

1. Create a trait, mark it a **sin**, assign it to three characters.
2. Try creating another trait with the same name but marked **virtue** → rejected as a duplicate (FR-059).
3. Rename the trait, then flip it to **virtue** → every carrier and the gallery filter update, and it moves to the Virtues heading (FR-061).
4. **Delete the trait while it is still assigned** → after confirmation it **succeeds**; the three characters lose it and remain valid (FR-062).
5. Now try deleting a **tag that is still in use** → **refused** (`409`), because every character needs at least one tag.

Steps 4 and 5 must behave *differently*. If deleting an in-use trait is blocked, or deleting an in-use tag succeeds, the implementation is wrong.

### V-11 — Relationships (FR-007, FR-013, FR-024, FR-028)

1. Create an SFW relationship → appears on both detail pages and in the SFW card on `/relationships`.
2. Try a relationship from a character to itself → rejected (FR-028).
3. Try the same pair and label again, entered in the reverse direction → rejected as a duplicate (FR-028).
4. Create an NSFW relationship → visible only when opted in, in its own separate card.

### V-12 — Deletion safety (FR-029, FR-053)

1. Delete a character linked to a **shared** image and a **shared** story, confirming by name.
2. Confirm the shared image and story are **still available** on the other characters they are linked to.
3. Confirm an image that was linked *only* to the deleted character is gone, along with its file on disk.
4. Confirm every delete required an explicit confirmation naming the item.

### V-13 — Responsive and accessible (FR-033, FR-034, SC-006, SC-009)

1. Resize from **360px to 1920px** across `/`, a character page, `/relationships`, `/artists`, and the admin screens.

**Expect**: no horizontal scrolling at any width.

2. Navigate the whole site using **only the keyboard**: NSFW checkbox, all filter controls, gallery cards, admin sign-in, and admin forms must all be reachable and operable with a visible focus indicator.
3. Disable JavaScript entirely.

**Expect**: filters and the NSFW toggle still work via normal form submission.

4. Confirm every rendered image has non-empty `alt` text (SC-006).

---

## Validation checklist

| Scenario | Covers |
|---|---|
| V-1, V-2, V-3 | NSFW gating — SC-001, FR-008–FR-014 |
| V-4 | Filtering — FR-015–FR-018, FR-039, FR-054–FR-056, SC-004 |
| V-5 | Detail page — FR-003–FR-006, FR-052 |
| V-6 | Artists page — FR-036–FR-038, SC-011 |
| V-7 | Access control — FR-020, FR-031, SC-007 |
| V-8 | Mandatory fields & atomic creation — FR-041, FR-049, FR-050, SC-005, SC-010 |
| V-9 | Shared images & credits — FR-025, FR-042, FR-047, SC-008 |
| V-10 | Trait/tag semantics — FR-057–FR-062, SC-012 |
| V-11 | Relationships — FR-007, FR-013, FR-024, FR-028 |
| V-12 | Delete safety — FR-029, FR-053 |
| V-13 | Responsive & accessible — FR-033–FR-035, SC-006, SC-009 |
