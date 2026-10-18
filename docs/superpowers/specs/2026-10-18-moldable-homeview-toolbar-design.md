# Moldable HomeView Toolbar Design

## Purpose

Create the first interactive surface for Moldable on the Apple HomeView display. This slice establishes the physical screen presentation, the Moldable visual language, and a left-side cooking-tool ecosystem without building the tools themselves.

## Reference lock

- Primary product reference: the user's HomeView sketch—square white working surface, controls gathered on the left, mascot on the right.
- Interaction reference: the user's rounded topic-chip example—icon-first controls that expand into labeled pills.
- Existing product reference: `/grandma`—Archivo typography, quiet black text, restrained shadows, gentle motion, and the existing white cloud mascot.
- Preserve: airy white canvas, minimal controls, soft depth, rounded tool chips, and playful but calm motion.
- Reject: dark framing, permanent navigation chrome, bright multicolor gradients, dense dashboards, and the red mascot.

## Display composition

The browser viewport represents the environment around the device. Its background is a warm light gray so the HomeView display remains distinct without the severity of black.

The HomeView display is a centered square derived from the stated 5.73-by-5.73-inch proportions. It scales responsively to fit the available viewport while retaining visible gray space on every side. The display is white with softly rounded corners and a restrained ambient shadow.

The Moldable experience lives entirely inside this square. Empty space is intentional.

## Idle state

A soft, low-contrast gradient glow runs along the inside-left edge of the white display. It is the only persistent toolbar affordance and should feel like light entering the screen rather than a conventional navigation bar.

The existing cloud mascot from `public/assets/grandma-character.png` sits on the right side of the display. It is decorative in this slice and uses the same quiet drop-shadow treatment as `/grandma`.

No tool labels are visible while idle.

## Tool ecosystem interaction

Hovering or keyboard-focusing the left glow reveals an orbital vertical rail. Five cooking tools appear along a shallow curve:

1. Microwave
2. Blend
3. Timer
4. Weigh
5. Temperature

Each tool begins as a circular icon control. Hovering or focusing an individual control expands it horizontally into a softly tinted pill containing its icon and label. Only the active tool expands; neighboring tools remain compact.

The rail suggests a larger circular system: items near the vertical center are largest and most opaque, while items toward the top and bottom shift inward, shrink slightly, and fade. The rail is clipped and masked at both ends so tools appear to roll into and out of the display edge.

Leaving the rail collapses it back into the gradient. No tool opens an application in this slice; clicking a tool may retain its active visual state but must not navigate.

## Visual system

- Typeface: Archivo, using the existing local variable font setup.
- Surround: warm light gray.
- Display: pure white.
- Text and icons: near-black.
- Tool surfaces: cool translucent whites and very pale gray-blue fills inspired by the chip reference.
- Accent: one restrained cool-blue active state; it is used only for the active tool.
- Shape: circular icons expanding into fully rounded pills.
- Depth: subtle ambient shadow on the display and light local shadows on active controls.
- Motion: short, spring-like expansion and orbital repositioning; no bounce or exaggerated scaling.

## Components

### `MoldableHome`

Owns the square display composition and places the toolbar and mascot.

### `ToolRail`

A client component that owns open, hovered, focused, and selected tool state. It renders the semantic toolbar and coordinates the orbital layout.

### `ToolChip`

Renders one accessible button with a cooking-tool icon and label. Its compact and expanded states are controlled by the rail.

Tool metadata remains a small local array because this slice has no external data source or persistence requirement.

## Accessibility

- The rail uses a labeled toolbar region and every tool is a real button.
- Keyboard focus opens the rail and expands the focused tool exactly as hover does.
- Focus indicators remain visible against both white and tinted chip surfaces.
- Labels are available to assistive technology even when visually collapsed.
- Reduced-motion users receive the final open/closed states without orbital animation.
- The mascot has concise alternative text if it communicates presence; otherwise it is decorative.

## Responsive behavior

The display remains square at every viewport size. Its maximum dimension is constrained by the smaller available viewport axis, leaving a consistent proportional gray surround.

On pointer-coarse or narrow devices, the left glow becomes a tap target. Tapping toggles the rail, and tapping a tool selects and expands it. The mascot scales down without overlapping the toolbar.

## Testing and validation

- Component tests verify the five tools, accessible names, idle state, hover/focus expansion, selection, and collapse behavior.
- Tests verify the mascot asset and square display structure.
- Type-checking and the full existing test suite must pass.
- The production build must succeed.
- Desktop and narrow-viewport screenshots must be compared against the reference lock, confirming the square display, light-gray surround, left glow, curved fading rail, expanding pill, and right-side cloud mascot.

## Out of scope

- Functional microwave, blender, timer, scale, or temperature applications.
- Tool reordering, scrolling, persistence, drag-and-drop, and voice control.
- Additional HomeView screens or navigation.
- New mascot artwork.
