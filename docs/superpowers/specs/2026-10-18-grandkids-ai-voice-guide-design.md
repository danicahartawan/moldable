# Grandkids AI Voice Guide Design

## Goal

Turn the new Grandkids recipe screen into a conversational cooking guide. A grandchild can press the existing **Adjust** control, ask a recipe question aloud, receive a short answer grounded in Oma Lien's Lelawar Bali recipe, see the relevant recipe area highlighted, and hear the answer in the configured ElevenLabs voice.

The guide must preserve the family's original recipe language rather than rewriting it into generic cookbook prose.

## Reference Lock

- Preserve the current square Grandkids HomeView, black typography, soft gray canvas, white controls, recipe cards, and pencil mascot.
- Preserve Oma Lien's vocabulary and measurement grammar, including phrases such as `½ kilo`, `segenggam`, `6 butir`, `4 siung`, `1 sendok`, `2 ruas`, `sejumput`, `4 lembar`, `1 buah`, `1 ikat`, and `2 gelas`.
- Use tidy metric quantities only as an additional visual aid. Do not replace or “correct” the family wording in spoken answers.
- Use the supplied ElevenLabs voice ID `dqoT2ZtOCpbG5tUUBU2W`.
- Do not display a transcript of the child's question.
- Reject generic assistant chrome, chat bubbles, long answers, or a permanent transcript panel.

## User Flow

### Ask

1. The grandchild presses **Adjust**.
2. The button enters a clear listening state for up to five seconds.
3. Microphone audio is recorded and sent to the existing server-side OpenAI transcription route.
4. The recording stops automatically after five seconds. Pressing Adjust again may stop it early.
5. No recognized words are rendered on screen.

### Understand

1. The transcript is sent to a new `POST /api/grandkids/ask` route.
2. The route calls the OpenAI Responses API using a server-only key.
3. The request includes:
   - the current recipe version and serving size;
   - the active walkthrough step;
   - the complete Lelawar Bali ingredient and method facts;
   - Oma Lien's family-language glossary;
   - a small bounded conversation history for follow-up questions.
4. The model returns structured data containing a concise answer and the recipe target to emphasize.

### Show and Speak

1. The interface moves to the relevant overview, ingredient, tool, or cooking step.
2. The pencil mascot travels to the targeted line and briefly marks it.
3. The answer is sent to `POST /api/grandkids/speak` and played through ElevenLabs.
4. The supplied voice ID replaces the old hard-coded voice for the Grandkids experience.
5. The visual state remains until the answer finishes, then returns to the normal recipe view without losing recipe changes.

## Answer Contract

The new ask route returns JSON with this shape:

```ts
type GrandkidsAnswer = {
  answer: string
  target: 'overview' | 'time' | 'tools' | 'ingredients' | 'step'
  ingredient?: string
  step?: number
}
```

Rules:

- `answer` is one to three short spoken sentences.
- Answers use only supplied recipe facts and the current recipe state.
- Family wording stays intact. The guide may clarify it in place, for example: “Oma says segenggam—one handful, about 80 grams.”
- The guide never claims a family memory or cooking fact that is absent from the supplied context.
- If the recipe does not contain the answer, it says so plainly and asks whether the grandchild wants a safe general cooking suggestion.
- Safety-critical questions, such as whether meat is cooked, use concrete food-safety guidance only when explicitly included in the application prompt. Otherwise the guide recommends checking with an adult.
- Unrelated questions receive a short redirect to the current recipe.

## Recipe Grounding

Create one shared server-safe recipe context module rather than duplicating facts across prompts and UI components. It contains:

- recipe title and family attribution;
- original four-serving ingredients in Oma's words;
- tidy quantities and two-serving quantities;
- all eight cooking steps;
- tools and cooking time;
- approved substitution notes, including kencur to ginger plus lime zest;
- the current adapted version label when present.

The UI may continue using its existing display arrays initially, but tests must detect drift between those values and the server grounding context. A later cleanup may make the shared context the single source of truth if that can be done without broadening this implementation.

