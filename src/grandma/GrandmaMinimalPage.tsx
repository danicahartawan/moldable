'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowsClockwise, Check } from '@phosphor-icons/react'
import { MorphBot } from './MorphBot'
import { listen, transcribe } from '../voice/capture'
import { speakReply } from './speakReply'
import { useHeyPopo } from '../voice/useHeyPopo'
import { HomeViewFrame } from '../home/HomeViewFrame'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { OrangeBeam } from '../voice/OrangeBeam'
import { LineIcon } from './LineIcon'
import { simulatedLevel } from './RecordingWaveform'
import { transcribeAudio } from './transcribe'
import { demoStorySegments } from './GrandmaPage'
import { guidingQuestions } from './GuidingQuestionRail'
import { CameraButton, NoteStory, useTypedLength, type StoryChange, type StoryPhoto } from './NoteStory'
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

const DEMO_NAME = 'Lawar Bali'
const DEMO_TITLE = 'Lawar Bali'
const TITLE_TYPING_MS_PER_CHAR = 70

// The recipe's name types itself into the title spot, then its family variation appears underneath.
function TypedTitle({ text }: { text: string }) {
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

  return (
    <h1 className="gm-note__title" aria-label={text}>
      <span aria-hidden="true">{text.slice(0, length)}</span>
    </h1>
  )
}

export function TitlePreview() {
  return (
    <p className="gm-note__title gm-note__title-preview" aria-label="New Recipe">
      <span>New Recipe</span>
    </p>
  )
}
// The first question waits until grandma has been talking for a while.
const QUESTION_INTERVAL_MS = 12_000
const QUESTION_TYPING_MS_PER_CHAR = 40

// A little orange bot that listens in the corner: awake while she talks, asleep when paused.
export function ListeningClay({ isPaused, className = '', size = 96 }: { levelRef?: RefObject<number | null>; isPaused: boolean; className?: string; size?: number; showEyes?: boolean }) {
  return (
    <span className={`gm-clay${isPaused ? ' is-paused' : ''}${className ? ` ${className}` : ''}`} role="status" aria-label="Listening">
      <MorphBot size={size} paused={isPaused} state={isPaused ? 'sleeping' : 'default'} />
    </span>
  )
}

// Recipe change: the screen fogs over and the clay listens in the middle. After a fixed
// five seconds of her talking it answers, typed out, then the fog lifts onto the marked changes.
const RECIPE_CHANGE_LISTEN_MS = 5_000
const RECIPE_CHANGE_FADE_MS = 1_300
const RECIPE_CHANGE_REPLY = 'Okay!'
// A photo's chip never splits a word: it waits for the word being typed to finish (and its punctuation).
function wordEndAt(text: string, at: number) {
  const next = text.slice(at).search(/\s/)
  return next === -1 ? text.length : at + next
}

// Tidy: the note dissolves into a mosaic of pixel blocks, each popping in at its own moment.
const MOSAIC_SIZE = 12
const MOSAIC_COLORS = ['#fff3ec', '#ffe3d8', '#ffd2b0', '#ffb27a', '#ff8a4c', '#ff5a1f']
const MOSAIC = Array.from({ length: MOSAIC_SIZE * MOSAIC_SIZE }, (_, i) => {
  // A fixed scatter, so the mosaic looks the same every time.
  const noise = (seed: number) => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }
  return { color: MOSAIC_COLORS[Math.floor(noise(i + 1) * MOSAIC_COLORS.length)], delay: Math.round(noise(i + 101) * 380) }
})

const SEARCH_SCROLL_MS = 1_600
const RIPPLE_MS = 900
// The change she asks for in the demo.
const DEMO_CHANGE: StoryChange = { find: 'pork', replace: 'beef' }

// Her live level, or a stand-in swell while there's no microphone.
function useBeamLevel(levelRef: RefObject<number | null>) {
  const start = useRef(0)
  return useCallback(() => {
    const live = levelRef.current
    if (live !== null) return live
    if (!start.current) start.current = performance.now()
    return simulatedLevel((performance.now() - start.current) / 1000)
  }, [levelRef])
}

const RECIPE_CHANGE_HEARD_AT_MS = 3_000
const RECIPE_CHANGE_REQUEST = 'Replace pork with beef'
const BLOB_SIZE = 96

// She can really speak the change: it is heard, the assistant works out the word swap, and the answer is spoken back. Where
// there is no microphone, the screen plays the demo (“Replace pork with beef”) instead.
const canListen = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

