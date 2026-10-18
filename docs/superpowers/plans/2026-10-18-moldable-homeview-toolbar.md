# Moldable HomeView Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Moldable HomeView surface: a square white display on a light-gray surround with a right-side cloud mascot and an accessible, curved cooking-tool rail that expands from a left-edge gradient.

**Architecture:** Keep the App Router page server-rendered and delegate interaction to a focused client-side `ToolRail`. `MoldableHome` owns composition only; `ToolRail` owns open, focus, hover, and selected state from a local typed tool definition array. A feature-scoped stylesheet implements the square display, orbital rail, responsive tap behavior, and reduced-motion variant.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript, CSS, Phosphor Icons, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-18-moldable-homeview-toolbar-design.md`

## Global Constraints

- The display must remain square, reflecting the stated 5.73-by-5.73-inch HomeView proportions.
- Use the existing Archivo variable font and `/grandma`'s restrained text, shadow, and motion language.
- Use `public/assets/grandma-character.png`; do not introduce the red mascot or new mascot artwork.
- The first tool set is exactly Microwave, Blend, Timer, Weigh, and Temperature.
- Tool clicks select visually but do not navigate or launch functional applications in this slice.
- Add no new runtime dependency; use the installed `@phosphor-icons/react` package.
- The idle state shows only the left gradient affordance and the right-side mascot; labels stay visually collapsed.

## Review Focus

- Keyboard-only use: tabbing into the trigger or any tool must reveal the rail and its accessible labels, without focus being clipped.
- Hover boundary gaps: moving from the gradient trigger to the first tool must not collapse the rail before the pointer arrives.
- Coarse pointer use: tapping the gradient must toggle the rail because hover is unavailable.
- Narrow/short viewports: the square display must fit the smaller axis and the mascot must not overlap the toolbar.
- Reduced motion: open, close, and chip expansion must resolve immediately without transitions or orbital animation.

---

## File structure

- Create `src/home/MoldableHome.tsx`: static HomeView composition and mascot placement.
- Create `src/home/ToolRail.tsx`: typed cooking-tool data and all toolbar interaction state.
- Create `src/home/moldable-home.css`: display, gradient, orbital rail, chip, mascot, responsive, and reduced-motion styles.
- Create `src/home/MoldableHome.test.tsx`: composition, asset, and tool integration tests.
- Create `src/home/ToolRail.test.tsx`: semantic and pointer/keyboard interaction tests.
- Create `tests/homeview-toolbar.spec.ts`: rendered geometry and responsive browser checks.
- Modify `src/app/page.tsx`: render `MoldableHome`.
- Modify `src/app/page.test.tsx`: update the route-level smoke test to the new composition.
- Modify `src/styles.css`: remove the temporary `.home-stage` and `.home-screen` prototype rules.

### Task 1: Square HomeView composition

**Files:**
- Create: `src/home/MoldableHome.tsx`
- Create: `src/home/moldable-home.css`
- Create: `src/home/MoldableHome.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `export function MoldableHome(): JSX.Element`
- Consumes later: `<ToolRail />` from Task 2, inserted into the existing toolbar slot.

- [ ] **Step 1: Write the failing composition tests**

In `src/home/MoldableHome.test.tsx`, add `renders a square HomeView display with the cloud mascot` asserting:

```tsx
const view = render(<MoldableHome />)
expect(screen.getByRole('main', { name: 'Moldable HomeView' })).toHaveClass('moldable-environment')
expect(view.container.querySelector('.moldable-display')).toBeInTheDocument()
expect(screen.getByRole('img', { name: 'Moldable companion' })).toHaveAttribute('src', '/assets/grandma-character.png')
```

Update `src/app/page.test.tsx` to assert that `Home` renders the labeled Moldable HomeView main region and no links.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --run src/home/MoldableHome.test.tsx src/app/page.test.tsx`

Expected: FAIL because `MoldableHome` and the new composition do not exist.

- [ ] **Step 3: Implement the static composition**

Create `MoldableHome()` with:

- `<main className="moldable-environment" aria-label="Moldable HomeView">`
- a single `<section className="moldable-display" aria-label="Moldable screen">`
- an empty toolbar slot on the left for Task 2
- `<img className="moldable-mascot" src="/assets/grandma-character.png" alt="Moldable companion" />` on the right
- an import of `./moldable-home.css`

In `moldable-home.css`, set the environment to warm light gray and center a square display sized from the smaller viewport axis, with a pure-white surface, rounded corners, and restrained ambient shadow. Remove the old prototype selectors from `src/styles.css` and render `<MoldableHome />` from `src/app/page.tsx`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- --run src/home/MoldableHome.test.tsx src/app/page.test.tsx`

