# Currents Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a faithful orange-accented replica of the Currents case study at `/currents`, using the user's recording for all video demonstrations.

**Architecture:** A server-rendered App Router page owns the long-form narrative and static media, while one small client component owns the five-slide carousel. Route-local CSS isolates the replica from the existing Moldable UI, and all media is served locally from `public/assets/currents`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-20-currents-replica-design.md`

## Global Constraints

- Preserve the existing homepage and every current route.
- Keep the reference wording and section order.
- Change the opening palette from blue/indigo to orange/cream.
- Replace every reference video demonstration with the supplied 25.6-second 1280×708 H.264 recording.
- Keep all runtime media local and respect reduced-motion preferences.

## Review Focus

- A missing image must retain its reserved aspect ratio without collapsing the narrative layout.
- At 375px width, copy, metadata, media, and controls must not overflow horizontally.
- Carousel boundaries must disable Prev at slide 1 and Next at slide 5.
- Keyboard users must be able to reach and operate every link, video control, and carousel button.
- Reduced-motion users must see static particles and no forced media autoplay.

---

### Task 1: Local Media Bundle

**Files:**
- Create: `public/assets/currents/*`

**Interfaces:**
- Consumes: public still-image URLs observed on the reference page; `/Users/danicahartawan/Downloads/Screen Recording 2026-10-20 at 00.20.08.MP4`
- Produces: stable `/assets/currents/<name>` URLs and a poster frame used by Tasks 2–3

- [ ] Download the reference still images into `public/assets/currents` with descriptive filenames and copy the supplied recording as `currents-demo.mp4`.
- [ ] Generate `currents-demo-poster.jpg` from the recording without changing the source file.
- [ ] Verify all assets with `file public/assets/currents/*` and confirm the video with `ffprobe`.
- [ ] Commit the local media bundle.

### Task 2: Case Study Structure and Styling

**Files:**
- Create: `src/app/currents/page.tsx`
- Create: `src/app/currents/currents.module.css`
- Create: `src/app/currents/page.test.tsx`

**Interfaces:**
- Consumes: Task 1 asset URLs; `CurrentsCarousel` from Task 3
- Produces: the `/currents` route and stable semantic section anchors

- [ ] Write failing tests named `renders_currents_narrative_in_reference_order`, `uses_orange_opening_treatment`, `renders_local_video_in_each_motion_slot`, and `keeps_home_link_local`; assert exact major headings, local video URL count, and `/` Home destination.
- [ ] Run `npm test -- src/app/currents/page.test.tsx` and verify failure because the route does not exist.
- [ ] Implement the server page with the reference copy, metadata, still media, supplied video, next-project block, and footer in the original order.
- [ ] Implement route-local responsive CSS matching the measured type hierarchy, 668px reading measure, full-bleed media rhythm, orange hero, and mobile stacking.
- [ ] Run the focused test and verify all assertions pass.
- [ ] Commit the static case-study page.

### Task 3: Carousel Interaction

**Files:**
- Create: `src/app/currents/CurrentsCarousel.tsx`
- Create: `src/app/currents/CurrentsCarousel.test.tsx`
- Modify: `src/app/currents/page.tsx`
- Modify: `src/app/currents/currents.module.css`

**Interfaces:**
- Consumes: `slides: readonly { src: string; alt: string; caption: string }[]`
- Produces: `CurrentsCarousel({ slides }: { slides: readonly CurrentsSlide[] }): JSX.Element`

- [ ] Write failing tests for initial `1 of 5`, disabled Prev, advancing to slide 2, returning to slide 1, and disabled Next at slide 5.
- [ ] Run the focused carousel test and verify failure because the client component does not exist.
- [ ] Implement the minimal client carousel with semantic buttons, live counter text, responsive image, and visible focus styling.
- [ ] Run both Currents test files and verify they pass.
- [ ] Commit the interaction.

### Task 4: End-to-End Visual Verification

**Files:**
- Create: `tests/currents.spec.ts`
- Create: `output/playwright/currents-desktop.png`
- Create: `output/playwright/currents-mobile.png`
- Modify: route files only when comparison reveals drift

**Interfaces:**
- Consumes: completed `/currents` route
- Produces: browser-level proof for responsive layout, carousel behavior, and console cleanliness

- [ ] Write a Playwright test that opens `/currents`, checks the orange hero and key section order, operates the carousel by keyboard, asserts no horizontal overflow at 375px, and records console errors.
- [ ] Run `npm run typecheck`, both focused Vitest files, and `npm run build`; require zero failures.
- [ ] Start the local Next.js server and capture desktop and mobile full-page screenshots.
- [ ] Compare screenshots against the reference and fix measurable drift in content width, typography, media aspect ratios, spacing, orange hero, dark ending, and footer.
- [ ] Re-run the browser test and focused checks; require all to pass with no console errors.
- [ ] Commit verification fixes and screenshots.
