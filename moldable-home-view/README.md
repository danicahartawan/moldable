# Moldable home view (grandkid side)

The 640 × 640 home view for the 5.73 in display, as it stands on the canvas now.

- `Home.dc.html`: the screen (Claude Design canvas file)
- `canvas.json`: board position, title and notes
- `assets/lelawar-photo.png`: the dish photo on the recipe card

## What's on the screen
- Recipe card: title with a round toggle, dish photo, a one-line overview and Steps / Serves / Spice. The toggle switches to an 8-step list that scrolls under a soft blur.
- Top right: rolls between cooking time and tools (with a blur), on tap or by itself every few seconds.
- Bottom right: all 11 ingredients in two columns.
- Bottom left: Adjust opens Modify (Serves 2, Less spicy, Chicken) and Tidy amounts. Changes get an ember underline.
- Voice: on the device it starts when you talk. In the file it plays once 3 seconds after load. Tap the top-left corner to replay.

## Not included
- ABC Arizona fonts: the canvas uses trial files that can't be redistributed. The screen falls back to system fonts until you add licensed `@font-face` rules.
- The canvas runtime (`support.js`), so opening the file in a browser shows the raw template. Treat it as source for building the real screen. For an image of it, download from the canvas.
- Photo rights: the dish photo was supplied as a reference; check you can use it before sharing.
