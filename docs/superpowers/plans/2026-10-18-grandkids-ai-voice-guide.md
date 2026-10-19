# Grandkids AI Voice Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a grandchild ask spoken Lelawar Bali questions from the new Grandkids screen, receive a grounded OpenAI answer in Oma Lien's language, see the relevant recipe target emphasized, and hear the answer through ElevenLabs.

**Architecture:** Keep credentials and model calls in Next.js route handlers. A shared recipe-context module provides canonical family wording and recipe facts to the OpenAI prompt, while a focused client hook owns recording, requests, bounded history, cancellation, and audio playback. `HomeViewBoard` remains the visual state machine and maps structured answer targets onto existing recipe, ingredient, step, and pencil-mascot states.

**Tech Stack:** Next.js 16 App Router route handlers, React 19, TypeScript, OpenAI Responses and transcription HTTP APIs, ElevenLabs text-to-speech HTTP API, MediaRecorder, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-grandkids-ai-voice-guide-design.md`

## Global Constraints

- Preserve the square Grandkids HomeView, black typography, soft gray canvas, white controls, recipe cards, and pencil mascot.
- Preserve family wording including `½ kilo`, `segenggam`, `6 butir`, `4 siung`, `1 sendok`, `2 ruas`, `sejumput`, `4 lembar`, `1 buah`, `1 ikat`, and `2 gelas`.
- Do not render the child's transcript or a chat log.
- Use ElevenLabs voice ID `dqoT2ZtOCpbG5tUUBU2W`.
- Keep `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` server-only; never commit or expose them to browser code.
- Keep no more than four question-and-answer pairs in client memory and persist none of them.
- Answers are one to three short spoken sentences grounded only in the supplied recipe context.
- Keep the existing Grandma transcription caller and response contract working.
- All production changes follow test-first red-green-refactor cycles.

## Review Focus

- A child taps Adjust repeatedly while a request or audio answer is active: the stale recording, fetches, and audio must be cancelled before the next session starts; pinned in Task 4.
- Speech recognition yields silence or a zero-byte recording: the UI returns to idle with a short accessible retry message and makes no answer request; pinned in Task 4.
- OpenAI returns valid JSON with an ingredient or step that is absent from the recipe: the server rejects it rather than letting the UI target arbitrary content; pinned in Task 2.
- A follow-up question arrives after more than four exchanges: only the newest four complete pairs are sent; pinned in Task 3.
- ElevenLabs fails after OpenAI succeeds: the relevant recipe target and screen-reader answer remain available while audio failure is non-destructive; pinned in Task 4.

---

## File Structure

- Create `src/grandkids/recipeContext.ts`: canonical recipe facts, original family wording, allowed targets, and prompt-ready context.
- Create `src/grandkids/recipeContext.test.ts`: guards canonical vocabulary, step numbering, and target lookup.
- Create `src/app/api/grandkids/ask/route.ts`: validates requests, calls OpenAI Responses, validates structured output, and returns the public answer contract.
- Create `src/app/api/grandkids/ask/route.test.ts`: request, upstream, grounding, and malformed-output coverage.
- Create `src/grandkids/useGrandkidsVoiceGuide.ts`: records five-second audio, transcribes, asks, speaks, retains bounded history, and cancels stale work.
- Create `src/grandkids/useGrandkidsVoiceGuide.test.tsx`: hook behavior with fake MediaRecorder, fetch, Audio, and timers.
- Modify `src/app/api/grandkids/speak/route.ts`: use the supplied ElevenLabs voice ID.
- Modify `src/app/api/grandkids/speak/route.test.ts`: assert the new voice URL and existing secret handling.
- Modify `src/boards/HomeView.tsx`: consume the hook, map answer targets to recipe views, and position the pencil mascot.
- Modify `src/boards/HomeView.test.tsx`: question-flow, target, transcript-absence, and accessibility coverage.
- Modify `src/boards/boards.css`: listening/thinking/speaking states, targeted-line emphasis, mascot travel, and reduced motion.

### Task 1: Canonical Family Recipe Context

**Files:**
- Create: `src/grandkids/recipeContext.ts`
- Create: `src/grandkids/recipeContext.test.ts`

**Interfaces:**
- Consumes: no earlier task interfaces.
- Produces: `GRANDKIDS_RECIPE_CONTEXT`, `GRANDKIDS_INGREDIENT_TARGETS`, `GRANDKIDS_STEP_TARGETS`, and `formatRecipeGrounding(state: GrandkidsRecipeState): string`; `GrandkidsRecipeState` contains `servings: 2 | 4`, `activeStep: number | null`, `versionLabel: string | null`, and `kencurSubstitution: boolean`.

- [ ] **Step 1: Write the failing canonical-context tests**

Add tests named:

- `keeps Oma's original measurement grammar beside tidy amounts`
- `defines all eight numbered cooking steps and allowed UI targets`
- `formats the current serving and kencur substitution state for grounding`

