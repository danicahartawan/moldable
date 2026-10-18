# Centered Project Pill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an otherwise blank white web page containing only a centered floating project-thumbnail pill.

**Architecture:** A minimal Vite/React application renders one semantic `ProjectPill` component. Local CSS and inline SVG/CSS marks provide the complete visual treatment without remote assets or application state.

**Tech Stack:** React 18, Vite 5, TypeScript, CSS, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-10-17-centered-project-pill-design.md`

## Global Constraints

- Render only the centered project pill on a white page.
- Do not include side links, sound controls, menus, dialogs, routing, or body content.
- Use local SVG/CSS artwork with no remote runtime assets.
- Prevent horizontal overflow at narrow viewport widths.
- Every project mark must be keyboard-focusable and have an accessible label.

## Review Focus

- Narrow screens: the pill must shrink without horizontal page overflow.
- Keyboard navigation: every mark must receive visible focus in source order.
- Missing JavaScript behavior: buttons must remain visually stable without requiring click handlers.
- High-density displays: SVG/CSS marks must remain crisp.
- Reduced-motion users: no animation or motion dependency may be introduced.

---

### Task 1: Minimal application and accessible pill

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/ProjectPill.tsx`
- Create: `src/ProjectPill.test.tsx`
- Create: `src/styles.css`
- Create: `vite.config.ts`
- Create: `tsconfig.json`

**Interfaces:**
- Consumes: the approved visual specification only.
- Produces: `ProjectPill(): JSX.Element`, rendered by `App(): JSX.Element`.

- [ ] **Step 1: Scaffold the minimal Vite/React/TypeScript test configuration**

Add only the scripts and dependencies needed for `dev`, `build`, and `test`, plus the HTML and TypeScript entry points.

- [ ] **Step 2: Write failing component tests**

In `src/ProjectPill.test.tsx`, assert that the labeled project chooser renders eight labeled buttons, contains no navigation-link text, and exposes every mark to keyboard focus. Add a DOM/CSS contract assertion for the component's responsive class and local-only artwork.

- [ ] **Step 3: Run the focused test to verify failure**

Run: `npm test -- --run src/ProjectPill.test.tsx`

Expected: FAIL because `ProjectPill` does not exist.

- [ ] **Step 4: Implement the semantic component and local artwork**

Implement `ProjectPill(): JSX.Element` as a labeled group containing eight `button` elements. Draw distinct miniature marks using inline SVG and CSS primitives; do not add click behavior, external URLs, or unrelated copy.

- [ ] **Step 5: Implement the locked visual treatment**

In `src/styles.css`, use a white full-viewport canvas, absolute top-center placement, a compact white rounded surface, subtle border/shadow, slim edge separators, responsive gaps and mark sizes, no animation, and an obvious `:focus-visible` treatment.

- [ ] **Step 6: Run tests and production build**

Run: `npm test -- --run && npm run build`

Expected: all tests PASS and Vite exits successfully with generated `dist` assets.

- [ ] **Step 7: Commit the working implementation**

```bash
git add package.json index.html src vite.config.ts tsconfig.json
git commit -m "feat: add centered project pill"
```

### Task 2: Visual and responsive verification

**Files:**
- Modify: `src/styles.css` only if comparison reveals drift.

**Interfaces:**
- Consumes: `ProjectPill(): JSX.Element` from Task 1.
- Produces: a visually verified desktop and mobile rendering.

- [ ] **Step 1: Start the local preview and capture desktop and mobile renders**

Run: `npm run dev -- --host 127.0.0.1`, then inspect at a desktop viewport and at 375 px width.

- [ ] **Step 2: Compare against the locked screenshot**

Verify top offset, pill proportions, corner radius, internal rhythm, separator weight, artwork crispness, and the absence of every excluded element.

- [ ] **Step 3: Correct actionable visual drift**

Make only reference-driven CSS adjustments; do not add page content or interactions.

- [ ] **Step 4: Re-run automated verification**

Run: `npm test -- --run && npm run build`

Expected: all tests PASS and the production build succeeds.

- [ ] **Step 5: Commit visual adjustments if any**

```bash
git add src/styles.css
git commit -m "style: refine project pill fidelity"
```
