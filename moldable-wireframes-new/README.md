# Moldable board wireframes

Five boards from the Moldable wireframe canvas (version 23).

| File | Board |
|---|---|
| boards/Main.dc.html | 01 The recipe on the board (soto ayam) |
| boards/Step.dc.html | 02 Guided cut |
| boards/Weigh.dc.html | 03 Weigh on the board |
| boards/Record.dc.html | 04 Record grandma |
| boards/Anatomy.dc.html | 05 Anatomy and open questions |

`canvas.json` holds the board positions, titles and sticky notes. The Moldable logo is in `assets/`.

## Fonts are not included

The boards are set in ABC Arizona Sans and ABC Arizona Flare. The copies used on the canvas are Dinamo **trial** files, and the trial licence does not allow them to be redistributed, so they are not in this zip. The boards fall back to system-ui and Georgia. Once you have a licence, add your own `@font-face` rules at the top of each board's `<style>` block.

## How to open them

These are Claude Design canvas files. Each board is an HTML template (`{{holes}}`, `sc-for`, `sc-if`) with a small `DCLogic` component script at the bottom. The canvas runtime (`support.js`) renders them and is not part of this export, so opening a file directly in a browser shows the raw template. Treat the files as source: the markup, the inline styles, the motion CSS (keyframes in each `<style>` block) and the state logic port directly to React. For pictures of the boards, download a PDF or image from the canvas.
