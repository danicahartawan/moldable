'use client'

import { useEffect, useRef, useState } from 'react'
import { DotSpinner, Icon } from '../Icon'
import { HomeViewFrame } from '../home/HomeViewFrame'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { requestGeneratedTitle, shouldGenerateTitle } from './title'
import { transcribeAudio } from './transcribe'
import { GuidingQuestionRail, guidingQuestions } from './GuidingQuestionRail'
import { RollingTranscript } from './RollingTranscript'
import './grandma.css'

const demoStorySegments = [
  'Take half an onion, garlic, chili, kencur, pepper, and lime leaves. [Blend] until it becomes a fine paste.',
  'He was helping me in the kitchen and nearly shaved the tip of his finger off trying to cut an onion—gave me such a fright.',
  'Start with one handful of ground beef and a pinch of salt.',
  'Brown it slowly until it’s deep golden, not gray. It should smell warm, savory, and a little peppery.',
] as const

export function GrandmaPage() {
  const recorder = useVoiceRecorder({ transcribeAudio })
  const [title, setTitle] = useState('')
  const [isTitlePending, setIsTitlePending] = useState(false)
  const [guidingQuestionIndex, setGuidingQuestionIndex] = useState<number | null>(null)
  const [demoTranscript, setDemoTranscript] = useState('')
  const titleRequested = useRef(false)
  const isRecording = recorder.status === 'recording'
  const isStarting = recorder.status === 'requesting'
  const hasSpokenTranscript = Boolean(recorder.transcript || recorder.interimTranscript)

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
    }, 10_000)

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

    setDemoTranscript(demoStorySegments[0])
    const transcriptTimers = demoStorySegments.slice(1).map((_, index) => window.setTimeout(() => {
      setDemoTranscript(demoStorySegments.slice(0, index + 2).join(' '))
    }, (index + 1) * 4_000))

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
        <img
          className="grandma-character"
          src="/assets/grandma-character.png"
          alt="Grandma companion"
          draggable={false}
        />
      </HomeViewFrame>
    )
  }

  return (
    <HomeViewFrame label="Grandma HomeView" className="grandma-homeview">
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
                <><Icon name="mic" size={18} /><span>Record</span></>
              )}
            </button>
          </div>
        </div>
      </header>
      <img
        className="grandma-character"
        src="/assets/grandma-character.png"
        alt="Grandma companion"
        draggable={false}
      />
      {guidingQuestionIndex !== null ? (
        <GuidingQuestionRail activeIndex={guidingQuestionIndex} />
      ) : null}
      <RollingTranscript
        finalText={hasSpokenTranscript ? recorder.transcript : demoTranscript}
        interimText={hasSpokenTranscript ? recorder.interimTranscript : ''}
        errorMessage={recorder.errorMessage}
      />
    </HomeViewFrame>
  )
}
