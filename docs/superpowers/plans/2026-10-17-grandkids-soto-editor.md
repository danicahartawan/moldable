# Grandkids Soto Ayam Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate `/grandkids` editorial Soto Ayam recipe whose ingredient toolbox supports quantities, tactile placement, text wrapping, serving-size adaptation, and daun salam substitution.

**Architecture:** Route at the `App` boundary without adding a router dependency. Keep canonical recipe data and command parsing pure, then compose focused React components around a `GrandkidsPage` state owner; Pointer Events resolve drops into semantic section/lane placements rendered as CSS floats with `shape-outside`.

**Tech Stack:** React 18, TypeScript, CSS, Phosphor icons, Vitest/Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-17-grandkids-soto-editor-design.md`

## Global Constraints

- `/grandkids` must be separate; every other path retains the existing interface.
- Soto Ayam is the only recipe in this version, with an immutable four-serving original.
- Do not add runtime dependencies, a backend, persistence, real ordering, or arbitrary pixel positioning.
- Ingredient drag interactions must have click and keyboard equivalents.
- Respect reduced-motion preferences and preserve a readable single-stream mobile layout.

## Review Focus

- Mixed-case or punctuated supported commands must still parse without altering the immutable base data; Task 2 tests this.
- Serving counts below 1, above 20, or absent must leave the recipe unchanged with useful feedback; Task 2 tests this.
- Pointer cancellation or drops outside the recipe must not create ingredients; Task 4 tests this.
- Repeated placement of one ingredient must create independent instances without removing its toolbox source; Task 4 tests this.
- Narrow screens and missing images must retain readable controls and labeled fallbacks; Task 5 tests this.

---

## File Structure

- `src/App.tsx`: pathname boundary between the existing app and `/grandkids`.
- `src/grandkids/recipeData.ts`: immutable Soto Ayam data, quantity formatting, and adaptation types.
- `src/grandkids/recipeCommands.ts`: pure parser for supported natural-language edits.
- `src/grandkids/GrandkidsPage.tsx`: state owner and editorial page composition.
- `src/grandkids/IngredientToolbox.tsx`: ingredient sources, quantity tooltips, and add/drag initiation.
- `src/grandkids/EditorialRecipe.tsx`: narrative sections, media controls, and semantic drop lanes.
- `src/grandkids/IngredientObject.tsx`: placed object controls and wrap-side presentation.
- `src/grandkids/RecipeCommandBar.tsx`: command input, proposals, application, and feedback.
- `src/grandkids/grandkids.css`: isolated editorial, interaction, responsive, and reduced-motion styling.
- `src/grandkids/*.test.tsx`: unit/component coverage beside each responsibility.
- `tests/grandkids.spec.ts`: browser interaction and responsive-layout coverage.

### Task 1: Route and immutable Soto Ayam model

**Files:**
- Create: `src/grandkids/recipeData.ts`
- Create: `src/grandkids/GrandkidsPage.tsx`
- Create: `src/grandkids/GrandkidsPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/GingerStage.test.tsx`

**Interfaces:**
- Produces: `Ingredient`, `RecipeState`, `IngredientId`, `sotoAyamRecipe`, `scaleQuantity(quantity: number, servings: number): number`, and `GrandkidsPage(): JSX.Element`.
- Consumes: no new interfaces.

- [ ] **Step 1: Write failing route and data tests** asserting `/grandkids` renders a `Soto Ayam` main region with all 14 named ingredients, the default serves-four state, and no existing ginger/project-bar UI; assert `/` still renders the existing interface.
- [ ] **Step 2: Run the focused tests** with `npm test -- src/grandkids/GrandkidsPage.test.tsx src/GingerStage.test.tsx`; expect failures because the route and page do not exist.
- [ ] **Step 3: Add the immutable model and route shell** using exact base quantities from the spec; make `App` select `GrandkidsPage` only when `window.location.pathname === '/grandkids'`.
- [ ] **Step 4: Run the focused tests** with the same command; expect all passing.
- [ ] **Step 5: Commit** with `git add src/App.tsx src/GingerStage.test.tsx src/grandkids && git commit -m "feat: add grandkids soto route"`.

### Task 2: Deterministic natural-language adaptations

**Files:**
- Create: `src/grandkids/recipeCommands.ts`
- Create: `src/grandkids/recipeCommands.test.ts`
- Modify: `src/grandkids/recipeData.ts`

**Interfaces:**
- Consumes: `IngredientId` and the four-serving base model from Task 1.
- Produces: `RecipeCommand = { type: 'scale'; servings: number } | { type: 'substitute'; originalId: 'daun-salam'; replacement: 'bay leaf'; tradeoff: string } | { type: 'unsupported'; message: string }` and `parseRecipeCommand(input: string): RecipeCommand`.

- [ ] **Step 1: Write failing parser tests** for `I'm making this for six people.`, numeric serving text, mixed casing/punctuation, the Berkeley daun salam sentence, empty/unsupported input, and counts `0` and `21`; assert scaling 700 g from four to six returns `1050` without mutating base data.
- [ ] **Step 2: Run** `npm test -- src/grandkids/recipeCommands.test.ts`; expect failure because the parser is missing.
- [ ] **Step 3: Implement the pure parser and scale helper** with word-number support for one through twenty and the exact bay-leaf tradeoff from the spec; invalid ranges produce `unsupported`.
- [ ] **Step 4: Run** the same test command; expect all passing.
- [ ] **Step 5: Commit** with `git add src/grandkids/recipeCommands* src/grandkids/recipeData.ts && git commit -m "feat: parse recipe adaptations"`.

### Task 3: Editorial page, toolbox, and command bar

**Files:**
- Create: `src/grandkids/IngredientToolbox.tsx`
- Create: `src/grandkids/RecipeCommandBar.tsx`
- Create: `src/grandkids/EditorialRecipe.tsx`
- Create: `src/grandkids/IngredientToolbox.test.tsx`
- Create: `src/grandkids/RecipeCommandBar.test.tsx`
- Modify: `src/grandkids/GrandkidsPage.tsx`

**Interfaces:**
- Consumes: recipe model and `parseRecipeCommand` from Tasks 1–2.
- Produces: `IngredientToolbox({ ingredients, servings, onAdd, onDragStart })`, `RecipeCommandBar({ onApply })`, and `EditorialRecipe({ servings, substitution, children })`.

- [ ] **Step 1: Write failing toolbox tests** asserting all sources remain after repeated Add actions and each hover/focus target exposes `name · scaled quantity` through an accessible tooltip.
- [ ] **Step 2: Write failing command-bar tests** asserting six servings updates `700 g` to `1,050 g`, briefly marks changed values, daun salam shows an apply/dismiss proposal and tradeoff, apply retains “Grandma's original: daun salam,” and unsupported input changes no quantities.
- [ ] **Step 3: Run** `npm test -- src/grandkids/IngredientToolbox.test.tsx src/grandkids/RecipeCommandBar.test.tsx`; expect missing-component failures.
- [ ] **Step 4: Implement the three components and state wiring** including title `01 / Soto Ayam`, scattered narrative passages, documentary-image region, demonstrative audio button, quantity formatting, substitution proposal, and labeled DoorDash discovery action without external calls.
- [ ] **Step 5: Run** the same tests; expect all passing.
- [ ] **Step 6: Commit** with `git add src/grandkids && git commit -m "feat: compose editorial soto experience"`.

### Task 4: Semantic dragging and text-wrap placement

**Files:**
- Create: `src/grandkids/IngredientObject.tsx`
- Create: `src/grandkids/IngredientObject.test.tsx`
- Modify: `src/grandkids/IngredientToolbox.tsx`
- Modify: `src/grandkids/EditorialRecipe.tsx`
- Modify: `src/grandkids/GrandkidsPage.tsx`

**Interfaces:**
- Consumes: ingredient identifiers and toolbox drag initiation from Tasks 1 and 3.
- Produces: `Placement = { instanceId: string; ingredientId: IngredientId | 'soto-bowl'; section: 'story' | 'ingredients' | 'method' | 'finish'; lane: 'left' | 'right' }`, `resolveDrop(pointer: { x: number; y: number }, sections: DropSectionBox[]): Pick<Placement, 'section' | 'lane'> | null`, and `IngredientObject` move/remove callbacks.

- [ ] **Step 1: Write failing unit/component tests** for nearest left/right lane resolution, outside-drop returning `null`, two copies receiving distinct IDs, pointer cancellation producing no placement, keyboard Add, lane switching, section movement, and removal.
- [ ] **Step 2: Run** `npm test -- src/grandkids/IngredientObject.test.tsx`; expect failure because placement logic is missing.
- [ ] **Step 3: Implement Pointer Event placement** with a visible drop preview and semantic placement records; use native pointer capture and do not add a drag library.
- [ ] **Step 4: Render placed objects as left/right floats** with per-object `shape-outside`, labeled fallback silhouettes, and controls available on focus.
- [ ] **Step 5: Run** the focused tests and `npm test`; expect all passing.
- [ ] **Step 6: Commit** with `git add src/grandkids && git commit -m "feat: add moldable ingredient placement"`.

### Task 5: Editorial styling, responsive behavior, and browser verification

**Files:**
- Create: `src/grandkids/grandkids.css`
- Modify: `src/grandkids/GrandkidsPage.tsx`
- Create: `tests/grandkids.spec.ts`

**Interfaces:**
- Consumes: semantic class names and placement state from Tasks 1–4.
- Produces: the final desktop/tablet/mobile presentation and browser-level interaction contract.

- [ ] **Step 1: Write failing Playwright tests** that open `/grandkids`, verify the editorial title and toolbox, drag turmeric into a visible lane, confirm a placed turmeric object and non-overlapping recipe text, submit the six-person command, and verify the mobile viewport exposes a horizontally scrollable bottom tray.
- [ ] **Step 2: Add browser assertions** for a deliberately broken ingredient image showing its labeled fallback and for reduced-motion CSS disabling placement transitions.
- [ ] **Step 3: Run** `npm run test:browser -- tests/grandkids.spec.ts`; expect failures before final styling/drag geometry.
- [ ] **Step 4: Implement isolated visual styling** matching the reference structure: warm paper canvas, high-contrast serif typography, asymmetrical passages, generous negative space, small documentary media, circular audio control, translucent centered desktop toolbox, responsive bottom tray, visible focus, and reduced-motion rules.
- [ ] **Step 5: Run** `npm run build`, `npm test -- --run`, and `npm run test:browser -- tests/grandkids.spec.ts`; expect successful build and all tests passing.
- [ ] **Step 6: Inspect the desktop and mobile screenshots** produced by Playwright for collisions, clipped tooltips, unreadable wrapping, or controls obscuring content; correct any issue and repeat Step 5.
- [ ] **Step 7: Commit** with `git add src/grandkids tests/grandkids.spec.ts && git commit -m "feat: finish grandkids editorial recipe"`.

### Task 6: Final regression and accessibility pass

**Files:**
- Modify only files implicated by verification failures.

**Interfaces:**
- Consumes: the complete implementation.
- Produces: verified release-ready `/grandkids` experience without regressions to `/`.

- [ ] **Step 1: Run the complete verification suite** using `npm run build && npm test -- --run && npm run test:browser`; expect zero failures.
- [ ] **Step 2: Verify keyboard-only flow manually**: reach every toolbox item, reveal quantities, add an item, change its lane/section, remove it, scale to six servings, and apply/dismiss the substitution with visible focus throughout.
- [ ] **Step 3: Verify both routes manually** at `/` and `/grandkids`; confirm the existing ginger interface is unchanged and Grandkids has no project-bar UI.
- [ ] **Step 4: Review `git diff --check` and `git status --short`**; expect no whitespace errors and only intentional changes.
- [ ] **Step 5: Commit any verification corrections** with a narrowly scoped message; skip this commit if no files changed.
