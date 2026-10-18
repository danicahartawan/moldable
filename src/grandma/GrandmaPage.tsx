'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DotSpinner, Icon } from '../Icon'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { requestGeneratedTitle, shouldGenerateTitle } from './title'
import { transcribeAudio } from './transcribe'
import './grandma.css'

const guidingQuestions = [
  'What color should it be?',
  'What should it smell like?',
  'What should it taste like?',
  'What would you tell the people making it?',
]

function TypedTranscript({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState('')

  useEffect(() => {
    if (!text) {
      setVisibleText('')
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisibleText(text)
      return
    }
    if (visibleText === text) return

    const timeout = window.setTimeout(() => {
      setVisibleText((current) => {
        if (!text.startsWith(current)) return text.slice(0, 1)
        return text.slice(0, current.length + 1)
      })
    }, 22)
    return () => window.clearTimeout(timeout)
  }, [text, visibleText])

  return <>{visibleText}</>
}

export function GrandmaPage() {
  const recorder = useVoiceRecorder({ transcribeAudio })
  const [title, setTitle] = useState('')
  const [isTitlePending, setIsTitlePending] = useState(false)
  const [guidingQuestionIndex, setGuidingQuestionIndex] = useState<number | null>(null)
  const titleRequested = useRef(false)
  const fullTranscript = useMemo(
    () => `${recorder.transcript}${recorder.interimTranscript}`.trim(),
    [recorder.interimTranscript, recorder.transcript],
  )
  const isRecording = recorder.status === 'recording'
  const isStarting = recorder.status === 'requesting'

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
      }, 12_000)
    }, 30_000)

    return () => {
      window.clearTimeout(firstQuestion)
      if (rotation !== undefined) window.clearInterval(rotation)
    }
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
      <main className="grandma-story" aria-label="Grandma transcript">
        <div className="grandma-story__body">
          {title ? <h1>{title}</h1> : null}
          <p className="grandma-story__transcript" data-testid="complete-transcript">
            {fullTranscript || 'No transcript was captured in this browser.'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="grandma-canvas" aria-label="Record grandma">
      <header className="grandma-header grandma-header--right" data-testid="grandma-header">
        {title ? (
          <h1 className="grandma-generated-title">{title}</h1>
        ) : isTitlePending ? (
          <p className="grandma-generated-title grandma-generated-title--pending" aria-live="polite">Naming this story…</p>
        ) : null}
        <div className="grandma-recorder-stack" data-testid="grandma-recorder-stack">
          <div className="grandma-recorder-control" data-testid="grandma-recorder-control">
            {isRecording ? (
              <img
                className="grandma-character"
                src="/assets/grandma-character.png"
                alt="Grandma character"
                draggable={false}
              />
            ) : null}
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

          {recorder.errorMessage ? (
            <p className="grandma-transcript grandma-transcript--error grandma-transcript--under-control" role="status">{recorder.errorMessage}</p>
          ) : fullTranscript ? (
            <p className="grandma-transcript grandma-transcript--preview grandma-transcript--under-control" data-testid="transcript-preview" aria-live="polite">
              <TypedTranscript text={fullTranscript} />
            </p>
          ) : null}
        </div>
      </header>
      {guidingQuestionIndex !== null ? (
        <p className="grandma-guiding-question" aria-live="polite" key={guidingQuestionIndex}>
          {guidingQuestions[guidingQuestionIndex]}
        </p>
      ) : null}
    </main>
  )
}
