'use client'

import { BowlFood } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { DotSpinner } from '../Icon'
import { ClayBody } from '../clay/ClayBody'
import { HomeViewFrame } from '../home/HomeViewFrame'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { transcribeAudio } from './transcribe'
import { demoStorySegments } from './GrandmaPage'
import { guidingQuestions } from './GuidingQuestionRail'
import { CameraButton, NoteStory, useTypedLength, type StoryChange, type StoryPhoto } from './NoteStory'
import { simulatedLevel } from './RecordingWaveform'
import './grandma.css'
import './grandma-minimal.css'

// RollingTranscript types one character every 28ms; each segment waits for the last to finish, plus a breath.
const TYPING_MS_PER_CHAR = 28
const PAUSE_BETWEEN_SEGMENTS_MS = 1_500
const segmentStartTimes = demoStorySegments.reduce<number[]>((times, _segment, index) => {
  if (index === 0) return [0]
  const previous = demoStorySegments[index - 1]
  return [...times, times[index - 1] + previous.length * TYPING_MS_PER_CHAR + PAUSE_BETWEEN_SEGMENTS_MS]
}, [])

const DEMO_NAME = 'Lawar Bali, Popo’s way'
const DEMO_TITLE = 'Lawar Bali'
const DEMO_VARIATION = 'Popo’s way'
const TITLE_TYPING_MS_PER_CHAR = 70

// The recipe's name types itself into the title spot, then its family variation appears underneath.
function TypedTitle({ text, onDone }: { text: string; onDone: () => void }) {
  const [length, setLength] = useState(0)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setLength(text.length)
      return
    }
    const typing = window.setInterval(() => {
      setLength((value) => {
        if (value + 1 >= text.length) window.clearInterval(typing)
        return value + 1
      })
    }, TITLE_TYPING_MS_PER_CHAR)
    return () => window.clearInterval(typing)
  }, [text])

  useEffect(() => {
    if (length >= text.length) onDone()
  }, [length, text, onDone])

  return (
    <h1 className="gm-note__title" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, length)}</span>
    </h1>
  )
}
// The first question waits until grandma has been talking for a while.
const QUESTION_INTERVAL_MS = 30_000
const QUESTION_TYPING_MS_PER_CHAR = 40

// A lump of orange clay that listens: loud words pull it longer, pauses let it relax back to round.
function ListeningClay({ levelRef, isPaused, className = '', size = 92 }: { levelRef: RefObject<number | null>; isPaused: boolean; className?: string; size?: number }) {
  const start = useRef(0)
  // Read every frame by the clay's own loop: her live level, or a stand-in while there's no microphone.
  const level = useCallback(() => {
    const live = levelRef.current
    if (live !== null) return live
    if (!start.current) start.current = performance.now()
    return simulatedLevel((performance.now() - start.current) / 1000)
  }, [levelRef])

  return (
    <span className={`gm-clay${isPaused ? ' is-paused' : ''}${className ? ` ${className}` : ''}`} role="status" aria-label="Listening">
      <ClayBody width={size} height={size} home={{ x: size / 2, y: size / 2 }} radius={size * 0.35} level={isPaused ? undefined : level} />
    </span>
  )
}

// Recipe change: the screen fogs over and the clay listens in the middle. After a fixed
// five seconds of her talking it answers, typed out, then the fog lifts onto the marked changes.
const RECIPE_CHANGE_LISTEN_MS = 5_000
const RECIPE_CHANGE_REPLY = 'Ok, got it!'
const RECIPE_CHANGE_SETTLE_MS = 1_400
// A photo's chip never splits a word: it waits for the word being typed to finish (and its punctuation).
function wordEndAt(text: string, at: number) {
  const next = text.slice(at).search(/\s/)
  return next === -1 ? text.length : at + next
}

const SEARCH_SCROLL_MS = 1_600
const CRUMPLE_MS = 950
// The change she asks for in the demo.
const DEMO_CHANGE: StoryChange = { find: 'pork', replace: 'beef' }

function RecipeChangeOverlay({ levelRef, onClose }: { levelRef: RefObject<number | null>; onClose: () => void }) {
  const [hasHeard, setHasHeard] = useState(false)
  const reply = useTypedLength(hasHeard ? RECIPE_CHANGE_REPLY : '')

  useEffect(() => {
    const heard = window.setTimeout(() => setHasHeard(true), RECIPE_CHANGE_LISTEN_MS)
    return () => window.clearTimeout(heard)
  }, [])

  // Once the reply has finished typing, the fog lifts by itself (a tap lifts it sooner).
  useEffect(() => {
    if (!hasHeard || reply < RECIPE_CHANGE_REPLY.length) return
    const settle = window.setTimeout(onClose, RECIPE_CHANGE_SETTLE_MS)
    return () => window.clearTimeout(settle)
  }, [hasHeard, reply, onClose])

  return (
    <div className="gm-fog" role="dialog" aria-label="Recipe change" onClick={hasHeard ? onClose : undefined}>
      <ListeningClay levelRef={levelRef} isPaused={hasHeard} className="gm-clay--center" size={150} />
      {hasHeard ? (
        <p className="gm-fog__reply" aria-live="polite">
          <span className="gm-question__accessible">{RECIPE_CHANGE_REPLY}</span>
          <span aria-hidden="true">{RECIPE_CHANGE_REPLY.slice(0, reply)}</span>
        </p>
      ) : (
        <p className="gm-cradle" aria-label="Listening"><span /><span /><span /></p>
      )}
    </div>
  )
}

