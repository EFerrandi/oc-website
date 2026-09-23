# OC Website Constitution

A personal website for cataloguing original characters. Single admin, anonymous visitors,
self-hosted. These principles exist to keep a small project honest about the few things
that would genuinely hurt if they broke.

## Core Principles

### I. Content Rating Safety (NON-NEGOTIABLE)

Adult content MUST NOT reach a visitor who has not explicitly opted in. This is the one
promise the site cannot break, and it is a server-side guarantee, never a client-side hide.

- Rating enforcement MUST happen on the server. Rendering content and then hiding it with
  CSS, JavaScript, or template conditionals alone is a violation, because the bytes have
  already been delivered.
- Uploaded files MUST NOT be served by static middleware. Every byte of user-supplied media
  MUST pass through a single gated route that checks the rating first.
- Adding a new way to reach media or narrative content MUST route through the existing gate.
  A new variant, size, format, or convenience endpoint is a new bypass until proven otherwise.
- Refusing gated content MUST return "not found", never "forbidden". A `403` confirms that a
  specific adult item exists at that address, which leaks the very thing being protected.
- The safe state MUST be the default. Absent, malformed, or unparseable opt-in signals mean
  adult content is hidden.

**Rationale**: Every other defect here is cosmetic and fixable after the fact. This one is
not — once adult content has been served to someone who did not ask for it, no later patch
undoes it. Centralising the check in one chokepoint is what makes the guarantee auditable
rather than a matter of remembering to add a condition in each new template.

### II. Data Integrity Through Invariants

Rules about what constitutes valid data MUST be written down and enforced at the lowest
practical layer, not re-derived by each piece of code that touches the data.

- Cross-entity invariants MUST be stated explicitly in the data model and MUST each have
  exactly one enforcement point. Scattering the same rule across request handlers guarantees
  the copies will drift.
- Rules expressible as database constraints or foreign-key actions MUST be expressed that
  way rather than in application code alone, so that a later code change cannot silently
  relax them.
- Operations spanning more than one table MUST be atomic. A failure MUST leave no partial
  record and no orphaned uploaded file.
- Deliberate asymmetries MUST be documented at the point of definition with their reason.
  Rules that look inconsistent get "cleaned up" by a well-meaning later change unless the
  inconsistency is visibly intentional.
- Validation failures MUST name the field that failed. Rejecting input without saying what
  was wrong is a defect, not a safeguard.

**Rationale**: This project has genuinely asymmetric rules — some references block deletion
while others cascade — and they are correct precisely because they differ. Encoding them as
schema constraints and documenting the asymmetry is what stops a future refactor from
"fixing" the difference and corrupting data in a way that no test would obviously catch.

### III. Works Without JavaScript

Every feature MUST be usable with JavaScript unavailable. JavaScript enhances; it never
enables.

- Navigation, filtering, content submission, and rating opt-in MUST work through ordinary
  links and form submissions.
- Client-side behaviour MUST be layered onto markup that already works, by intercepting it,
  never by being the only path to the behaviour.
- State the visitor can arrive at MUST be reachable by URL, so that filtered views can be
  bookmarked, shared, and reloaded.
- Every interactive control MUST be keyboard-operable with a visible focus indicator. Any
  control that traps focus MUST return it where the visitor left off.
- Every image MUST carry meaningful alternative text.
- Every page MUST remain usable without horizontal scrolling from narrow phone widths to
  wide desktop widths.

**Rationale**: A server-rendered baseline is what makes the rating gate enforceable in the
first place — if the page assembles itself on the client, the server can no longer be the
authority on what was delivered. Accessibility and shareable URLs fall out of the same
choice rather than needing separate machinery.

### IV. Test-First Where It Counts

Tests MUST be written before the implementation for safety-critical behaviour. Elsewhere,
tests are still required, but their timing is a matter of judgement.

- Test-first is MANDATORY for: rating enforcement, the data invariants of Principle II,
  deletion semantics, and access control. These MUST have a failing test before the code
  that satisfies them exists.
