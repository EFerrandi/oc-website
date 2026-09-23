# Phase 0 Research: OC Photo Gallery Website

**Feature**: `001-oc-photo-gallery` | **Date**: 2026-09-23

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` markers remain.

---

## R-001: Application architecture

**Decision**: A single Express 5 application that renders HTML on the server, backed by SQLite. No client-side framework and no build step.

**Rationale**:
- FR-012 requires the server to refuse NSFW images and stories when the visitor has not opted in. When the server renders every page and serves every media file through its own route, gating is a single middleware concern that cannot be bypassed by a client that ignores it. A static export or a client-side-filtered SPA would ship NSFW URLs to the browser and rely on the client to hide them.
- FR-018 requires filters to live in the page address and be shareable/reloadable. Plain `GET` forms with query strings deliver this for free and keep the gallery working without JavaScript.
- Scale is low hundreds of characters and low thousands of images for a single admin (Assumptions). A single deployable with an embedded database is proportionate; a separate API plus SPA would double the surface for no user-facing gain.
- SC-003 (readable within 3s) and SC-004 (filter updates within 1s) are comfortably met by server-rendered pages over a local database.

**Alternatives considered**:
- *Next.js / React*: richer interactivity, but introduces a build toolchain, hydration, and framework upgrade churn for a site whose interactions are links, checkboxes, and forms.
- *Express JSON API + React SPA*: forces every NSFW rule to be enforced twice (API and UI) and makes shareable filter URLs and no-JS operation extra work.
- *Static site generator*: cannot gate NSFW media per request, and the admin requirement (FR-019–FR-032) needs a running server anyway.

---

## R-002: Runtime and module system

**Decision**: Node.js 22 LTS or newer (development on the installed Node 26), using ES modules (`"type": "module"`).

**Rationale**: Node 22+ provides the built-in `node:sqlite` and `node:test` modules this plan relies on. ESM is the current default for new Node code and is fully supported by Express 5. The repository's `package.json` currently declares `"type": "commonjs"`; this is a one-line change made during setup before any source exists.

**Alternatives considered**: Staying on CommonJS — avoided because it is the legacy path for a greenfield codebase and complicates future dependency upgrades, many of which now ship ESM-only.

---

## R-003: Data storage

**Decision**: SQLite accessed through the built-in `node:sqlite` module, with the database file at `data/oc.db`. Schema applied by a small ordered migration runner.

**Rationale**:
- Single-writer (one admin) and low read volume make SQLite an exact fit; a client/server database would add operational weight with no benefit.
- `node:sqlite` is built into modern Node, so there is no native compilation step — relevant on the Windows development machine, where native rebuilds are the most common setup failure.
- Its synchronous API keeps repository code linear and makes transactions (needed for FR-049/FR-050 atomic character-plus-image creation) straightforward.
- Foreign keys with `ON DELETE CASCADE` / `RESTRICT` let the database enforce the spec's differing delete rules directly (see R-007).

**Alternatives considered**:
- *better-sqlite3*: equivalent API and very mature, but requires a native build. Kept as a drop-in fallback if a `node:sqlite` limitation surfaces; the repository layer is the only code that would change.
- *An ORM (Prisma, Sequelize, Drizzle)*: the schema is nine small tables with hand-written queries; an ORM adds a dependency, a generation step, and indirection over queries that are simple joins.
- *JSON files on disk*: no transactions, no referential integrity, and no efficient multi-criteria filtering for FR-055.

---

## R-004: Templating

**Decision**: Nunjucks, with a base layout that renders the site header (NSFW checkbox plus admin sign-in) on every page.

**Rationale**: FR-008 and FR-019 put the NSFW toggle and the admin entry point on *every* page, which is exactly what template inheritance is for — one `layout.njk` with blocks, rather than repeated includes. Nunjucks also autoescapes by default, and its macros suit the repeated gallery-card, image-credit, and trait-chip fragments.

**Alternatives considered**:
- *EJS*: lighter, but has no real layout inheritance, so the header/footer would be manually included in every view.
- *Pug*: significant whitespace syntax is a needless learning cost.
- *JSX / template literals*: would reintroduce a build step.

---

## R-005: NSFW gating mechanism

**Decision**: A session cookie named `nsfw` (value `1`), set with `httpOnly: false`, `sameSite: 'lax'`, and **no** `maxAge` so it expires when the browser closes. Middleware reads it into `res.locals.nsfw` for every request, and every query and media route consults that flag server-side. Toggling posts to `/preferences/nsfw` and redirects back to the current page.

**Rationale**:
- The Assumptions section fixes the preference as client-side and per browser session, tied to no identity — a session cookie is precisely that, and it requires no server-side session for anonymous visitors.
- Sending it as a cookie (rather than keeping it only in the page) means the server sees the choice on *every* request, including direct requests for an image file, which is what FR-012 demands.
- `sameSite: 'lax'` ensures a normal top-level navigation from an external link still carries the preference, while cross-site form posts do not.
- Defaulting to off is the absence of the cookie, so a first-time visitor is safe by construction (FR-009, SC-001).

**Alternatives considered**:
- *`localStorage` + client-side hiding*: cannot gate the media route, so NSFW image URLs would still resolve. Fails FR-012.
- *Server-side session for anonymous visitors*: creates a session record for every drive-by visitor purely to store one boolean.
- *Query parameter on every link*: pollutes shareable filter URLs and is trivially lost on direct navigation.

---

## R-006: Media storage and delivery

**Decision**: Uploaded files are written to `data/uploads/` under generated names, and are **never** exposed by static file middleware. They are served only by `GET /media/:imageId`, which loads the image record, applies the NSFW check, and then streams the file.

**Rationale**: Serving the upload directory statically would make every NSFW file publicly fetchable by URL, directly violating FR-012. Routing through a handler is the only way to apply the rating check to the bytes themselves. Generated filenames also prevent collisions and path traversal from user-supplied names.

**Alternatives considered**:
- *`express.static` on the uploads directory*: fails FR-012.
- *Unguessable random URLs ("security by obscurity")*: the URL is visible in the page source as soon as the admin or an opted-in visitor loads it, after which it is permanently public.
- *External object storage (S3 and similar)*: unnecessary for a single-owner site at this scale and would require signed-URL machinery to preserve gating.

---

## R-007: Delete semantics per entity

**Decision**: Enforce the spec's deliberately differing rules at the database level with foreign key actions, and surface friendly messages in the service layer.

| Relationship | Rule | Driven by |
|---|---|---|
| Character → its images / stories links | Cascade the link rows; shared images and stories survive for other characters | FR-029 |
| Character ↔ Trait | Cascade the link row | FR-062 |
| Tag in use by a character | `RESTRICT` — refuse deletion | Tags are mandatory (FR-041) |
| Trait in use by a character | Allowed; trait is removed from those characters | FR-062, traits are optional (FR-060) |
| Gender in use | `RESTRICT` — refuse deletion | FR-044 |
| Artist / Designer in use | `RESTRICT` — refuse deletion | FR-046 |

**Rationale**: Traits and tags look alike but must behave differently on delete precisely because traits are optional and tags are not — deleting a tag in use would leave a character invalid, whereas deleting a trait in use simply leaves the character with fewer traits. Encoding this in the schema means the rule cannot be forgotten in application code. `PRAGMA foreign_keys = ON` must be set on every connection, as SQLite defaults it off.

**Alternatives considered**: Enforcing entirely in application code — rejected because a missed check silently corrupts data, and the checks would have to be duplicated across every delete path.

---

## R-008: Authentication and session handling

**Decision**: A single admin credential. The password is stored as a `scrypt` hash (via the built-in `node:crypto`) in an environment variable, never in the database or source. Sessions use `express-session` with a SQLite-backed store, an `httpOnly`, `sameSite: 'lax'` cookie, and a rolling idle timeout. Failed sign-ins are throttled with `express-rate-limit`.

**Rationale**:
- Only one role exists (Clarifications), so a user table, registration, and role checks would all be dead weight.
- `crypto.scrypt` is a memory-hard KDF built into Node, giving proper password hashing with no dependency and no native build (unlike `bcrypt` or `argon2`).
- A persistent session store means restarting the server does not silently sign the admin out, and `rolling: true` with `maxAge` implements the idle expiry FR-031 requires.
- `express-rate-limit` on the login route satisfies the throttling half of FR-031.

**Alternatives considered**:
- *Plain-text or config-file password*: unacceptable.
- *Stateless JWT*: cannot be revoked on sign-out (FR-030) without server state anyway.
- *Full user table with roles*: contradicts the admin-only clarification.

---

## R-009: CSRF protection

**Decision**: A synchroniser token held in the admin session, injected into every admin form as a hidden field and verified by middleware on every state-changing request. Implemented in ~30 lines using `node:crypto`; no dependency.

**Rationale**: Every mutating action is an authenticated admin form post, so a session-bound token is the textbook fit. The long-standing `csurf` package is deprecated and unmaintained, so pulling it in would add risk rather than remove it. `sameSite: 'lax'` on the session cookie is defence in depth, not a substitute.

**Alternatives considered**: `csurf` (deprecated); `csrf-csrf` (a reasonable package, but the double-submit pattern it implements is unnecessary when a server-side session already exists).

---

## R-010: Upload handling and validation

**Decision**: `multer` with disk storage, a 10 MB per-file limit, and an accept list of `image/jpeg`, `image/png`, `image/webp`, `image/gif`. The declared MIME type is confirmed against the file's magic bytes after upload; rejected files are deleted before any database write. Form fields are validated with `zod`.

**Rationale**: FR-027 requires rejecting unsupported types and oversized uploads *without creating a partial record*, so validation must complete before the transaction opens and any temporary file must be cleaned up on failure. A browser-supplied `Content-Type` is trivially forged, hence the magic-byte confirmation. `zod` gives one schema per form that yields both the parsed values and the field-level error messages FR-027 asks for.

**Alternatives considered**: `busboy` directly (more plumbing for no gain); trusting `Content-Type` alone (insufficient); image re-encoding via `sharp` (a heavy native dependency; thumbnail generation is deferred and noted below).

---

## R-011: Case-insensitive uniqueness for named lookups

**Decision**: Trim surrounding whitespace and collapse internal runs of whitespace on input, then enforce uniqueness with `CREATE UNIQUE INDEX ... ON t (name COLLATE NOCASE)` for tags, traits, genders, artists, and designers.

**Rationale**: FR-048 and FR-059 require names differing only in case or surrounding whitespace to be treated as duplicates. A `NOCASE` unique index makes the database the single source of truth, so a duplicate cannot slip in through a path that forgot to check. Trimming on input is still required because `NOCASE` does not ignore whitespace. Note FR-059's sharper rule: a trait name collides regardless of its sin/virtue marking, so the index is on `name` alone, not on `(name, kind)`.

**Alternatives considered**: Application-level `SELECT`-then-`INSERT` checks — racy in principle and easy to omit; a generated lowercase column — redundant given `COLLATE NOCASE`.

---

## R-012: Filtering semantics

**Decision**: Tag and trait filters use AND semantics (a character must carry *all* selected values), implemented with `GROUP BY ... HAVING COUNT(DISTINCT ...) = :n`. Gender is a single-value equality filter. All three combine, and the active selection round-trips through the query string as repeated `tag=` / `trait=` parameters plus a single `gender=`.

**Rationale**: FR-015 and FR-054 explicitly specify "carrying all selected". The `HAVING COUNT` form is the standard set-containment query and stays a single statement as filters combine (FR-055). Repeated query parameters are what plain HTML checkbox groups submit, so the shareable URL of FR-018 falls out of using ordinary forms.

**Alternatives considered**: OR semantics (contradicts the spec); chained `EXISTS` subqueries per value (equivalent results, but the SQL grows with the selection); comma-joined parameter values (needs custom parsing and escaping).

---

## R-013: Facet lists must respect the NSFW setting

**Decision**: The tag, gender, and trait options offered on the gallery are computed from the set of characters *currently visible*, within the same request, rather than from the full taxonomy tables.

**Rationale**: FR-016, FR-040, and FR-056 each require offering only values in use by at least one visible character, and an Edge Case calls out that a value must disappear from the filter list once nothing visible matches. Deriving facets from the filtered character set is what guarantees FR-017's empty state is only ever reachable by combining filters, never by picking a single dead option.

**Alternatives considered**: Listing every row from the taxonomy tables — simpler, but offers options that yield zero results, contradicting the requirements above.

---

## R-014: Avatar fallback

**Decision**: A character's avatar resolves per request to its designated avatar image if that image is visible at the current rating level; otherwise to its oldest visible image; otherwise to a static neutral placeholder shipped in `public/img/`.

**Rationale**: FR-014 requires a placeholder rather than hiding the character, and FR-052 keeps the detail page reachable with its non-media information intact. Because every character must own at least one image (FR-041), the placeholder is reached only through the NSFW rating path, never through missing data. Preferring a different *visible* image over the placeholder gives a better result for a character whose designated avatar happens to be NSFW.

**Alternatives considered**: Always showing the placeholder when the designated avatar is hidden (wastes a perfectly good SFW image); hiding the character (explicitly rejected in the clarification session).

---

## R-015: Testing approach

**Decision**: The built-in `node:test` runner with `node:assert/strict`, plus `supertest` for HTTP-level tests against the Express app. Each test run uses a throwaway SQLite database seeded by a fixtures helper.

**Rationale**: `node:test` needs no runner dependency, no configuration file, and no transform step, which matches the no-build-step decision. The requirements that carry the most risk — NSFW gating, filter combinations, atomic character creation, delete semantics — are all observable at the HTTP layer, so `supertest` covers them end to end. A fresh database per run keeps tests order-independent.

**Alternatives considered**: Jest or Vitest (extra dependency and configuration for a feature set `node:test` already covers); Playwright (valuable for the responsive and keyboard criteria, but heavy to introduce now — noted as a follow-up below).

---

## R-016: Responsive layout and accessibility

**Decision**: Hand-written CSS using a mobile-first `grid` gallery via `repeat(auto-fill, minmax(...))`, fluid media, and a single navigation breakpoint. Verified at 360px–1920px. Filters are `<fieldset>`-grouped native checkboxes and a `<select>` inside a `GET` form; the NSFW toggle is a real `<input type="checkbox">` in a form that submits on change, with a no-JS submit button fallback.

**Rationale**: FR-033, FR-034, SC-006, and SC-009 demand responsiveness and full keyboard operability. Native form controls are keyboard-operable, screen-reader-labelled, and focus-visible by default, so using them is the shortest path to satisfying those criteria — custom widgets would mean re-implementing behaviour the browser already provides correctly. A CSS framework would add weight and a build step for a handful of layouts.

**Alternatives considered**: Tailwind or Bootstrap (build step and dependency for ~300 lines of CSS); JavaScript-driven filtering (breaks the shareable-URL and no-JS properties).

---

## Deferred (explicitly out of scope for this feature)

These are recorded so they are not mistaken for oversights:

- **Thumbnail generation / responsive `srcset`.** Full-size images are served as uploaded. If SC-003 is missed with a realistic 1,000-image library, add `sharp` and a derivative pipeline behind the existing `/media/:id` route — the route boundary means no template changes.
- **Free-text search, pagination, and custom sort orders.** Out of scope per Assumptions.
- **Browser-automation tests** for the responsive and keyboard criteria; these are verified manually against SC-006 and SC-009 for now.
- **Localisation.** Out of scope per Assumptions.