Assert literal family phrases from Global Constraints, exactly eight steps numbered 1–8, allowed ingredient keys that include `kencur`, and formatted state containing `Nevan + Fred · 2 servings` plus `Ginger + lime zest` when enabled.

- [ ] **Step 2: Run the context test and verify RED**

Run: `npm test -- src/grandkids/recipeContext.test.ts --run`

Expected: FAIL because `recipeContext.ts` does not exist.

- [ ] **Step 3: Implement the canonical context exports**

Implement `GrandkidsRecipeState`, immutable ingredient and step data, allowed target sets, and `formatRecipeGrounding`. Keep prompt formatting deterministic and free of credentials or user text.

- [ ] **Step 4: Run the context test and verify GREEN**

Run: `npm test -- src/grandkids/recipeContext.test.ts --run`

Expected: all context tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/grandkids/recipeContext.ts src/grandkids/recipeContext.test.ts
git commit -m "feat: add grounded grandkids recipe context"
```

### Task 2: Grounded OpenAI Answer Route

**Files:**
- Create: `src/app/api/grandkids/ask/route.ts`
- Create: `src/app/api/grandkids/ask/route.test.ts`

**Interfaces:**
- Consumes: `formatRecipeGrounding`, `GRANDKIDS_INGREDIENT_TARGETS`, and `GRANDKIDS_STEP_TARGETS` from Task 1.
- Produces: `POST(request: Request): Promise<Response>` accepting `{ question, recipeState, history }`; public `GrandkidsAnswer` with `answer`, `target`, optional `ingredient`, and optional `step`.

- [ ] **Step 1: Write failing validation and grounding tests**

Cover:

- missing `OPENAI_API_KEY` returns 503 without calling fetch;
- blank or over-1000-character question returns 400;
- history longer than four pairs is rejected or normalized to the latest four;
- the OpenAI request targets `/v1/responses`, uses `process.env.OPENAI_GRANDKIDS_MODEL ?? 'gpt-5-mini'`, and includes exact family grammar plus current recipe state in `instructions`;
- user input is passed only as user content, never interpolated into high-priority instructions;
- a valid ingredient answer returns the public contract;
- a valid step answer accepts only integer steps 1–8;
- unknown ingredient, step 0/9, malformed JSON, refusal, and upstream failure return 502 without leaking upstream bodies.

- [ ] **Step 2: Run the route test and verify RED**

Run: `npm test -- src/app/api/grandkids/ask/route.test.ts --run`

Expected: FAIL because the ask route does not exist.

- [ ] **Step 3: Implement request and response types plus extraction helpers**

In `route.ts`, define the narrow request type, `GrandkidsAnswer`, `extractOutputText(payload: unknown): string`, and runtime validators. Use `text.format` JSON Schema so OpenAI returns the answer contract; independently validate it before returning.

- [ ] **Step 4: Implement the Responses API call**

Use `POST https://api.openai.com/v1/responses` with bearer authorization, `reasoning: { effort: 'minimal' }`, bounded output tokens, recipe grounding in `instructions`, and question/history in `input`. Include exact rules for one-to-three sentences, family wording, unknown answers, unrelated questions, and adult help for unsupported safety questions.

- [ ] **Step 5: Run the route tests and verify GREEN**

Run: `npm test -- src/app/api/grandkids/ask/route.test.ts --run`