- Rating enforcement MUST have a dedicated test suite that can be run in isolation, so a
  regression in the project's central promise is never buried in a full-suite summary.
- Cross-cutting rules MUST be verified at the HTTP level. Unit tests on internals can pass
  while the assembled application still leaks, because the leak is usually in the wiring.
- Other behaviour MUST be covered by tests, but they MAY be written after the code.
- A bug fix MUST add a test that fails before the fix.

**Rationale**: Blanket TDD on a personal single-admin site produces ceremony around CRUD
forms that nobody benefits from. But the rules above fail silently and are discovered late
or never — writing the test first is the only reliable way to confirm the test can actually
detect the failure it claims to guard against.

### V. Boring By Default

Prefer the option that adds the least machinery. Complexity MUST be justified by a concrete,
present need, not an anticipated one.

- Platform built-ins MUST be preferred over an added dependency when they are adequate.
- A dependency MUST be justified by what it replaces. Native dependencies additionally MUST
  be justified against the build friction they introduce on every developer machine.
- Build steps, code generation, and client-side frameworks MUST NOT be introduced without a
  demonstrated need that simpler means cannot meet.
- Abstraction layers, indirection, and configurability MUST NOT be added for hypothetical
  future requirements.
- Features not requested MUST NOT be built. Scope deliberately excluded MUST be recorded as
  excluded so it is not mistaken for an oversight.

**Rationale**: This site is maintained by one person, intermittently. The dominant long-term
cost is re-understanding the code after months away and keeping dependencies from rotting.
Both are minimised by having less of everything.

## Technical Constraints

- All database access MUST be confined to a dedicated data-access layer. Multi-step
  invariants and transactions MUST live in a service layer. Route handlers MUST deal only
  with HTTP concerns. This exists so that each rule from Principle II has one home.
- Schema changes MUST be forward-only, ordered, and applied by a recorded migration. Editing
  an already-applied migration is prohibited.
- Referential integrity MUST be active on every database connection, not assumed.
- Secrets MUST come from the environment. Credentials MUST NOT be committed, and passwords
  MUST be stored only as salted hashes from a deliberately slow algorithm.
- State-changing requests MUST require a session-bound token, and repeated failed
  authentication attempts MUST be throttled.
- Errors surfaced to visitors MUST NOT expose internal details; the admin MAY see enough to
  act.
- Uploaded files MUST be validated by content, not by the client-supplied type, which is
  trivially forged.

## Development Workflow

- Specification precedes planning, which precedes tasks, which precede implementation.
  Ambiguity MUST be resolved in the specification rather than decided implicitly in code.
- When a clarification invalidates an already-generated artifact, the downstream artifact
  MUST be corrected in the same session. Leaving a plan that contradicts its specification
  is treated as a defect.
- Requirements MUST be traceable: each one is referenced by the design artifacts that
  satisfy it, and unreferenced requirements are treated as gaps.
- The Constitution Check in a plan MUST be evaluated against these principles. Recording a
  pass without evaluation is a violation.
- Deviations MUST be recorded with their justification and the simpler alternative that was
  rejected, or else removed.

## Governance

This constitution takes precedence over convenience, habit, and prior practice in this
repository. Where a principle here conflicts with an instruction elsewhere, this document
governs until it is amended.

**Amendment procedure**: Amendments MUST be made by updating this document, with the version
incremented and a Sync Impact Report describing what changed and why. An amendment that
relaxes or removes a principle MUST state what replaces the protection being given up.

**Versioning policy**: Semantic versioning applies to governance.

- MAJOR: a principle is removed or redefined in a way that permits what it previously forbade.
- MINOR: a principle or section is added, or existing guidance is materially expanded.
- PATCH: clarifications and wording changes that do not alter what is required.

**Compliance review**: Planning MUST verify compliance before design work begins and again
after it. Principle I MUST be re-verified whenever a new route serving stored content is
added. Complexity MUST be justified against Principle V at the point it is introduced, not
retrospectively.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