export function RecipeChangeOverlay({ levelRef, noteText = '', onClose, onHeard }: { levelRef: RefObject<number | null>; noteText?: string; onClose: (change?: StoryChange) => void; onHeard?: () => void }) {
  const [hasHeard, setHasHeard] = useState(false)
  const [heard, setHeard] = useState('')
  const [spoken, setSpoken] = useState<string | null>(null)
  const [scripted, setScripted] = useState(() => !canListen())
  const root = useRef<HTMLDivElement>(null)
  const [rowTop, setRowTop] = useState<number | null>(null)
  const change = useRef<StoryChange | undefined>(undefined)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onHeardRef = useRef(onHeard)
  onHeardRef.current = onHeard

  // The demo: five seconds in which she asks for pork to become beef.
  useEffect(() => {
    if (!scripted) return
    change.current = DEMO_CHANGE
    const speaking = window.setTimeout(() => setHeard(RECIPE_CHANGE_REQUEST), RECIPE_CHANGE_HEARD_AT_MS)
    const done = window.setTimeout(() => {
      setHasHeard(true)
      onHeardRef.current?.()
    }, RECIPE_CHANGE_LISTEN_MS)
    return () => {
      window.clearTimeout(speaking)
      window.clearTimeout(done)
    }
  }, [scripted])

  // The real thing.
  useEffect(() => {
    if (scripted) return
    let cancelled = false
    ;(async () => {
      try {
        const recording = await listen()
        if (cancelled) return
        if (!recording) {
          onCloseRef.current()
          return
        }
        const transcript = await transcribe(recording)
        if (cancelled) return
        if (!transcript) {
          setSpoken('I didn’t catch that.')
          setHasHeard(true)
          return
        }
        setHeard(transcript)
        const response = await fetch('/api/voice/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, note: noteText }),
        })
        const edit = await response.json() as { find: string | null; replace: string | null; reply: string }
        if (cancelled) return
        if (edit.find && edit.replace) change.current = { find: edit.find, replace: edit.replace }
        setSpoken(edit.reply)
        setHasHeard(true)
        if (change.current) onHeardRef.current?.()
        await speakReply(edit.reply)
      } catch {
        // No microphone after all (blocked or missing): play the demo.
        if (!cancelled) setScripted(true)
      }
    })()
    return () => { cancelled = true }
  }, [scripted, noteText])

  // After "Okay!" the beam fades out, then the fog lifts onto the marked change.
  useEffect(() => {
    if (!hasHeard) return
    const lift = window.setTimeout(() => onCloseRef.current(change.current), scripted ? RECIPE_CHANGE_FADE_MS : RECIPE_CHANGE_FADE_MS + 1200)
    return () => window.clearTimeout(lift)
  }, [hasHeard, scripted])

  // The bot sits where it did while recording, at the bottom middle, so the row of words lines up with it.
  useEffect(() => {
    if (root.current) setRowTop(root.current.offsetHeight * 0.96 - BLOB_SIZE / 2)
  }, [])

  const level = useBeamLevel(levelRef)
  const leftWords = hasHeard ? (spoken ?? RECIPE_CHANGE_REPLY) : heard ? '' : 'Listening…'

  return (
    <div ref={root} className="gm-recipe-change" role="dialog" aria-label="Recipe change" aria-live="polite">
      <OrangeBeam level={level} active={!hasHeard} />
      {rowTop !== null ? (
        <>
          <span className="gm-recipe-change__blob" style={{ top: rowTop, width: BLOB_SIZE, height: BLOB_SIZE } as React.CSSProperties} aria-hidden="true">
            <MorphBot size={BLOB_SIZE} paused />
          </span>
          <span className={`gm-recipe-change__left${heard || hasHeard ? '' : ' is-first'}`} key={leftWords} style={{ top: rowTop + BLOB_SIZE / 2 }}>{leftWords}</span>
          {heard ? <span className="gm-recipe-change__right" style={{ top: rowTop + BLOB_SIZE / 2 }}>{`“${heard}”`}</span> : null}
        </>
      ) : null}
    </div>
  )
}

