'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DotSpinner, Icon } from '../Icon'
import { HomeViewFrame } from '../home/HomeViewFrame'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { requestGeneratedTitle, shouldGenerateTitle } from './title'
import { transcribeAudio } from './transcribe'
import { GrandmaWritingScreen } from './GrandmaWritingScreen'
import { GuidingQuestionRail, guidingQuestions } from './GuidingQuestionRail'
import { RollingTranscript } from './RollingTranscript'
import './grandma.css'

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
    return <GrandmaWritingScreen title={title} transcript={fullTranscript} />
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
        finalText={recorder.transcript}
        interimText={recorder.interimTranscript}
        errorMessage={recorder.errorMessage}
      />
    </HomeViewFrame>
  )
}
