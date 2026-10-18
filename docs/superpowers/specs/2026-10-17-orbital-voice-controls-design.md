# Orbital Voice Controls Design

## Goal

Turn the existing static project chooser into a right-aligned, borderless control surface with a slow orbital carousel and a functional voice-recording interaction. Recording must capture microphone audio locally, show live browser-native transcription, and present only the most recent five visual lines beneath the controls.

## Scope

- Keep the existing eight project artworks and the camera, chat, and Record controls.
- Position the complete control area at the upper-right of the viewport.
- Place the orbital project rail immediately left of the fixed action controls on wider viewports.
- Remove enclosing borders and glass capsules. Controls sit directly on the canvas. The Record control retains a soft white pill surface without a visible stroke.
- Make the camera, chat, and Record-face utility glyphs solid black. Project artwork retains its identifying colors.
- Add local microphone capture with `MediaRecorder` and live transcription with Chromium's `SpeechRecognition` or `webkitSpeechRecognition` implementation.
- Show the live transcript beneath the right-aligned controls as borderless gray text using `clamp(220px, 25vw, 360px)`.

## Explicitly Excluded

- Uploading audio or transcript data.
- Persisting recordings across reloads.
- Download, playback, editing, or transcript-export controls.
- Server-side transcription or API credentials.
- Camera and chat action behavior beyond their existing buttons.
- Automatic microphone access before the user presses Record.

## Layout and Visual Direction

The controls form a right-aligned vertical stack. The first row contains the project rail and action controls. The transcript sits directly below the action controls and aligns to their right edge. At `560px` and below, the rail and actions stack while remaining right-aligned and within the viewport.

The action group has no enclosing surface, border, or shadow. Camera and chat use the existing Phosphor family with a stronger, fully black weight. The Record button adapts the Shopify Sidekick reference: a soft white rounded surface, black face glyph, black label, restrained neutral elevation, and no visible outline.

The transcript is plain gray text with no card, background, or border. Its width is `clamp(220px, 25vw, 360px)`. Text is right-aligned. The container shows at most five line-heights; older text fades through a top gradient while the latest text remains fully legible.

## Orbital Carousel

The rail continues to expose four full project choices at a time. It supports touch, trackpad, keyboard focus, and desktop wheel input.

Wheel input is multiplied by `0.3` before being applied horizontally. Motion uses a short ease-out response rather than an inertial autoplay loop.

Each visible item derives its presentation from its horizontal distance to the rail center:

- Near center: full opacity, largest scale, neutral rotation, and slightly raised.
- Moving toward either edge: progressively smaller, lower, less opaque, and rotated around the Y axis toward the center.
- Outside the visible window: clipped by the rail.

The rail uses a perspective context and translucent left/right masks so items appear to turn around a cylindrical path rather than stop at hard edges. `prefers-reduced-motion` removes interpolation and 3D rotation while preserving scrolling and edge fades.

## Recording Architecture

Extract recording behavior into a focused `useVoiceRecorder` hook so media lifecycle logic does not live inside the visual component.

The hook exposes:

- `status`: `idle`, `requesting`, `recording`, `stopping`, `unsupported`, or `error`.
- `transcript`: combined final and current interim speech text.
- `errorMessage`: concise user-facing failure text or `null`.
- `start()`: request permission and start both capture systems.
- `stop()`: stop both systems and release all microphone tracks.
- `toggle()`: choose `start` or `stop` from the current state.

The hook owns `MediaRecorder`, the active `MediaStream`, speech recognition, and collected audio chunks through refs. The completed audio `Blob` remains in memory for the current component lifetime and is released when replaced or when the component unmounts. It is never uploaded or persisted.

## Recording Flow

1. The initial state is `idle`; the button label is `Record`.
2. Pressing Record checks that media capture and speech recognition are supported.
3. Unsupported browsers move to `unsupported` without requesting permission.
4. Supported browsers move to `requesting` and call `navigator.mediaDevices.getUserMedia({ audio: true })` from the user gesture.
5. Permission success creates and starts `MediaRecorder`, then starts continuous speech recognition with interim results enabled. State becomes `recording`; the button label becomes `Stop` and exposes `aria-pressed="true"`.
6. Recognition results update final and interim transcript text without clearing previous final text.
7. Pressing Stop moves to `stopping`, stops recognition and the recorder, and stops every stream track.
8. The recorder's final data event creates the in-memory audio `Blob`; state returns to `idle`.
9. Unmounting performs the same resource cleanup without updating unmounted state.

## Error Handling

- Permission denial: release any obtained resources, return to `error`, and show `Microphone access was denied.`
- Unsupported speech recognition or media recording: do not request access; show `Live voice recording is not supported in this browser.`
- Recognition failure: stop recording and tracks, then show a concise gray inline error.
- Recorder startup or runtime failure: stop recognition and tracks, discard incomplete chunks, and show a concise gray inline error.
- An empty transcript is not treated as an error; the area shows `Listening…` while recording.

Errors appear in the transcript position and do not introduce dialogs, cards, or toast UI.

## Transcript Behavior

The transcript region uses `aria-live="polite"` and `aria-atomic="false"`. While permission is pending it shows `Allow microphone access…`; while recording without recognized speech it shows `Listening…`.

Final and interim text are rendered together, with interim text visually lighter. The view stays anchored to the newest content. CSS limits the visible height to five line-heights and applies a top fade so old content disappears gradually rather than being abruptly truncated. The full current-session transcript remains in component state for recognition continuity.

## Accessibility

- Record remains a real button with `aria-label`, visible keyboard focus, and at least a 44 by 44 pixel hit area.
- Recording state is conveyed with the `Stop` label and `aria-pressed`, not color alone.
- Permission, listening, transcription, and error text are available to assistive technology.
- Project items remain keyboard-focusable, and focusing an off-screen item scrolls it into view.
- Reduced-motion users retain all functionality without orbital interpolation.

## Testing

Unit tests provide complete fakes for `getUserMedia`, `MediaRecorder`, and browser speech recognition. They verify:

- Record requests microphone access and starts both capture systems.
- A second activation stops recognition, recorder, and every media track.
- Final and interim recognition results update the transcript.
- Permission denial and unsupported APIs produce the correct inline states.
- Unmount cleanup releases the microphone.

Browser tests verify:

- The row and transcript align to the right and introduce no page overflow.
- Wheel input moves the rail by a reduced distance.
- Center and edge items receive distinct orbital transforms and opacity.
- Both rail edges use translucent fading.
- Utility glyphs are black and the action group has no enclosing border.
- The transcript region is borderless and constrained to five visual lines.

Browser tests must use simulated media and recognition APIs; automated verification must never activate the user's real microphone.

## Constraints and Known Limitations

Browser-native live transcription is primarily supported in Chromium-family browsers and may depend on browser or operating-system speech services. Recording remains local, but speech recognition implementation details are controlled by the browser. The application will report unsupported or failed states clearly rather than silently pretending to transcribe.