Expected: 2 files pass with no warnings.

- [ ] **Step 5: Commit the composition**

```bash
git add src/home/MoldableHome.tsx src/home/moldable-home.css src/home/MoldableHome.test.tsx src/app/page.tsx src/app/page.test.tsx src/styles.css
git commit -m "feat: add square Moldable HomeView surface"
```

### Task 2: Accessible orbital tool rail

**Files:**
- Create: `src/home/ToolRail.tsx`
- Create: `src/home/ToolRail.test.tsx`
- Modify: `src/home/MoldableHome.tsx`
- Modify: `src/home/moldable-home.css`
- Modify: `src/home/MoldableHome.test.tsx`

**Interfaces:**
- Produces: `export type ToolId = 'microwave' | 'blend' | 'timer' | 'weigh' | 'temperature'`
- Produces: `export function ToolRail(): JSX.Element`
- Internal data shape: `type ToolDefinition = { id: ToolId; label: string; Icon: Icon }`, where `Icon` is the compatible Phosphor icon component type.
- Consumes: `MoldableHome` toolbar slot from Task 1.

- [ ] **Step 1: Write failing semantic and idle-state tests**

In `src/home/ToolRail.test.tsx`, add `exposes all five cooking tools from a collapsed rail` asserting a toolbar named `Cooking tools`, buttons named Microwave, Blend, Timer, Weigh, and Temperature, `aria-expanded="false"` on the gradient trigger, and no selected tool.

