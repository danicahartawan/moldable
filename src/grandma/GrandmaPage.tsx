'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DotSpinner, RecordIcon } from '../Icon'
import { HomeViewFrame } from '../home/HomeViewFrame'
import { ToolRail, type ToolId } from '../home/ToolRail'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { requestGeneratedTitle, shouldGenerateTitle } from './title'
import { transcribeAudio } from './transcribe'
import { GuidingQuestionRail, guidingQuestions } from './GuidingQuestionRail'
import { RollingTranscript } from './RollingTranscript'
import { GrandmaTranscriptScreen } from './GrandmaTranscriptScreen'
import './grandma.css'

const demoStorySegments = [
  'Take half an onion, garlic, chili, kencur, pepper, and lime leaves. [Blend] until it becomes a fine paste.',
  'Don’t make it completely watery. You should still see a little texture. That is what gives the lawar its character.',
  'Now take one good handful of ground beef. [Weigh] this for me, because my handful might be different from yours.',
  'Traditionally, some families use pork, but this is how I make it for you.',
  'I remember making this when Nev was small. He wanted to help cut the onion and nearly shaved the tip of his finger off. I shouted so loudly that everyone came running into the kitchen.',
  'He was maybe seven, old enough to argue with me, but not old enough for that knife.',
  'Next, toast the grated coconut in a dry pan. Keep moving it because coconut burns very quickly. [Timer] Check it after two minutes, but trust the color more than the clock.',
  'At first, it smells sweet and soft. Then it becomes nutty, and the color turns golden brown. If it becomes dark brown, you have gone too far.',
  'Put a little oil into the pan and sauté the remaining onion. Add the garlic and the spice paste.',
  'Listen to it. At first, it sounds wet. When the sound becomes sharper and the oil begins to separate, the spices are cooked.',
  'It should smell warm, savory, and a little peppery. You should smell the lime leaves too. If it only smells like raw onion, give it more time.',
  'Add the ground beef. [Temperature] Keep the pan hot enough to brown the meat instead of steaming it.',
  'Break it apart with the spoon, but don’t keep stirring every second. Leave it against the pan long enough for the edges to become deep golden, not gray.',
  'Add one pinch of salt. My pinch, not Nev’s pinch. He always adds too much.',
  'When the meat is cooked, mix in the toasted coconut. Add finely sliced green beans and some fresh chives.',
  'The beans should stay a little crisp because lawar needs texture. It should not become one soft mixture.',
  'Turn off the heat, then squeeze in a little lime juice.',
  'Taste it. It should be savory first, then fragrant, a little spicy, and fresh at the end. If it tastes heavy, add more lime. If it tastes flat, add one more small pinch of salt.',
  'Look at the color. You want golden coconut, browned meat, green beans, and little pieces of chili throughout. It should look alive, not pale and wet.',
  'Serve it while it is still warm with white rice. At home, we would put everything in the middle of the table and let everyone take what they wanted.',
  'That is how I make lawar. Maybe it is not exactly how another family makes it, but that is the point.',
  'Every family has its own version.',
  'This one is ours.',
] as const

const DEMO_REPLY_DELAY = 10_000
const DEMO_REPLY_GAP = 3_200
const DEMO_REPLY_FIRST = 'No, you didn’t.'
const DEMO_REPLY_SECOND = 'No, you didn’t! You were just so eager to cut the onions. Grandma said, “Slow down, little one. The knife has more patience than you do.”'

