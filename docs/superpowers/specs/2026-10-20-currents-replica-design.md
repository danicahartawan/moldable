# Currents Case Study Replica Design

## Goal

Recreate the public `https://adityad.as/currents` case-study page as faithfully as possible inside the existing Moldable Next.js application. The replica will live at `/currents`; the current homepage and all existing routes must remain unchanged.

Success means the local page matches the reference's content, composition, typography, spacing, imagery, responsive behavior, and visible interactions closely at representative desktop and mobile sizes, with the user-requested orange opening and replacement video.

## Reference Lock

The user-provided Currents page is the definitive visual and content reference.

- Preserve the full-height opening gradient composition but replace its blue/indigo palette with a warm orange-to-cream palette. Keep the floating Home control within the same orange color family. Preserve the restrained editorial typography, white case-study canvas, narrow reading column, full-bleed media rhythm, small metadata labels, and dark next-project/footer ending.
- Preserve the alternating hierarchy of section eyebrow, sans-serif headline, serif body copy, media, and caption.
- Preserve the original wording and section order.
- Use the reference still imagery where it can be captured as public assets. Replace the reference's video demonstrations with the user-supplied 25.6-second, 1280×708 H.264 screen recording (`Screen Recording 2026-10-20 at 00.20.08.MP4`). Use a generated poster frame from that recording as its loading and no-autoplay fallback.
- Keep color role discipline: orange belongs to the opening scene and small interactive accents; body content stays white, black, and muted gray; the next-project area supplies the dark closing contrast.
- Reject generic portfolio cards, rounded SaaS panels, extra calls to action, decorative gradients outside the opening scene, and changes to the supplied narrative.

## Architecture

Add a self-contained App Router route under `src/app/currents`. The server-rendered page owns the static case-study structure and metadata. A small client component owns only the interactive carousel and any motion controls. Route styling uses a colocated CSS Module or route-specific stylesheet so the replica does not leak styles into the existing Moldable experience.

Public media and any legally reusable font substitutes live under `public/assets/currents`. Images use intrinsic dimensions to preserve their original aspect ratios and prevent layout shift. The page must not depend on the reference site at runtime after assets are collected.

## Page Structure

1. Full-viewport orange-to-cream gradient opening with a floating Home link and sparse animated light points.
2. Introductory statement, supporting paragraph, hero image, caption, and three-column project metadata.
3. Overview narrative.
4. Feed section with feature copy and media demonstrations.
5. Posting section with post-composer and image-editor demonstrations.
6. Micro-interactions section.
7. Profile section.
8. System section covering light/dark modes and the design library.
9. Gradients section with explanatory diagrams and an interactive five-image carousel.
10. Wrapping Up narrative and update note.
11. Dark next-project block for Volta.
12. Portfolio footer with project and information links.

## Responsive Behavior

Desktop uses the reference's centered editorial column with selected media expanding beyond the text measure. Metadata appears in three columns. Mobile collapses to a single readable column, keeps media edge-to-edge where the reference does, stacks metadata, reduces headline sizes, and maintains generous section rhythm. Controls must remain reachable by keyboard and touch.

## Interactions

- The Home link returns to `/`.
- Carousel Prev and Next controls update the image, caption, and position counter; controls disable at the first and last slides to match the reference.
- External and footer links retain the destinations shown by the reference.
- The supplied screen recording is presented with native, accessible video controls in every slot that used reference video media. It remains muted and does not autoplay with sound.
- Motion respects `prefers-reduced-motion`; decorative motion pauses or becomes static for those users.

## Accessibility

Use semantic landmarks, headings in narrative order, descriptive image alt text, visible focus states, buttons for carousel actions, and sufficient contrast. Decorative particles and presentation-only images are hidden from assistive technology. Video-like demonstrations include accessible labels and a still fallback.

## Verification

- Add focused component tests for rendering, route content, carousel navigation, and disabled boundary states.
- Run the existing test suite and TypeScript check.
- Run a production build.
- Compare local screenshots against the reference at mobile and desktop viewports, checking hero height, type hierarchy, content width, media proportions, section spacing, carousel state, next-project block, and footer.
- Check browser console output and keyboard navigation on `/currents`.

## Scope Boundaries

The work recreates only the Currents case-study page. It does not reproduce the reference site's other project pages, CMS, analytics, backend, or deployment configuration. The existing homepage and Moldable product routes are preserved.
