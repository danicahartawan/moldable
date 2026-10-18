# Grandma HomeView Recording Design

## Purpose

Adapt the existing Grandma recording experience to the square Moldable HomeView display. The screen should make capturing a family recipe feel conversational and nearly effortless while preserving the existing microphone, transcription, title-generation, and completed-recording behavior.

This is the second product state after the Moldable tool ecosystem. Recipe editing and cookbook generation follow later and are outside this slice.

## Reference lock

- Primary layout reference: the user's Grandma HomeView sketch—question controls along the left, conversational mascot on the right, and transcript near the lower edge.
- Motion reference: the user's note calling for a blurred, rolling transcript effect.
- Product reference: the existing `/grandma` experience—Archivo typography, quiet controls, rotating guiding questions, live transcript, title generation, and voice-recorder behavior.
- Hardware reference: the square 5.73-by-5.73-inch HomeView surface established by the Moldable HomeView design.
- Mascot: `public/assets/grandma-character.png`, the white cloud-like character; do not use the red character.

## Entry and idle state

The experience remains available at `/grandma` and is framed within the same centered square white display and warm light-gray environment as the Moldable home screen.

The idle state shows the cloud mascot on the right and one clear **Record** pill nearby. Recording never starts automatically. The left edge retains the soft gradient affordance from the Moldable tool ecosystem, visually connecting this screen to the broader product.

No transcript or guiding question appears before recording begins.

## Recording state

Selecting **Record** uses the existing voice-recorder flow and browser microphone permission behavior. The button changes to **Stop** and remains available without obscuring the transcript or questions.

The mascot stays on the right as the conversational anchor. It may enter with the existing short arrival motion but does not need lip-syncing or new artwork.

### Guiding-question rail

The left gradient opens into a shallow curved rail of guiding questions. The existing question content and timing remain authoritative:

1. What color should it be?
2. What should it smell like?
3. What should it taste like?
4. What would you tell the people making it?

Only one question is primary at a time. Neighboring questions may be partially visible, smaller, softer, and masked at the top and bottom so the rail feels circular and continuous. The first question appears after the existing delay, then questions rotate on the existing interval.

Question motion is calm and legible. Reduced-motion users receive an immediate crossfade or direct content replacement without orbital movement.

### Transcript

The combined final and interim transcript occupies the lower-right portion of the white display, leaving clear space between the text, mascot, and question rail.

New words enter with a short rolling reveal: slight vertical movement, softened blur, and opacity resolving to crisp text. Previously settled words remain still. The transcript stays within a limited number of visible lines and masks older text softly rather than introducing a scrollbar.

Final transcript text is near-black. Interim text uses the existing muted gray. Browser or transcription errors appear in the same transcript region with restrained error color and a live status announcement.

### Generated title

The existing generated title behavior remains. When enough transcript exists, the title appears quietly near the upper area of the display without shifting the Record/Stop control or mascot.

## Completion and handoff

Selecting **Stop** uses the existing recorder cleanup behavior and transitions through the current completed-recording path. This slice defines only the handoff contract: the final transcript and generated title remain available to the next editing/cookbook state.

The current story-writing destination may remain temporarily in place until the recipe-editing screen receives its own approved design and plan. No cookbook editing UI is added here.

## Component boundaries

### `GrandmaHomeView`

Owns the square HomeView composition and places the recorder control, title, mascot, question rail, transcript, and error state. It consumes the existing recorder state rather than reimplementing audio logic.

### `GuidingQuestionRail`

Receives the active question index and renders the curved, masked question sequence. It has no timers or recorder knowledge.

### `RollingTranscript`

Receives final and interim transcript strings and renders the limited-line rolling reveal. It contains presentation behavior only and remains accessible as one coherent live transcript region.

The existing `useVoiceRecorder`, transcription request, and title-generation modules retain their responsibilities.

## Visual system

- Environment: the same warm light gray as Moldable HomeView.
- Display: square, white, softly rounded, with restrained ambient shadow.
- Typeface: existing Archivo variable font.
- Controls: transparent or pale cool-gray rounded pills with near-black icons and text.
- Accent: the restrained cool blue established for active Moldable tools; use only for focused or active states.
- Text: near-black final text, muted gray interim text, restrained muted red for errors.
- Motion: short arrival, orbital question transition, and subtle rolling transcript reveal; no bouncing or continuous decorative animation.

## Accessibility

- Record and Stop are one real button with accurate label, pressed state, and disabled state during transitions.
- Microphone and transcription errors use a live status region.
- The visible guiding question uses a polite live region; partially visible neighboring questions are hidden from assistive technology.
- The transcript is exposed as coherent text rather than as individually announced animated words.
- Keyboard focus remains visible and follows the existing Record/Stop control behavior.
- Reduced-motion preferences remove orbital and rolling transforms while preserving state changes.

## Responsive behavior

The display stays square and scales from the smaller viewport axis. The question rail occupies the left portion, while the mascot, control, title, and transcript share the remaining space without overlap.

On narrow or short viewports, the mascot and type scale down, the question rail becomes more compact, and transcript line count decreases. The Record/Stop control remains reachable in the upper-right region.

## Testing and validation

- Existing recorder, transcript, question timing, error, title, and completed-recording tests remain green.
- New component tests cover idle layout, the cloud mascot asset, Record/Stop state, question-rail content, transcript final/interim rendering, and accessible live regions.
- Fake timers verify the existing first-question delay and rotation interval in the HomeView composition.
- Reduced-motion behavior is verified without depending on animation timing.
- Desktop and narrow browser screenshots validate the square screen, light-gray surround, left question rail, right mascot, and lower-right transcript.
- Type-checking, the complete unit suite, and the production build must pass.

## Out of scope

- Automatic recording on screen entry.
- New audio capture or transcription infrastructure.
- Lip-syncing or new mascot artwork.
- Recipe editing, ingredient cards, tidy controls, cookbook generation, sharing, or sending the book.
- Changes to the content or timing of the existing guiding questions.
