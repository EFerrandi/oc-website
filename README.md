# OC Website

A self-hosted photo gallery for cataloguing original characters (OCs) — their
artwork, stories, relationships, designers and terms of use.

The site has exactly two audiences: anonymous visitors, who browse, and a
single admin, who adds and edits everything. There are no user accounts.

## The one rule that matters

**Adult content never reaches a visitor who has not opted in.**

This is enforced on the server, not by hiding things in the browser. A visitor
opts in with the NSFW checkbox in the header; that sets a session cookie which
clears when the browser closes. Until then:

- NSFW images, stories and relationships are filtered out of every query.
- Requesting an NSFW image or story directly returns **404, never 403** — a 403
  would confirm the resource exists.
- Uploaded files are never served as static assets. They are only reachable
  through the rating-aware `/media` routes.

If you change anything that serves stored content, run `npm run test:nsfw`
before anything else.

## Requirements

- Node.js **22 or newer** (uses the built-in `node:sqlite` module)
- No external database or services

## Setup

```bash
npm install
cp .env.example .env
```

Generate an admin password hash and paste it into `.env` as
`ADMIN_PASSWORD_HASH`:

```bash
npm run admin:set-password
```

Set `SESSION_SECRET` in `.env` to a long random string. Then load some
demonstration content and start the server:

```bash
npm run seed     # optional: 3 characters, 3 images, a story, 2 relationships
npm start
```

The site is at <http://localhost:3000>, and the admin sign-in link sits in the
header, immediately to the right of the NSFW checkbox.

For development with automatic restarts:

```bash
npm run dev
```

## Configuration

Every setting lives in `.env`; see `.env.example` for the annotated list. The
server refuses to start if a required value is missing, naming the offending
key rather than failing obscurely later.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `SESSION_SECRET` | — | **Required.** Signs the session cookie |
| `ADMIN_PASSWORD_HASH` | — | **Required.** `scrypt` hash from `npm run admin:set-password` |
| `DATABASE_PATH` | `data/oc.db` | SQLite file |
| `UPLOAD_DIR` | `data/uploads` | Original uploads |
| `PREVIEW_DIR` | `data/uploads/previews` | Generated previews |
| `PREVIEW_MAX_EDGE` | `800` | Longest edge of a preview, in pixels |
| `MAX_UPLOAD_BYTES` | `104857600` | Safety ceiling, not a product limit |
| `SESSION_IDLE_MINUTES` | `120` | Admin session idle timeout |

`data/` holds the database and every uploaded file. It is gitignored, and it is
the only directory you need to back up alongside `.env`.

## Images

Originals are stored at whatever size they were uploaded; nothing is downscaled
or re-encoded. Alongside each original, a smaller WebP preview is generated and
that is what every listing page loads, so page weight does not grow with the
size of the originals.

Clicking a preview opens the original. With JavaScript it appears in an
overlay; without it, the browser navigates to `/images/:id`, which shows the
same thing as an ordinary page. The overlay is an enhancement and is never
required.

## Content model

A character cannot exist without at least one image, one tag, one job title, a
designer, permissions and terms of use. An image cannot exist without an artist
and alt text, and must be linked to at least one character. These are enforced
in the database and in the service layer, not only in forms.

Two rules look inconsistent and are deliberate:

- Deleting a **tag** that is still in use is **refused** — tags are mandatory,
  so removing one could leave a character with none.
- Deleting a **sin or virtue** that is still in use **succeeds** and simply
  detaches it — these are optional, so a character with none is still valid.

Tags, sins and virtues, genders, artists and designers are stored once and
referenced, so renaming one updates every page at the same time.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the server |
| `npm run dev` | Run with automatic restart on change |
| `npm test` | Run the whole test suite |
| `npm run test:nsfw` | Run only the content-rating gating tests |
| `npm run migrate` | Apply database migrations |
| `npm run seed` | Load demonstration content (does nothing if data exists) |
| `npm run admin:set-password` | Generate an admin password hash |

## Tests

```bash
npm test
```

The suite covers the rating gate end to end, the admin surface including real
file uploads, and every data invariant. `tests/integration/route-audit.test.js`
derives the list of public routes from the source and fails if a new one is
added without being added to the audit — so a route that serves stored content
cannot quietly skip the gate.

## Project layout

```
src/
  app.js            Express app factory (no listen — tests use it directly)
  server.js         Loads config, migrates, listens
  config.js         Environment parsing and validation
  db/               Connection, migrations, transaction helper
  lib/              Small pure helpers (names, slugs, URLs, dates)
  middleware/       CSRF, rating gate, auth, uploads, errors, logging
  repositories/     All SQL lives here
  routes/public/    Visitor-facing routes
  routes/admin/     Admin routes
  services/         Business rules and invariants
  views/            Nunjucks templates
  public/           CSS, JavaScript, static images
tests/
  contract/         Route status and shape conventions
  integration/      End-to-end behaviour
  unit/             Pure helpers and services
```

## Deployment notes

Run behind a reverse proxy over HTTPS. The app sets `trust proxy`, so the proxy
must set `X-Forwarded-*` headers. Session and NSFW cookies are `SameSite=Lax`
and are marked `Secure` in production.

Back up `data/` and `.env` together — the database references files by name, so
restoring one without the other leaves broken images.