async function speakReply(text: string) {
  if (typeof Audio === 'undefined' || typeof fetch === 'undefined') return
  try {
    const response = await fetch('/api/grandkids/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) return
    const audio = new Audio(URL.createObjectURL(await response.blob()))
    audio.onended = () => URL.revokeObjectURL(audio.src)
    await audio.play()
  } catch {
    // The typed reply still shows when the voice is unavailable.
  }
}

const toolLabels: Record<ToolId, string> = {
  blend: 'Blend',
  microwave: 'Microwave',
  temperature: 'Temperature',
  timer: 'Timer',
  weigh: 'Weigh',
}

export function GrandmaPage() {
  const recorder = useVoiceRecorder({ transcribeAudio, allowWithoutMicrophone: true })
  const [title, setTitle] = useState('')
  const [isTitlePending, setIsTitlePending] = useState(false)
  const [guidingQuestionIndex, setGuidingQuestionIndex] = useState<number | null>(null)
  const [demoTranscript, setDemoTranscript] = useState('')
  const [activatedTool, setActivatedTool] = useState<ToolId | null>(null)
  const [flyingTool, setFlyingTool] = useState<{ id: ToolId; key: number } | null>(null)
  const flightSequence = useRef(0)
  const titleRequested = useRef(false)
  const isRecording = recorder.status === 'recording'
  const isStarting = recorder.status === 'requesting'
  const hasSpokenTranscript = Boolean(recorder.transcript || recorder.interimTranscript)
  const pullToolIntoShelf = useCallback((tool: ToolId) => {
    setActivatedTool(tool)
    flightSequence.current += 1
    setFlyingTool({ id: tool, key: flightSequence.current })
  }, [])

  useEffect(() => {
    if (!flyingTool) return
    const clearFlight = window.setTimeout(() => setFlyingTool(null), 1150)
    return () => window.clearTimeout(clearFlight)
  }, [flyingTool])

  useEffect(() => {
    if (!isRecording) {
      setGuidingQuestionIndex(null)
      return
    }

    let rotation: number | undefined
    const firstQuestion = window.setTimeout(() => {
      setGuidingQuestionIndex(0)
      rotation = window.setInterval(() => {
        setGuidingQuestionIndex((current) => current === null ? current : (current + 1) % guidingQuestions.length)
      }, 10_000)
    }, 2_000)

    return () => {
      window.clearTimeout(firstQuestion)
      if (rotation !== undefined) window.clearInterval(rotation)
    }
  }, [isRecording])

  useEffect(() => {
    if (!isRecording) {
      setDemoTranscript('')
      return
    }

    // Grandma gives one sentence, then goes quiet so the cook can ask about the finger.
    setDemoTranscript(demoStorySegments[0])
    const reply = (text: string) => {
      setDemoTranscript((current) => `${current} ${text}`)
      void speakReply(text)
    }
    const transcriptTimers = [
      window.setTimeout(() => reply(DEMO_REPLY_FIRST), DEMO_REPLY_DELAY),
      window.setTimeout(() => reply(DEMO_REPLY_SECOND), DEMO_REPLY_DELAY + DEMO_REPLY_GAP),
    ]

    return () => transcriptTimers.forEach((timer) => window.clearTimeout(timer))
  }, [isRecording])

  useEffect(() => {
    if (titleRequested.current || !shouldGenerateTitle(recorder.transcript)) return
    titleRequested.current = true
    setIsTitlePending(true)
    void requestGeneratedTitle(recorder.transcript)
      .then((nextTitle) => {
        setTitle(nextTitle)
        setIsTitlePending(false)
      })
      .catch(() => {
        titleRequested.current = false
        setIsTitlePending(false)
      })
  }, [recorder.transcript])

  if (recorder.hasCompletedRecording) {
    return (
      <HomeViewFrame label="Grandma story HomeView" className="grandma-homeview grandma-handoff">
        <GrandmaTranscriptScreen
          title={title}
          transcript={recorder.transcript || demoStorySegments.join(' ')}
        />
      </HomeViewFrame>
    )
  }

  return (
    <HomeViewFrame label="Grandma HomeView" className="grandma-homeview">
      <ToolRail activatedTool={activatedTool} />
      {flyingTool ? (
        <span
          className="grandma-tool-flight"
          data-tool={flyingTool.id}
          aria-hidden="true"
          key={flyingTool.key}
        >
          {toolLabels[flyingTool.id]}
        </span>
      ) : null}
      <header className="grandma-header grandma-header--right" data-testid="grandma-header">
        {title ? (
          <h1 className="grandma-generated-title">{title}</h1>
        ) : isTitlePending ? (
          <p className="grandma-generated-title grandma-generated-title--pending" aria-live="polite">Naming this story…</p>
        ) : null}
        <div className="grandma-recorder-stack" data-testid="grandma-recorder-stack">
          <div className="grandma-recorder-control" data-testid="grandma-recorder-control">
            <button
              className="grandma-record-button grandma-record-button--plain grandma-record-button--embossed"
              type="button"
              aria-label={isRecording ? 'Stop recording' : 'Record'}
              aria-pressed={isRecording}
              disabled={isStarting || recorder.status === 'stopping'}
              onClick={recorder.toggle}
            >
              {isStarting ? (
                <><DotSpinner /><span>Starting</span></>
              ) : isRecording ? (
                <><span className="grandma-record-button__dot" /><span>Stop</span></>
              ) : (
                <><RecordIcon size={30} /><span>Record</span></>
              )}
            </button>
          </div>
          <img
            className="grandma-character"
            src="/assets/mascot-blue.png"
            alt="Grandma companion"
            draggable={false}
          />
        </div>
      </header>
      {guidingQuestionIndex !== null ? (
        <GuidingQuestionRail activeIndex={guidingQuestionIndex} />
      ) : null}
      <RollingTranscript
        finalText={hasSpokenTranscript ? recorder.transcript : demoTranscript}
        interimText={hasSpokenTranscript ? recorder.interimTranscript : ''}
        errorMessage={recorder.errorMessage}
        onToolMarkerComplete={pullToolIntoShelf}
      />
    </HomeViewFrame>
  )
}