Expected: all ask-route tests PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/app/api/grandkids/ask/route.ts src/app/api/grandkids/ask/route.test.ts
git commit -m "feat: add grounded grandkids answer route"
```

### Task 3: Five-Second Voice Guide Hook

**Files:**
- Create: `src/grandkids/useGrandkidsVoiceGuide.ts`
- Create: `src/grandkids/useGrandkidsVoiceGuide.test.tsx`

**Interfaces:**
- Consumes: `/api/grandma/transcribe`, `/api/grandkids/ask`, and `/api/grandkids/speak` HTTP contracts.
- Produces: `useGrandkidsVoiceGuide(options)` returning `{ status, answer, target, errorMessage, start, cancel }`; `options` provides `recipeState`, `onTarget(answer)`, and optional `recordingDurationMs` defaulting to 5000.

- [ ] **Step 1: Write failing recording and orchestration tests**

Use fake timers and specific MediaRecorder, `getUserMedia`, fetch, URL, and Audio doubles. Cover:

- `start()` requests microphone access, begins MediaRecorder, and enters `listening`;
- at 4999 ms no request is sent, at 5000 ms recording stops and the audio blob is posted for transcription;
- a blank/zero-byte recording returns to idle with `I didn’t catch that. Try again.` and skips ask/speak;
- transcript text is posted to ask but is never returned by the hook for rendering;
- a valid answer calls `onTarget`, posts only the answer text to speak, and enters `speaking` until audio ends;
- the fifth exchange drops the oldest pair and sends only four complete pairs;
- `cancel()` and a second `start()` stop tracks and audio, abort all fetches, revoke object URLs, and ignore stale responses;
- speak failure retains `answer` and `target`, sets a non-destructive audio error, and leaves the answer accessible;
- unmount performs the same cleanup.

- [ ] **Step 2: Run the hook test and verify RED**

Run: `npm test -- src/grandkids/useGrandkidsVoiceGuide.test.tsx --run`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook state machine**

Define `GrandkidsVoiceStatus = 'idle' | 'requesting' | 'listening' | 'thinking' | 'speaking' | 'error'`. Implement one active session token with `AbortController`, MediaRecorder chunks, five-second timer, object URL lifecycle, and four-pair history. Do not expose question transcripts in the return value.

- [ ] **Step 4: Run the hook tests and verify GREEN**

Run: `npm test -- src/grandkids/useGrandkidsVoiceGuide.test.tsx --run`

Expected: all hook tests PASS without act warnings or leaked timers.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/grandkids/useGrandkidsVoiceGuide.ts src/grandkids/useGrandkidsVoiceGuide.test.tsx
git commit -m "feat: orchestrate grandkids voice questions"
```

### Task 4: HomeView Question and Walkthrough Synchronization

**Files:**
- Modify: `src/boards/HomeView.tsx`
- Modify: `src/boards/HomeView.test.tsx`
- Modify: `src/boards/boards.css`

**Interfaces:**
- Consumes: `useGrandkidsVoiceGuide(options)` and `GrandkidsAnswer` from Tasks 2–3.
- Produces: the accessible Adjust question flow and visual target mapping inside `HomeViewBoard`.

- [ ] **Step 1: Replace direct browser-recognition tests with failing hook-integration tests**

Mock only `useGrandkidsVoiceGuide` at the network/media boundary and exercise the real board. Cover:

- Adjust invokes `start` and renders `Listening…`, `Thinking…`, or speaking emphasis from hook status;
- no question transcript appears anywhere;
- ingredient answer opens the ingredients target, marks the named ingredient, and positions `grandma-writer.png` beside it;
- step answer switches `view` to `steps`, marks the returned step, and scrolls it into view without changing recipe content;
- the visible family ingredient wording remains aligned with `GRANDKIDS_RECIPE_CONTEXT`, so UI copy cannot drift from the answer grounding;
- time and tools answers select the correct half of the existing swap card;
- overview answer returns to overview;
- the screen-reader live region contains the spoken answer and target while visible UI stays sparse;
- repeated Adjust cancels the active session before starting a new one;
- unsupported microphone and no-speech errors remain inside the square screen and keep Adjust usable.

