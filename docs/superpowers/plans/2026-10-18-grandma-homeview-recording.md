# Grandma HomeView Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the existing Grandma voice-recording experience to the square Moldable HomeView with a Record-first idle state, curved guiding-question rail, rolling live transcript, and cloud mascot.

**Architecture:** Preserve `useVoiceRecorder`, audio transcription, title generation, and the current completed-recording destination. Extract the square environment/display wrapper from the preceding Moldable toolbar work into a shared `HomeViewFrame`, then keep presentation-only question and transcript behavior in focused components consumed by `GrandmaPage`.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript, CSS, Vitest fake timers, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-18-grandma-homeview-recording-design.md`

**Dependency:** Complete `docs/superpowers/plans/2026-10-18-moldable-homeview-toolbar.md` first. This plan consumes its HomeView colors, sizing, typography, mascot asset, and feature stylesheet.

## Global Constraints

- Recording begins only after the user activates the Record button; never auto-start.
- Preserve the existing four guiding questions, 30-second first delay, and 12-second rotation interval.
- Preserve the existing recorder, microphone permission, OpenAI audio transcription, title-generation threshold, and completed-recording behavior.
- Use `public/assets/grandma-character.png`; do not introduce the red mascot or new artwork.
- Keep the square 5.73-by-5.73-inch display proportion and warm light-gray environment from Moldable HomeView.
- Final transcript is near-black, interim transcript is muted gray, and errors remain restrained but perceivable.
- Recipe editing and cookbook generation remain out of scope; the existing completed-recording screen stays in place.

## Review Focus

- Permission denial or unsupported recording: the error must occupy the transcript region without exposing questions or changing the square layout.
- Rapid Record/Stop interaction: the Stop state and recorder cleanup must remain correct without duplicated timers.
- Long transcript: text must stay within its masked lower-right region without overlapping the mascot, title, or question rail.
- Screen-reader announcements: animated words must remain one coherent live transcript instead of being announced letter by letter.
- Reduced motion: questions and transcript must update immediately without transforms, blur, or delayed animation.

---

## File structure

- Create `src/home/HomeViewFrame.tsx`: shared square environment and display shell used by Moldable home and Grandma.
- Modify `src/home/MoldableHome.tsx`: consume `HomeViewFrame` after the toolbar plan is implemented.
- Create `src/grandma/GuidingQuestionRail.tsx`: presentation-only curved question sequence.
- Create `src/grandma/GuidingQuestionRail.test.tsx`: ordering, active question, and accessibility tests.
- Create `src/grandma/RollingTranscript.tsx`: coherent live-region rendering for final and interim transcript.
- Create `src/grandma/RollingTranscript.test.tsx`: final, interim, error, and accessibility tests.
- Modify `src/grandma/GrandmaPage.tsx`: compose the HomeView frame with existing recorder and title state.
- Modify `src/grandma/GrandmaPage.test.tsx`: preserve behavior tests while updating layout assertions.
- Modify `src/grandma/grandma.css`: HomeView placement, rail, transcript, mascot, responsive, and reduced-motion styles.
- Modify `src/home/moldable-home.css`: expose shared frame styles without changing the Moldable home result.
- Create `tests/grandma-homeview.spec.ts`: rendered square geometry, overlap, recording state, and responsive visual checks.

### Task 1: Shared HomeView frame

**Files:**
- Create: `src/home/HomeViewFrame.tsx`
- Create: `src/home/HomeViewFrame.test.tsx`
- Modify: `src/home/MoldableHome.tsx`
- Modify: `src/home/MoldableHome.test.tsx`
- Modify: `src/home/moldable-home.css`

**Interfaces:**
- Produces: `export function HomeViewFrame({ children, label, className }: { children: ReactNode; label: string; className?: string }): JSX.Element`
- Consumes: `.moldable-environment` and `.moldable-display` rules delivered by the toolbar plan.
- Used by: `MoldableHome` immediately and `GrandmaPage` in Task 4.

- [ ] **Step 1: Write the failing shared-frame test**

In `HomeViewFrame.test.tsx`, add `renders labeled content inside one square display`:

```tsx
render(<HomeViewFrame label="Test HomeView"><p>Inside</p></HomeViewFrame>)
expect(screen.getByRole('main', { name: 'Test HomeView' })).toHaveClass('moldable-environment')
expect(screen.getByText('Inside')).toHaveClass('test-content')
expect(screen.getByText('Inside').closest('.moldable-display')).toBeInTheDocument()
```

Use a test child with `className="test-content"`; do not add test-only behavior to production.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/home/HomeViewFrame.test.tsx src/home/MoldableHome.test.tsx`