// The next guiding question types out in the middle of the screen, above the bot.
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
export function GrandmaMinimalPage({ onTidy, onTidyStart }: { onTidy?: () => void; onTidyStart?: () => void } = {}) {
  const recorder = useVoiceRecorder({ transcribeAudio, allowWithoutMicrophone: true })
  const [segmentCount, setSegmentCount] = useState(0)
  const [guidingQuestionIndex, setGuidingQuestionIndex] = useState<number | null>(null)
  const [demoName, setDemoName] = useState('')
  const [noteBody, setNoteBody] = useState('')
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
    const naming = window.setTimeout(() => setDemoName(DEMO_NAME), 7_000)
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
  const [isRippling, setIsRippling] = useState(false)

  // Tidy: a ripple clears the note, then the kitchen hands over to the Grandkids recipe.
  const tidy = () => {
    onTidyStart?.()
    setDoneView('tidy')
    setIsRippling(true)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => onTidy?.(), reducedMotion ? 0 : RIPPLE_MS)
    window.setTimeout(() => setIsRippling(false), (reducedMotion ? 0 : RIPPLE_MS) + 900)
  }
  const [changes, setChanges] = useState<StoryChange[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isRecipeListening, setIsRecipeListening] = useState(false)
  const [isRecipeChangeDone, setIsRecipeChangeDone] = useState(false)
  const markRecipeChangeDone = useCallback(() => setIsRecipeChangeDone(true), [])
  const applyRecipeChange = useCallback((change?: StoryChange) => {
    setIsRecipeListening(false)
    if (!change) {
      setDoneView(null)
      setIsRecipeChangeDone(false)
      return
    }
    setIsSearching(true)
    setChanges([change])
    setDoneView(null)
    setIsRecipeChangeDone(false)
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
    // Scrolling up to read stops the follow; scrolling back to the bottom picks it up again.
    let stuck = true
    const onScroll = () => { stuck = box.scrollHeight - box.scrollTop - box.clientHeight < 28 }
    box.addEventListener('scroll', onScroll, { passive: true })
    const follow = new ResizeObserver(() => {
      if (isFollowing.current && stuck) box.scrollTop = box.scrollHeight
      setIsStoryOverflowing(box.scrollHeight > box.clientHeight)
    })
    follow.observe(content)
    return () => {
      follow.disconnect()
      box.removeEventListener('scroll', onScroll)
    }
  }, [hasStory])

  const isDone = recorder.hasCompletedRecording
  const openRecipeChange = useCallback(() => {
    setDoneView('changes')
    setIsRecipeChangeDone(false)
    setIsRecipeListening(true)
  }, [])
  // Once the note is finished, “Hey Popo” opens Recipe change by voice.
  const wake = useHeyPopo({ onWake: openRecipeChange, paused: !isDone || isRecipeListening })
  const armWake = wake.arm
  useEffect(() => { if (isDone) armWake() }, [isDone, armWake])
  const recordingLevel = useBeamLevel(recorder.levelRef)

  return (
    <HomeViewFrame label="Grandma HomeView" className={`grandma-homeview grandma-minimal${isRippling ? ' is-rippling' : ''}`}>
      <div className="gm-sheet">
      <div className="gm-mosaic" aria-hidden="true">{MOSAIC.map((cell, i) => <span key={i} style={{ background: cell.color, animationDelay: `${cell.delay}ms` }} />)}</div>
      <section className={`gm-note${isCameraOpen ? ' is-beside-camera' : ''}${isRecording ? ' is-recording' : ''}`} aria-label="Note">
        <div className="gm-note__head">
          {demoName ? (
            <TypedTitle text={DEMO_TITLE} />
          ) : isDone ? (
            <h1 className="gm-note__title">{DEMO_TITLE}</h1>
          ) : (
            <TitlePreview />
          )}
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
            <LineIcon name={isPaused ? 'play' : 'pause'} />
          </button>
          <button className="grandma-waveform__stop" type="button" aria-label="Stop recording" onClick={recorder.toggle}>
            <LineIcon name="stop" />
          </button>
        </div>
      ) : null}
      {isDone ? (
        <div className="gm-done-bar">
          <div className="gm-controls gm-controls--done" role="group" aria-label="Story">
            <button className={`gm-recipe-change-button${isRecipeChangeDone ? ' is-done' : ''}`} type="button" aria-pressed={doneView === 'changes'} onClick={openRecipeChange}>
              <span className="gm-recipe-change-button__default"><ArrowsClockwise size={22} aria-hidden="true" /><span>Recipe change</span></span>
              <Check className="gm-recipe-change-button__done" size={27} weight="bold" aria-label="Done" />
            </button>
            <button type="button" aria-pressed={doneView === 'tidy'} onClick={tidy}>Tidy</button>
          </div>
        </div>
      ) : null}
      {isRecording ? <CameraButton onCapture={addPhoto} onOpenChange={setIsCameraOpen} /> : null}
      {isRecording ? <div className="gm-recording-beam" aria-hidden="true"><OrangeBeam level={recordingLevel} active={!isPaused} /></div> : null}
      {isRecording ? <ListeningClay isPaused={isPaused} /> : null}
      {isRecipeListening ? <RecipeChangeOverlay levelRef={recorder.levelRef} noteText={noteText} onClose={applyRecipeChange} onHeard={markRecipeChangeDone} /> : null}
      {guidingQuestionIndex !== null ? (
        <TypedQuestion text={guidingQuestions[guidingQuestionIndex]} />
      ) : null}
      </div>
    </HomeViewFrame>
  )
}
