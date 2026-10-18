'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DotSpinner, Icon } from '../Icon'
import { useVoiceRecorder } from '../useVoiceRecorder'
import { requestGeneratedTitle, shouldGenerateTitle } from './title'
import './grandma.css'

export function GrandmaPage() {
  const recorder = useVoiceRecorder()
  const [title, setTitle] = useState('')
  const [isTitlePending, setIsTitlePending] = useState(false)
  const titleRequested = useRef(false)
  const fullTranscript = useMemo(
    () => `${recorder.transcript}${recorder.interimTranscript}`.trim(),
    [recorder.interimTranscript, recorder.transcript],
  )
  const isRecording = recorder.status === 'recording'
  const isStarting = recorder.status === 'requesting'

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
        <button
          className="grandma-record-button grandma-record-button--plain"
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
      </header>

      {recorder.errorMessage ? (
        <p className="grandma-transcript grandma-transcript--error grandma-transcript--bottom-right" role="status">{recorder.errorMessage}</p>
      ) : fullTranscript ? (
        <p className="grandma-transcript grandma-transcript--preview grandma-transcript--bottom-right" data-testid="transcript-preview" aria-live="polite">
          {recorder.transcript}<span className="grandma-transcript__interim">{recorder.interimTranscript}</span>
        </p>
      ) : isRecording ? (
        <p className="grandma-listening grandma-transcript--bottom-right" aria-live="polite">Listening…</p>
      ) : null}
    </main>
  )
}