Add an integration assertion to `MoldableHome.test.tsx` that the `Cooking tools` toolbar and mascot both render inside the display.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --run src/home/ToolRail.test.tsx src/home/MoldableHome.test.tsx`

Expected: FAIL because `ToolRail` is missing.

- [ ] **Step 3: Implement the typed rail and icons**

Create `ToolRail` as a client component using `useState<ToolId | null>` for the selected tool and boolean open state. Use installed Phosphor icons: `Oven` for Microwave, `Fan` for Blend, `Timer`, `Scales` for Weigh, and `Thermometer` for Temperature.

Render a persistent button named `Open cooking tools` as the gradient trigger, followed by a `role="toolbar"` container labeled `Cooking tools`. Tool buttons always remain in the accessibility tree; CSS controls their visual opacity and pointer availability while collapsed.

- [ ] **Step 4: Run the semantic tests and verify GREEN**

Run: `npm test -- --run src/home/ToolRail.test.tsx src/home/MoldableHome.test.tsx`

Expected: semantic and integration tests pass.

- [ ] **Step 5: Write failing pointer, focus, and selection tests**

Add tests that assert:

- pointer entering the rail changes the trigger to `aria-expanded="true"` and leaving collapses it;
- focusing the Timer button opens the rail and gives Timer the expanded class;
- clicking Weigh sets `aria-pressed="true"`, keeps the rail open, and leaves every other tool unpressed;
- pressing Escape collapses the rail and returns focus to `Open cooking tools`;
- blur to another element outside the rail collapses it.

- [ ] **Step 6: Run interaction tests and verify RED**

Run: `npm test -- --run src/home/ToolRail.test.tsx`

Expected: FAIL on unimplemented open, active, selection, Escape, and focus-leave behavior.

- [ ] **Step 7: Implement rail interaction state**

Add pointer enter/leave handlers to a shared rail hit area so there is no collapse gap between trigger and tools. Track the focused/hovered `ToolId` separately from the selected tool. Implement Escape on the rail, focus-within collapse on blur, trigger click toggling for coarse pointers, and tool click selection without navigation.

Use CSS custom properties or `data-position` values for the five fixed orbital offsets. The center tool is largest and most opaque; outer tools shift inward, scale down, and fade behind top/bottom masks. Expand only the hovered, focused, or selected tool into a rounded labeled chip.

- [ ] **Step 8: Run interaction tests and verify GREEN**

Run: `npm test -- --run src/home/ToolRail.test.tsx`

Expected: all ToolRail tests pass with no React state warnings.

- [ ] **Step 9: Commit the interactive rail**

```bash
git add src/home/ToolRail.tsx src/home/ToolRail.test.tsx src/home/MoldableHome.tsx src/home/MoldableHome.test.tsx src/home/moldable-home.css
git commit -m "feat: add orbital cooking tool rail"
```

### Task 3: Responsive geometry and motion safeguards

**Files:**
- Create: `tests/homeview-toolbar.spec.ts`
- Modify: `src/home/moldable-home.css`

**Interfaces:**
- Consumes: the stable `.moldable-display`, `.tool-rail`, `.tool-chip`, and `.moldable-mascot` selectors from Tasks 1 and 2.
- Produces: responsive and reduced-motion guarantees; no new public TypeScript API.

- [ ] **Step 1: Write failing browser geometry tests**

In `tests/homeview-toolbar.spec.ts`, assert at 1440×900 and 760×900 viewports that:

- `.moldable-display` width and height differ by at most 1 CSS pixel;
- visible light-gray environment remains around every display edge;
- the mascot bounding box does not intersect the `.tool-rail` bounding box;
- hovering `Open cooking tools` reveals all five tool buttons;
- hovering Timer makes its chip wider than an inactive tool chip and displays its label.

- [ ] **Step 2: Run the browser test and verify RED**

Run: `npm run test:browser -- tests/homeview-toolbar.spec.ts`

Expected: FAIL on one or more geometry, rail visibility, or expansion assertions before final responsive styles.

- [ ] **Step 3: Finish responsive, coarse-pointer, and reduced-motion CSS**

Use container-relative sizing so the mascot and toolbar scale with the square display. Add a narrow/short viewport rule that reduces both without overlap. Add `(hover: none), (pointer: coarse)` rules that keep the trigger tappable and rely on the component's toggled open state. Add `prefers-reduced-motion: reduce` rules that remove transitions and transforms while preserving open/closed visibility.

- [ ] **Step 4: Pin reduced motion in the browser test**

Add a Playwright test using `page.emulateMedia({ reducedMotion: 'reduce' })`. Open the rail, then assert the computed `transition-duration` of `.tool-chip` and the rail items is `0s` while all five buttons remain visible.

- [ ] **Step 5: Run focused browser and component tests and verify GREEN**

Run: `npm test -- --run src/home/ToolRail.test.tsx && npm run test:browser -- tests/homeview-toolbar.spec.ts`

Expected: all focused tests pass at both viewport sizes and reduced motion produces no animated transition.

- [ ] **Step 6: Commit responsive safeguards**

```bash
git add tests/homeview-toolbar.spec.ts src/home/moldable-home.css
git commit -m "test: verify HomeView toolbar responsiveness"
```

### Task 4: Full verification and visual reference check

**Files:**
- Modify only files required to correct issues revealed by verification.

**Interfaces:**
- Consumes: completed HomeView surface and tool rail.
- Produces: verified feature matching the approved spec and reference lock.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test -- --run`

Expected: all test files and tests pass with zero failures.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck && npm run build`

Expected: TypeScript exits 0 and the Next.js production build completes successfully.

- [ ] **Step 3: Run the HomeView browser suite**

Run: `npm run test:browser -- tests/homeview-toolbar.spec.ts`

Expected: desktop and narrow viewport tests pass.

- [ ] **Step 4: Capture and inspect the final interface**

Capture desktop idle, desktop open rail with Timer expanded, and narrow open-rail screenshots. Compare them to the reference lock: square white display, warm light-gray surround, left gradient, curved/fading icon rail, one expanded chip, and cloud mascot on the right. Correct any visible drift and rerun Steps 1–3 after changes.

- [ ] **Step 5: Review the final diff for scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only HomeView feature files and previously known user-owned changes appear.

- [ ] **Step 6: Commit final visual corrections if needed**

```bash
git add src/home src/app/page.tsx src/app/page.test.tsx src/styles.css tests/homeview-toolbar.spec.ts
git commit -m "fix: align HomeView toolbar with design reference"
```
