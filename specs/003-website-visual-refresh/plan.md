# Implementation Plan: Website-Wide Visual Refresh

**Branch**: `003-website-visual-refresh` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-website-visual-refresh/spec.md`

## Summary

Refresh the appearance of every public and admin page as a coherent site, retaining the existing dark-neutral direction and using the selected purple palette (`#DD92FB`, `#8D79FF`, `#3E4EB4`) for brand accents. Reuse the current server-rendered templates and stylesheet; adjust shared tokens and component/page styles without changing route behavior, content, access rules, or rating visibility. Verify the design across representative pages, viewport widths, keyboard focus, contrast, and unchanged NSFW tests.

## Technical Context

**Language/Version**: CSS3, HTML/Nunjucks; Node.js 22+ project runtime  
**Primary Dependencies**: Existing Nunjucks templates and plain CSS; no new dependencies  
**Storage**: N/A — presentation-only, no stored data  
**Testing**: Existing Node.js `node:test` suite (`npm test`, `npm run test:nsfw`); targeted accessibility and rendered-page checks  
**Target Platform**: Existing self-hosted, server-rendered website; desktop and responsive browser widths from 320px to 1920px  
**Project Type**: Single Node.js web application  
**Performance Goals**: No perceptible delay or layout instability attributable to the refresh; no added client-side runtime  
**Constraints**: Preserve routes, content, semantics, NSFW filtering, controls, and document order; keep keyboard focus visible; avoid horizontal page scrolling; maintain WCAG 2.1 AA contrast targets (4.5:1 normal text, 3:1 large text and meaningful control boundaries)  
**Scale/Scope**: Shared site chrome, all six public page types, all admin page types, and common components/states

## Constitution Check

### Pre-Design Gate

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | No route, content, media, or rating behavior changes. Keep rating-dependent markup and all gating tests unchanged. |
| II. Data Integrity Through Invariants | PASS | No persistence or data-model changes. |
| III. Works Without JavaScript | PASS | Styling only; preserve semantic markup, source order, ordinary links/forms, visible focus, meaningful image alternatives, and responsive layout. |
| IV. Test-First Where It Counts | PASS | No changes to safety-critical behavior. Run existing HTTP-level rating suite unchanged and add/extend presentation checks only where needed. |
| V. Boring By Default | PASS | Reuse the shared stylesheet and existing templates. No new package, build step, framework, or client-side behavior. |

### Post-Design Gate

| Principle | Status | Evaluation |
|---|---|---|
| I. Content Rating Safety | PASS | The UI contract explicitly forbids CSS/markup changes that deliver or expose gated content differently. |
| II. Data Integrity Through Invariants | PASS | Design adds no entities, fields, or database operations. |
| III. Works Without JavaScript | PASS | Design uses CSS and semantic HTML; it does not make visual styling or scripts the only means to reach content or controls. |
| IV. Test-First Where It Counts | PASS | Existing NSFW regression tests remain authoritative and must pass without relaxing assertions. |
| V. Boring By Default | PASS | One existing stylesheet and current templates are sufficient; no additional tooling or dependency is justified. |

No constitution violations or unresolved technical clarifications remain.

## Project Structure

### Documentation (this feature)

```text
specs/003-website-visual-refresh/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── visual-refresh.md
└── tasks.md                 # Produced by /speckit-tasks
```

### Source Code (existing project)

```text
src/
├── public/
│   └── css/
│       └── main.css             # Shared design tokens and public/admin component styles
└── views/
    ├── layout.njk               # Shared site chrome
    ├── pages/                   # Gallery, character, image, artist, relationship, story
    ├── partials/                # Shared navigation, forms, cards, content components
    └── admin/                   # Dashboard, lists, forms, and admin chrome

tests/
└── integration/
    ├── accessibility.test.js    # Responsive metadata, focus, and semantic checks
    ├── route-audit.test.js      # Existing public-route inventory; must remain unchanged
    └── nsfw-*.test.js           # Existing rating safety; must remain unchanged
```

**Structure Decision**: Keep the existing single application structure. Shared CSS is the visual system's primary surface; template edits are limited to presentation hooks or semantics needed to make existing elements consistently styleable. No routes or application layers are added.

## Complexity Tracking

No constitutional violations require justification.