## Components and Responsibilities

### `useGrandkidsVoiceGuide`

Owns microphone recording, the five-second timeout, request cancellation, status, short conversation history, audio playback, and cleanup. It exposes semantic states such as `idle`, `listening`, `thinking`, `speaking`, and `error`, but it does not render UI.

### `HomeViewBoard`

Keeps the existing Adjust control and recipe layout. It consumes the voice-guide state, selects the requested recipe view, highlights the returned target, and positions the pencil mascot. It never receives either API key.

### `POST /api/grandkids/ask`

Validates the question, recipe state, active step, and bounded history. It calls the OpenAI Responses API with high-priority grounding and language-preservation instructions, validates the structured response, and returns only the public answer contract.

### `POST /api/grandkids/speak`

Keeps the existing ElevenLabs integration but uses the newly supplied Grandkids voice ID. It accepts only bounded text and returns MPEG audio without caching.

### Existing transcription route

Reuse `POST /api/grandma/transcribe` for recorded audio. Rename or extract a shared implementation only if route naming becomes confusing in code; preserve the existing Grandma caller and API behavior.

## Conversation State

Keep only the latest four question-and-answer pairs in memory on the client and send them with the next request. Do not persist voice questions, transcripts, or audio to local storage, a database, logs, or analytics. Reloading the page starts a fresh conversation.

The OpenAI request remains stateless from the server's perspective. Every request carries the bounded context it needs, avoiding hidden server sessions and making behavior testable.

## Credentials and Privacy

- `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` remain server-only in ignored `.env.local` values.
- The browser never receives either credential.
- The user's newly pasted OpenAI key must be rotated because it appeared in chat. The replacement should be entered directly into `.env.local`.
- Audio is sent only after the grandchild presses Adjust.
- Audio blobs and transcripts are discarded after the response completes.
- API error bodies and secret-bearing headers are never forwarded to the browser.

## Errors and Recovery

- Microphone unavailable or denied: return Adjust to idle and show one short accessible status near the control.
- No speech recognized: say visually, without ElevenLabs, “I didn’t catch that. Try again.”
- OpenAI unavailable or malformed response: keep the current recipe state and show “I couldn’t answer just now.”
- ElevenLabs unavailable: keep the visual answer target and expose the answer to assistive technology, but do not add a visible transcript panel.
- Starting a new question cancels any prior transcription, answer, speech request, and audio playback.

## Accessibility

- Adjust remains a keyboard-operable button with an accurate accessible name and pressed/busy state.
- Status changes use a concise `aria-live` region.
- The highlighted ingredient or step is programmatically identified in the status message.
- Audio is supplementary; the answer remains available to screen readers.
- Reduced-motion mode moves the mascot immediately and removes travel/pulse animation.

## Testing

### Unit and component tests

- Adjust records for five seconds, stops, and sends audio for transcription.
- The recognized question is never visible.
- The ask route receives recipe state, active step, and bounded history.
- A returned ingredient target focuses the ingredient list and moves the mascot.
- A returned step target opens the step view and marks the correct step.
- A second question includes the first answer as bounded history.
- Starting over cancels stale fetches and audio.
- Screen-reader status contains the answer while visual transcript text remains absent.

### Route tests

- Missing credentials, empty questions, excessive input, invalid recipe state, upstream failures, malformed structured output, and valid answers.
- The OpenAI request contains the grounding context and family-language rules.
- The ElevenLabs request uses the supplied voice ID and never exposes its API key.

### Visual and browser checks

- Listening, thinking, ingredient answer, step answer, speaking, and error states at desktop and narrow sizes.
- Pencil mascot stays within the square screen and does not obscure the updated ingredient value.
- Grandkids typography remains black and controls remain white on the soft gray canvas.

## Out of Scope

- Open-ended general-purpose chat.
- Persisted conversation history or user profiles.
- Autonomous web search.
- Changing Grandma's source recording or grammar.
- A visible transcript, chat log, or text-entry interface.
- Training or fine-tuning a custom model.
