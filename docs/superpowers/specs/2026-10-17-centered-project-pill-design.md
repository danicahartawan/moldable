# Centered Project Pill Design

## Goal

Create a minimal web page that reproduces only the centered floating project-selector pill shown in the supplied DMCG reference. The rest of the viewport remains empty and white.

## Scope

- A single white, rounded pill centered horizontally near the top of the viewport.
- A short row of small, varied project thumbnail marks inside the pill.
- Thin vertical separators at the beginning and end of the thumbnail row, matching the reference's restrained treatment.
- Subtle elevation and a soft border so the white pill remains visible against the white page.
- Responsive sizing that preserves the pill's proportions on narrower screens without adding navigation or page content.

## Explicitly Excluded

- About, Contact, Projects, or Catalog links.
- Sound controls.
- Close or back controls.
- Hero imagery, case-study content, footer content, or additional sections.
- Menus, dialogs, routing, or application state.

## Visual Direction

The supplied screenshot and live DMCG page are the locked visual reference. Preserve the airy white canvas, compact horizontal proportions, generous internal spacing, small mixed-media marks, rounded corners, and nearly invisible shadow. The result should feel like one floating control, not a conventional navigation bar.

## Implementation

Use a minimal Vite and React application with one focused component and a small stylesheet. Recreate the tiny project marks as lightweight local SVG/CSS artwork so the page has no runtime dependency on the reference website and no remote asset loading.

## Responsive Behavior

Keep the pill centered with a safe maximum width. On small viewports, reduce gaps and thumbnail sizes slightly while retaining all marks. The pill must never introduce horizontal page scrolling.

## Accessibility

Treat the pill as a labeled project chooser. Individual marks will be buttons with concise accessible labels and visible keyboard focus, even though no destination behavior is required for this static recreation.

## Verification

- Confirm the page renders with only the pill on a white background.
- Check desktop and narrow mobile widths.
- Verify no horizontal overflow.
- Verify keyboard focus reaches each project mark.
- Compare a rendered screenshot against the supplied visual reference and correct visible drift.