- [ ] **Step 2: Run the board tests and verify RED**

Run: `npm test -- src/boards/HomeView.test.tsx --run`

Expected: FAIL because the board still owns the two hard-coded adjustment recognitions and cannot map AI targets.

- [ ] **Step 3: Integrate the hook and remove duplicated recording logic**

Delete HomeView's local `SpeechRecognitionLike`, recognition ref, hard-coded transcript regexes, and five-second voice parsing. Build `GrandkidsRecipeState` from current servings, active step, version label, and kencur substitution, then pass it to the hook.

- [ ] **Step 4: Implement answer-target mapping**

Add one `handleTarget(answer: GrandkidsAnswer)` callback. It sets overview/steps, time/tools, ingredient or step emphasis, and the pencil mascot target. Clear only transient emphasis when new listening begins; preserve all recipe adaptations.

- [ ] **Step 5: Implement sparse visual and accessible states**

Update CSS for Adjust listening/thinking/speaking states, targeted row/step underline, pencil travel, compact in-canvas errors, and `prefers-reduced-motion`. Keep all text black, controls white, and the canvas soft gray.

- [ ] **Step 6: Run board and Kitchen integration tests and verify GREEN**

Run: `npm test -- src/boards/HomeView.test.tsx src/kitchen/KitchenMockup.test.tsx --run`

Expected: all tests PASS and the Kitchen perspective wrapper remains intact.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/boards/HomeView.tsx src/boards/HomeView.test.tsx src/boards/boards.css
git commit -m "feat: connect AI voice guide to grandkids HomeView"
```

### Task 5: ElevenLabs Voice, Credentials, and End-to-End Verification

**Files:**
- Modify: `src/app/api/grandkids/speak/route.ts`
- Modify: `src/app/api/grandkids/speak/route.test.ts`
- Local only, never commit: `.env.local`

**Interfaces:**
- Consumes: answer text from Task 3 and server-only `ELEVENLABS_API_KEY`.
- Produces: MPEG audio using voice ID `dqoT2ZtOCpbG5tUUBU2W`.

- [ ] **Step 1: Write the failing voice-ID test**

Assert that a valid request calls `https://api.elevenlabs.io/v1/text-to-speech/dqoT2ZtOCpbG5tUUBU2W`, preserves the bounded text checks, sends the API key only in `xi-api-key`, and returns `audio/mpeg` with `Cache-Control: no-store`.

- [ ] **Step 2: Run the speak-route test and verify RED**

Run: `npm test -- src/app/api/grandkids/speak/route.test.ts --run`

Expected: FAIL because the route still uses the previous voice ID.

- [ ] **Step 3: Replace the voice ID and verify GREEN**

Change only the Grandkids voice constant, then run:

`npm test -- src/app/api/grandkids/speak/route.test.ts --run`

Expected: all speak-route tests PASS.

- [ ] **Step 4: Configure rotated credentials locally**

The user must rotate the OpenAI key exposed in chat and enter the replacement directly in `.env.local` as `OPENAI_API_KEY`. Preserve the existing `ELEVENLABS_API_KEY`. Confirm only variable names with `awk`; never print values or include `.env.local` in Git.

- [ ] **Step 5: Run complete automated verification**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
```

Expected: all tests pass, TypeScript exits 0, and the production build completes with `/api/grandkids/ask`, `/api/grandkids/speak`, `/boards/home`, and `/kitchen` present.

- [ ] **Step 6: Perform proportionate live checks**

With the local dev server and rotated keys:

- ask one ingredient question and confirm the correct ingredient plus pencil target;
- ask one step question and confirm the walkthrough opens the correct step;
- confirm the spoken answer uses the supplied ElevenLabs voice;
- deny microphone access once and confirm recovery;
- inspect browser network requests to confirm no key appears in browser payloads or responses;
- capture a HomeView screenshot and compare it with the reference lock.

- [ ] **Step 7: Commit Task 5 without credentials**

```bash
git add src/app/api/grandkids/speak/route.ts src/app/api/grandkids/speak/route.test.ts
git commit -m "feat: use the new grandkids ElevenLabs voice"
```