function TypedQuestion({ text }: { text: string }) {
  const [length, setLength] = useState(0)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setLength(text.length)
      return
    }
    setLength(0)
    const typing = window.setInterval(() => {
      setLength((value) => {
        if (value + 1 >= text.length) window.clearInterval(typing)
        return value + 1
      })
    }, QUESTION_TYPING_MS_PER_CHAR)
    return () => window.clearInterval(typing)
  }, [text])

  return (
    <p className="gm-question" aria-live="polite">
      <span className="gm-question__accessible">{text}</span>
      <span aria-hidden="true">{text.slice(0, length)}</span>
    </p>
  )
}

// The grandma screen as a recipe note: the whole story writes itself into the note while recording.
export function GrandmaMinimalPage({ onTidy }: { onTidy?: () => void } = {}) {
  const recorder = useVoiceRecorder({ transcribeAudio, allowWithoutMicrophone: true })
  const [segmentCount, setSegmentCount] = useState(0)
  const [guidingQuestionIndex, setGuidingQuestionIndex] = useState<number | null>(null)
  const [demoName, setDemoName] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [isTitleTyped, setIsTitleTyped] = useState(false)
  const demoClock = useRef({ elapsed: 0, questions: 0 })
  const isRecording = recorder.status === 'recording'
  const isPaused = recorder.isPaused
  const hasSpokenTranscript = Boolean(recorder.transcript || recorder.interimTranscript)

  // Demo clock: segments and questions only advance while recording is not paused.
  useEffect(() => {
    const clock = demoClock.current
    // Once she stops, the story stays where it got to; only the question goes away.
    if (!isRecording) {
      setGuidingQuestionIndex(null)
      return
    }
    if (isPaused) return

    const begin = Date.now()
    const timers = segmentStartTimes.map((at, index) =>
      window.setTimeout(() => setSegmentCount((count) => Math.max(count, index + 1)), Math.max(0, at - clock.elapsed)),
    )
    const scheduleQuestion = () => {
      const index = clock.questions
      const at = (index + 1) * QUESTION_INTERVAL_MS
      timers.push(window.setTimeout(() => {
        clock.questions = index + 1
        setGuidingQuestionIndex(index % guidingQuestions.length)
        scheduleQuestion()
      }, Math.max(0, at - (clock.elapsed + Date.now() - begin))))
    }
    scheduleQuestion()

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      clock.elapsed += Date.now() - begin
    }
  }, [isRecording, isPaused])

  useEffect(() => {
    if (!isRecording) return
    const naming = window.setTimeout(() => setDemoName(DEMO_NAME), 5_000)
    return () => window.clearTimeout(naming)
  }, [isRecording])

  // No Record button: the screen starts listening as soon as it appears.
  const hasAutoStarted = useRef(false)
  useEffect(() => {
    if (hasAutoStarted.current || recorder.status !== 'idle') return
    hasAutoStarted.current = true
    recorder.toggle()
  }, [recorder])

  const demoTranscript = demoStorySegments.slice(0, segmentCount).join(' ')
  const markTitleTyped = useCallback(() => setIsTitleTyped(true), [])
  const noteText = hasSpokenTranscript ? recorder.transcript : demoTranscript
  const visibleLength = useTypedLength(noteText)
  const visibleLengthRef = useRef(visibleLength)
  visibleLengthRef.current = visibleLength
  const noteTextRef = useRef(noteText)
  noteTextRef.current = noteText
  const [photos, setPhotos] = useState<StoryPhoto[]>([])
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  // Recipe change opens the fog overlay; Tidy only shows it's chosen for now.
  const [doneView, setDoneView] = useState<'changes' | 'tidy' | null>(null)
  const [isCrumpling, setIsCrumpling] = useState(false)

  // Tidy: the note crumples into a ball, then the kitchen hands over to the Grandkids recipe, which opens like a book.
  const tidy = () => {
    setDoneView('tidy')
    setIsCrumpling(true)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => onTidy?.(), reducedMotion ? 0 : CRUMPLE_MS)
    // Smooth the page back out once it's out of sight, ready for a return visit.
    window.setTimeout(() => setIsCrumpling(false), (reducedMotion ? 0 : CRUMPLE_MS) + 900)
  }
  const [changes, setChanges] = useState<StoryChange[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isRecipeListening, setIsRecipeListening] = useState(false)
  const applyRecipeChange = useCallback(() => {
    setIsRecipeListening(false)
    setIsSearching(true)
    setChanges([DEMO_CHANGE])
  }, [])

  // The note scrolls through the story as if looking for the change, then marks it once it lands there.
  useEffect(() => {
    const box = story.current
    const mark = box?.querySelector<HTMLElement>('.gm-change')
    if (!box || !mark || !isSearching) return
    const from = box.scrollTop
    const to = Math.max(0, Math.min(box.scrollHeight - box.clientHeight, mark.offsetTop - box.clientHeight / 3))
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || from === to) {
      box.scrollTop = to
      setIsSearching(false)
      return
    }
    const duration = SEARCH_SCROLL_MS
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      box.scrollTop = from + (to - from) * eased
      if (t < 1) frame = requestAnimationFrame(step)
      else setIsSearching(false)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [changes, isSearching])
  // A photo lands at the point in the story she had reached when she took it.
  const addPhoto = useCallback((src: string) => {
    setPhotos((current) => [...current, { id: current.length + 1, at: wordEndAt(noteTextRef.current, visibleLengthRef.current), src }])
  }, [])
  const story = useRef<HTMLDivElement>(null)
  const [isStoryOverflowing, setIsStoryOverflowing] = useState(false)
  const hasStory = Boolean(noteText || photos.length || recorder.errorMessage)

  // The story starts under the title and keeps its newest line in view as it grows, while she's recording.
  const isFollowing = useRef(true)
  isFollowing.current = !recorder.hasCompletedRecording
  useEffect(() => {
    const box = story.current
    const content = box?.firstElementChild
    if (!box || !content) return
    const follow = new ResizeObserver(() => {
      if (isFollowing.current) box.scrollTop = box.scrollHeight
      setIsStoryOverflowing(box.scrollHeight > box.clientHeight)
    })
    follow.observe(content)
    return () => follow.disconnect()
  }, [hasStory])

  const isDone = recorder.hasCompletedRecording

  return (
    <HomeViewFrame label="Grandma HomeView" className={`grandma-homeview grandma-minimal${isCrumpling ? ' is-crumpling' : ''}`}>
      <div className="gm-sheet">
      <section className={`gm-note${isCameraOpen ? ' is-beside-camera' : ''}`} aria-label="Note">
        <div className="gm-note__head">
          {demoName ? (
            <TypedTitle text={DEMO_TITLE} onDone={markTitleTyped} />
          ) : isDone ? (
            <h1 className="gm-note__title">{DEMO_TITLE}</h1>
          ) : (
            <p className="gm-note__title gm-note__title--starting" aria-live="polite"><DotSpinner /><span>Starting</span></p>
          )}
        </div>
        <div className="gm-note__chips">
          {isTitleTyped ? (
            <span className="gm-note__chip">
              <BowlFood size={18} aria-hidden="true" />
              <span className="gm-note__chip-label">{DEMO_VARIATION}</span>
            </span>
          ) : null}
        </div>
        {hasStory ? (
          <div ref={story} className={`gm-note__story${isStoryOverflowing ? ' is-overflowing' : ''}${isSearching ? ' is-searching' : ''}`}>
            {recorder.errorMessage ? (
              <p className="gm-story" role="status">{recorder.errorMessage}</p>
            ) : (
              <NoteStory
                text={noteText}
                visibleLength={visibleLength}
                interimText={hasSpokenTranscript ? recorder.interimTranscript : ''}
                photos={photos}
                changes={changes}
              />
            )}
          </div>
        ) : (
          <textarea
            className="gm-note__body"
            value={noteBody}
            placeholder="Write notes, or press '/' for templates"
            aria-label="Note"
            onChange={(event) => setNoteBody(event.target.value)}
          />
        )}
      </section>
      {isRecording ? (
        <div className="gm-controls" role="group" aria-label="Recording">
          <button className="grandma-waveform__pause" type="button" aria-label={isPaused ? 'Resume recording' : 'Pause recording'} aria-pressed={isPaused} onClick={recorder.togglePause}>
            {isPaused ? <span className="grandma-waveform__play" /> : <><span /><span /></>}
          </button>
          <button className="grandma-waveform__stop" type="button" aria-label="Stop recording" onClick={recorder.toggle}>
            <span />
          </button>
        </div>
      ) : null}
      {isDone ? (
        <div className="gm-done-bar">
          <ListeningClay levelRef={recorder.levelRef} isPaused className="gm-clay--beside" size={52} />
          <div className="gm-controls gm-controls--done" role="group" aria-label="Story">
            <button type="button" aria-pressed={doneView === 'changes'} onClick={() => { setDoneView('changes'); setIsRecipeListening(true) }}>Recipe change</button>
            <button type="button" aria-pressed={doneView === 'tidy'} onClick={tidy}>Tidy</button>
          </div>
        </div>
      ) : null}
      {isRecording ? <CameraButton onCapture={addPhoto} onOpenChange={setIsCameraOpen} /> : null}
      {isRecording ? <ListeningClay levelRef={recorder.levelRef} isPaused={isPaused} /> : null}
      {isRecipeListening ? <RecipeChangeOverlay levelRef={recorder.levelRef} onClose={applyRecipeChange} /> : null}
      {guidingQuestionIndex !== null ? (
        <TypedQuestion text={guidingQuestions[guidingQuestionIndex]} />
      ) : null}
      </div>
    </HomeViewFrame>
  )
}
