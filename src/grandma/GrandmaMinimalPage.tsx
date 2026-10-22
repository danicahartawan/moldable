'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowsClockwise, Check } from '@phosphor-icons/react'
import { MorphBot } from './MorphBot'
import { listen, transcribe } from '../voice/capture'
import { speakReply } from './speakReply'
import { RECIPE_EVENT, latestRecipe, requestChange } from '../recipe/client'
import type { RecipeDoc, RecipeOp } from '../recipe/model'
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
import { GooSegmented } from '@/goo/GooSegmented'
import { prefersReduced } from '@/goo/springs'
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
  // A question the assistant is waiting for a yes or no to.
  const [question, setQuestion] = useState<string | null>(null)
  const [scripted, setScripted] = useState(() => !canListen())
  const root = useRef<HTMLDivElement>(null)
  const [rowTop, setRowTop] = useState<number | null>(null)
  const change = useRef<StoryChange | undefined>(undefined)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onHeardRef = useRef(onHeard)
  onHeardRef.current = onHeard
  const noteRef = useRef(noteText)
  noteRef.current = noteText

  // The demo: five seconds in which she asks for pork to become beef.
  useEffect(() => {
    if (!scripted) return
    change.current = DEMO_CHANGE
    // The demo request is made for real too, so the swap is saved on the server and the Grandkids screen can show it.
    void requestChange({ transcript: 'Yes', from: 'grandma', note: noteRef.current, pending: [{ type: 'swap_word', find: 'pork', replace: 'beef' }] }).catch(() => {})
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

  // The real thing: she speaks, the assistant asks whether it understood, she says yes, and only then is the story changed.
  useEffect(() => {
    if (scripted) return
    let cancelled = false
    ;(async () => {
      try {
        let pending: RecipeOp[] = []
        for (let round = 0; round < 3; round++) {
          const recording = await listen()
          if (cancelled) return
          if (!recording) {
            onCloseRef.current()
            return
          }
          const transcript = await transcribe(recording)
          if (cancelled) return
          if (!transcript) {
            setQuestion(null)
            setSpoken('I didn’t catch that.')
            setHasHeard(true)
            return
          }
          setHeard(transcript)
          setQuestion(null)
          const edit = await requestChange({ transcript, from: 'grandma', note: noteRef.current, pending })
          if (cancelled) return
          if (edit.action === 'confirm') {
            pending = edit.ops
            setQuestion(edit.reply)
            await speakReply(edit.reply)
            continue
          }
          if (edit.swap) change.current = { find: edit.swap.find, replace: edit.swap.replace }
          setSpoken(edit.reply)
          setHasHeard(true)
          if (change.current) onHeardRef.current?.()
          await speakReply(edit.reply)
          return
        }
        onCloseRef.current()
      } catch {
        // No microphone after all (blocked or missing): play the demo.
        if (!cancelled) setScripted(true)
      }
    })()
    return () => { cancelled = true }
  }, [scripted])

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
  const leftWords = hasHeard ? (spoken ?? RECIPE_CHANGE_REPLY) : question ?? (heard ? '' : 'Listening…')

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
export function GrandmaMinimalPage({ onTidy, onTidyStart, active = true }: { onTidy?: () => void; onTidyStart?: () => void; active?: boolean } = {}) {
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
  const [cameraSlot, setCameraSlot] = useState<HTMLSpanElement | null>(null)
  // Recipe change opens the fog overlay; Tidy only shows it's chosen for now.
  const [doneView, setDoneView] = useState<'changes' | 'tidy' | null>(null)
  const [isRippling, setIsRippling] = useState(false)

  // Tidy: the switch's thumb flows over to it first, then the ripple starts once it has landed.
  const chooseTidy = () => {
    if (doneView === 'tidy') return
    setDoneView('tidy')
    window.setTimeout(tidy, prefersReduced() ? 0 : 380)
  }
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
  // Scrolling up to reread lets go of the newest line; scrolling back down to the end picks it up again.
  const isFollowing = useRef(true)
  isFollowing.current = !recorder.hasCompletedRecording
  useEffect(() => {
    const box = story.current
    const content = box?.firstElementChild
    if (!box || !content) return
    // Scrolling up to read stops the follow; scrolling back to the bottom picks it up again.
    let stuck = true
    const onScroll = () => {
      stuck = box.scrollHeight - box.scrollTop - box.clientHeight < 28
      // Scrolled right back to the start, nothing is hidden above, so the top fade lifts (data-top, see the CSS).
      if (box.scrollTop < 4) box.dataset.top = ''
      else delete box.dataset.top
    }
    box.addEventListener('scroll', onScroll, { passive: true })
    const follow = new ResizeObserver(() => {
      if (isFollowing.current && stuck) box.scrollTop = box.scrollHeight
      setIsStoryOverflowing(box.scrollHeight > box.clientHeight)
    })
    box.addEventListener('scroll', onScroll, { passive: true })
    follow.observe(content)
    return () => {
      follow.disconnect()
      box.removeEventListener('scroll', onScroll)
    }
  }, [hasStory])

  const isDone = recorder.hasCompletedRecording
  // The recipe is shared: a swap made on the server (here, or from the Grandkids screen) shows in the finished story.
  const syncingRef = useRef({ isDone, isRecipeListening })
  syncingRef.current = { isDone, isRecipeListening }
  const newestDoc = useRef<RecipeDoc | null>(latestRecipe())
  const shownRev = useRef<number | null>(null)
  const followEdits = useCallback(() => {
    const doc = newestDoc.current
    if (!doc || doc.rev === shownRev.current || !syncingRef.current.isDone || syncingRef.current.isRecipeListening) return
    shownRev.current = doc.rev
    setChanges((current) => (JSON.stringify(current) === JSON.stringify(doc.storyEdits) ? current : doc.storyEdits))
  }, [])
  useEffect(() => {
    const onRecipe = (event: Event) => {
      newestDoc.current = (event as CustomEvent<RecipeDoc>).detail
      followEdits()
    }
    window.addEventListener(RECIPE_EVENT, onRecipe)
    return () => window.removeEventListener(RECIPE_EVENT, onRecipe)
  }, [followEdits])
  useEffect(() => { if (isDone && !isRecipeListening) followEdits() }, [isDone, isRecipeListening, followEdits])
  const openRecipeChange = useCallback(() => {
    setDoneView('changes')
    setIsRecipeChangeDone(false)
    setIsRecipeListening(true)
  }, [])
  // Once the note is finished, “Hey Popo” opens Recipe change by voice.
  const wake = useHeyPopo({ onWake: openRecipeChange, paused: !isDone || isRecipeListening || !active })
  const armWake = wake.arm
  useEffect(() => { if (isDone) armWake() }, [isDone, armWake])
  const recordingLevel = useBeamLevel(recorder.levelRef)

  return (
    <HomeViewFrame label="Grandma HomeView" className={`grandma-homeview grandma-minimal${isRippling ? ' is-rippling' : ''}`}>
      <div className="gm-sheet">
      <div className="gm-ripple" aria-hidden="true"><span /><span /><span /></div>
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
          {/* Camera and pause share a goo filter (only while the camera morphs), so it melts into pause and buds back out. */}
          <svg className="gm-controls__defs" width="0" height="0" aria-hidden="true" focusable="false">
            <filter id="gm-controls-goo" x="-20%" y="-40%" width="140%" height="180%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
              <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g" />
              <feComposite in="SourceGraphic" in2="g" operator="atop" />
            </filter>
          </svg>
          <span className="gm-controls__goo">
          {/* The camera sits first in the pill (CameraButton puts its button here). */}
          <span ref={setCameraSlot} className="gm-controls__camera" />
          <button className="grandma-waveform__pause" type="button" aria-label={isPaused ? 'Resume recording' : 'Pause recording'} aria-pressed={isPaused} onClick={recorder.togglePause}>
            <LineIcon name={isPaused ? 'play' : 'pause'} />
          </button>
          </span>
          <button className="grandma-waveform__stop" type="button" aria-label="Stop recording" onClick={recorder.toggle}>
            <LineIcon name="stop" />
          </button>
        </div>
      ) : null}
      {isDone ? (
        <div className="gm-done-bar">
          {/* One liquid switch, like Tidy / Oma's words: the orange thumb flows to the chosen action (tap or slide). */}
          <GooSegmented className="gm-controls gm-controls--done" aria-label="Story" value={doneView === 'tidy' ? 'tidy' : 'changes'}
            onChange={(v) => (v === 'tidy' ? chooseTidy() : openRecipeChange())}
            options={[
              {
                value: 'changes',
                className: `gm-recipe-change-button${doneView === 'changes' ? ' is-listening' : ''}${isRecipeChangeDone ? ' is-done' : ''}`,
                label: (
                  <>
                    <span className="gm-recipe-change-button__default"><ArrowsClockwise size={22} aria-hidden="true" /><span>Recipe change</span></span>
                    <Check className="gm-recipe-change-button__done" size={27} weight="bold" aria-label="Done" />
                  </>
                ),
              },
              { value: 'tidy', label: 'Tidy' },
            ]} />
        </div>
      ) : null}
      {isRecording ? <CameraButton onCapture={addPhoto} onOpenChange={setIsCameraOpen} slot={cameraSlot} /> : null}
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