Expected: FAIL because `HomeViewFrame` does not exist.

- [ ] **Step 3: Implement and adopt `HomeViewFrame`**

Create the typed component with one environment `<main>` and one display `<section>`. Merge an optional feature class onto the display, preserve the caller's accessible label on the main region, and render children unchanged. Refactor `MoldableHome` to use it without changing the toolbar or mascot DOM.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run src/home/HomeViewFrame.test.tsx src/home/MoldableHome.test.tsx`

Expected: both files pass; the existing Moldable HomeView assertions remain green.

- [ ] **Step 5: Commit the shared frame**

```bash
git add src/home/HomeViewFrame.tsx src/home/HomeViewFrame.test.tsx src/home/MoldableHome.tsx src/home/MoldableHome.test.tsx src/home/moldable-home.css
git commit -m "refactor: share the HomeView display frame"
```

### Task 2: Guiding-question rail

**Files:**
- Create: `src/grandma/GuidingQuestionRail.tsx`
- Create: `src/grandma/GuidingQuestionRail.test.tsx`
- Modify: `src/grandma/grandma.css`

**Interfaces:**
- Produces: `export const guidingQuestions: readonly string[]`
- Produces: `export function GuidingQuestionRail({ activeIndex }: { activeIndex: number }): JSX.Element`
- Consumes: an index normalized by `GrandmaPage`; owns no timers or recording state.

- [ ] **Step 1: Write failing rail tests**

Add tests asserting:

- index `0` renders all four questions in the fixed approved order;
- only `What color should it be?` is exposed through a polite live region at index `0`;
- the previous and next visible questions have `aria-hidden="true"`;
- index `1` makes `What should it smell like?` active;
- index `4` wraps to the first question rather than failing.

- [ ] **Step 2: Run the rail test and verify RED**

