# Centered Project Pill Design

## Goal

Create a minimal web page that reproduces only the centered floating project-selector pill shown in the supplied DMCG reference. The rest of the viewport remains empty and white.

## Scope

- A single white, rounded pill centered horizontally near the top of the viewport.
- A horizontally scrollable row of the ten supplied food illustrations inside the pill.
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

Use a minimal Vite and React application with one focused component and a small stylesheet. Extract the ten supplied food drawings into local transparent PNG assets so the page has no remote asset loading.

## Responsive Behavior

Keep the pill centered with a safe maximum width. On small viewports, reduce gaps and thumbnail sizes slightly and allow the internal illustration rail to scroll. The page itself must never scroll horizontally.

## Accessibility

Treat the pill as a labeled project chooser. Individual marks will be buttons with concise accessible labels and visible keyboard focus, even though no destination behavior is required for this static recreation.

## Verification

- Confirm the page renders with only the pill on a white background.
- Check desktop and narrow mobile widths.
- Verify no horizontal overflow.
- Verify keyboard focus reaches each project mark.
- Compare a rendered screenshot against the supplied visual reference and correct visible drift.