Run: `npm test -- --run src/grandma/GuidingQuestionRail.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the presentation-only rail**

Export the question tuple from `GuidingQuestionRail.tsx`. Normalize `activeIndex` modulo the tuple length. Render one labeled question-rail region with data offsets `-2` through `2`; CSS uses those offsets for the shallow curve, opacity, scale, and top/bottom mask. Only the offset `0` question is available to assistive technology and marked `aria-live="polite"`.

- [ ] **Step 4: Run the rail test and verify GREEN**

Run: `npm test -- --run src/grandma/GuidingQuestionRail.test.tsx`

Expected: all rail ordering, wrapping, and accessibility assertions pass.

- [ ] **Step 5: Commit the question rail**

```bash
git add src/grandma/GuidingQuestionRail.tsx src/grandma/GuidingQuestionRail.test.tsx src/grandma/grandma.css
git commit -m "feat: add Grandma guiding question rail"
```

### Task 3: Coherent rolling transcript

**Files:**
- Create: `src/grandma/RollingTranscript.tsx`
- Create: `src/grandma/RollingTranscript.test.tsx`
- Modify: `src/grandma/grandma.css`

**Interfaces:**
- Produces: `export function RollingTranscript({ finalText, interimText, errorMessage }: { finalText: string; interimText: string; errorMessage: string | null }): JSX.Element | null`
- Consumes: plain transcript strings from `useVoiceRecorder`; owns no network, recorder, or title state.
- Used by: `GrandmaPage` in Task 4.

- [ ] **Step 1: Write failing transcript tests**

Add tests asserting:

- all-empty props return no transcript region;
- final and interim text render inside one region named `Live transcript` with `aria-live="polite"` and `aria-atomic="true"`;
- final text has class `grandma-transcript__final` and interim text has `grandma-transcript__interim`;
- an error replaces transcript text, uses `role="status"`, and displays the exact error message;
- rerendering with appended final text marks only the appended visual segment with `grandma-transcript__new` while the region's accessible label contains the full coherent text.

- [ ] **Step 2: Run the transcript test and verify RED**

Run: `npm test -- --run src/grandma/RollingTranscript.test.tsx`

Expected: FAIL because `RollingTranscript` is missing.

- [ ] **Step 3: Implement the transcript renderer**

Track the previous final-text length in a ref. Split settled and appended final text for visual spans, keep interim text separate, and set a single full-text `aria-label` on the atomic live region while marking animated visual spans `aria-hidden="true"`. Render the error branch before transcript content.

Add the lower-right constrained layout, line mask, appended-word blur/translate animation, interim color, and restrained error color to `grandma.css`.

- [ ] **Step 4: Run the transcript test and verify GREEN**

Run: `npm test -- --run src/grandma/RollingTranscript.test.tsx`

Expected: all transcript content, error, append, and live-region assertions pass.

- [ ] **Step 5: Commit the rolling transcript**

```bash
git add src/grandma/RollingTranscript.tsx src/grandma/RollingTranscript.test.tsx src/grandma/grandma.css
git commit -m "feat: add rolling Grandma transcript"
```

### Task 4: Integrate the Grandma HomeView recording state

**Files:**
- Modify: `src/grandma/GrandmaPage.tsx`
- Modify: `src/grandma/GrandmaPage.test.tsx`
- Modify: `src/grandma/grandma.css`
- Modify: `src/home/moldable-home.css`

**Interfaces:**
- Consumes: `HomeViewFrame`, `GuidingQuestionRail`, `RollingTranscript`, existing `useVoiceRecorder`, `requestGeneratedTitle`, and `shouldGenerateTitle`.
- Produces: the existing `GrandmaPage(): JSX.Element` API; no route signature changes.

- [ ] **Step 1: Update layout tests and verify RED**

Change the idle test to assert:

- main region `Grandma HomeView` and display feature class `grandma-homeview`;
- one Record button with `aria-pressed="false"`;
- the cloud mascot uses `/assets/grandma-character.png` before recording starts;
- no question rail or transcript region is present.

Change the recording tests to assert:

- Stop has `aria-pressed="true"`;
- the mascot stays visible in the display rather than appearing only beside Stop;
- at 29,999 ms there is no question rail, at 30,000 ms the rail appears with the first active question, and after 12,000 ms the second question becomes active;
- recognized final and interim words render through the `Live transcript` region;
- the generated title stays in the upper content area and the completed-recording article still replaces the recorder view after Stop.

Run: `npm test -- --run src/grandma/GrandmaPage.test.tsx`

Expected: FAIL on the new HomeView layout and component expectations while recorder behavior assertions continue to exercise the existing flow.

- [ ] **Step 2: Replace local question data with the shared export**

Remove the private `guidingQuestions` array from `GrandmaPage.tsx` and import the tuple and `GuidingQuestionRail`. Keep the current 30,000 ms timeout and 12,000 ms interval unchanged.

- [ ] **Step 3: Compose the HomeView state**

Wrap the recording view in `<HomeViewFrame label="Grandma HomeView" className="grandma-homeview">`. Render the mascot persistently on the right, keep Record/Stop and title in the upper-right content area, render `GuidingQuestionRail` only when its current index is non-null, and render `RollingTranscript` from the recorder's final, interim, and error values.

Keep the existing early return to `GrandmaWritingScreen` when `hasCompletedRecording` is true.

- [ ] **Step 4: Complete layout and state styling**

Update `grandma.css` so the question rail owns the left zone, the persistent mascot and control occupy the right zone, the title stays above the transcript, and the transcript remains in the lower-right without overlap. Delete obsolete canvas/header/transcript selectors only after no JSX or tests reference them.

- [ ] **Step 5: Run the Grandma component suite and verify GREEN**

Run: `npm test -- --run src/grandma/GuidingQuestionRail.test.tsx src/grandma/RollingTranscript.test.tsx src/grandma/GrandmaPage.test.tsx`

Expected: all legacy recorder/title/completion behaviors and all new HomeView layout behaviors pass.

- [ ] **Step 6: Commit the integrated screen**

```bash
git add src/grandma/GrandmaPage.tsx src/grandma/GrandmaPage.test.tsx src/grandma/grandma.css src/home/moldable-home.css
git commit -m "feat: adapt Grandma recording to HomeView"
```

### Task 5: Responsive, overlap, and reduced-motion verification

**Files:**
- Create: `tests/grandma-homeview.spec.ts`
- Modify: `src/grandma/grandma.css`

**Interfaces:**
- Consumes: stable `.moldable-display`, `.grandma-homeview`, `.grandma-question-rail`, `.grandma-transcript`, and `.grandma-character` selectors.
- Produces: responsive and motion guarantees; no new TypeScript API.

- [ ] **Step 1: Write failing Playwright checks**

At 1440×900 and 760×900 viewports, navigate to `/grandma` and assert:

- display width and height differ by at most 1 CSS pixel;
- warm light-gray environment is visible around every display edge;
- the idle cloud mascot and Record button fit inside the display without intersection;
- after clicking Record and advancing Playwright's installed clock by exactly 30,000 ms, the question rail fits inside the left third;
- after emitting `Grandma toasted the spices slowly. Then she added the broth and waited beside the stove. The whole kitchen smelled warm and peppery.` as a final recognition result, transcript, mascot, title zone, and rail bounding boxes do not intersect.

Before navigation, use `page.addInitScript` to install minimal fake `MediaRecorder`, `webkitSpeechRecognition`, and `navigator.mediaDevices.getUserMedia` implementations. Store the fake recognition instance on `window.__grandmaRecognition` so the test can invoke its `onresult`. Intercept `/api/grandma/title` and return `{ "title": "Sunday Soto Stories" }`. Use `page.clock.install()` and `page.clock.fastForward(30_000)` for the question delay.

- [ ] **Step 2: Run the browser test and verify RED**

Run: `npm run test:browser -- tests/grandma-homeview.spec.ts`

Expected: FAIL on final geometry, long-transcript, or narrow-viewport assertions before responsive tuning.

- [ ] **Step 3: Add responsive and reduced-motion rules**

Use display-relative sizing for the mascot, question rail, controls, and transcript. Add narrow/short viewport rules that reduce mascot size and transcript line count while preserving the upper-right control. Under `prefers-reduced-motion: reduce`, remove question transforms/transitions and transcript blur/translate animation while keeping immediate state visibility.

- [ ] **Step 4: Verify reduced motion in Playwright**

Use `page.emulateMedia({ reducedMotion: 'reduce' })`, begin recording, expose a question and transcript, and assert computed animation and transition durations are `0s` while both remain visible and readable.

- [ ] **Step 5: Run focused browser and unit tests and verify GREEN**

Run: `npm test -- --run src/grandma && npm run test:browser -- tests/grandma-homeview.spec.ts`

Expected: all Grandma unit tests and browser checks pass.

- [ ] **Step 6: Commit responsive safeguards**

```bash
git add tests/grandma-homeview.spec.ts src/grandma/grandma.css
git commit -m "test: verify Grandma HomeView responsiveness"
```

### Task 6: Full verification and visual reference check

**Files:**
- Modify only files required to correct issues revealed by verification.

**Interfaces:**
- Consumes: completed toolbar plan and completed Grandma HomeView recording plan.
- Produces: verified connected HomeView and Grandma states.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test -- --run`

Expected: every test file and test passes with zero failures.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck && npm run build`

Expected: TypeScript exits 0 and the production Next.js build completes successfully.

- [ ] **Step 3: Run both HomeView browser suites**

Run: `npm run test:browser -- tests/homeview-toolbar.spec.ts tests/grandma-homeview.spec.ts`

Expected: both desktop and narrow HomeView flows pass.

- [ ] **Step 4: Capture and inspect reference states**

Capture Grandma idle, recording with first question, recording with a long transcript/title, and narrow recording screenshots. Compare them to the approved reference lock: square white display, warm light-gray surround, left curved question rail, right cloud mascot, upper Record/Stop control, and lower-right rolling transcript.

- [ ] **Step 5: Review final scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no recipe-editing or cookbook UI has entered the diff; unrelated user-owned files remain untouched.

- [ ] **Step 6: Commit final corrections if needed**

```bash
git add src/home src/grandma tests/homeview-toolbar.spec.ts tests/grandma-homeview.spec.ts
git commit -m "fix: align Grandma HomeView with design reference"
```
