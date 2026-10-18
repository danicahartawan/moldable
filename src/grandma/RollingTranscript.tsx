'use client'

import { useEffect, useRef } from 'react'

type RollingTranscriptProps = {
  finalText: string
  interimText: string
  errorMessage: string | null
}

export function RollingTranscript({ finalText, interimText, errorMessage }: RollingTranscriptProps) {
  const previousFinalText = useRef('')
  const settledText = finalText.startsWith(previousFinalText.current) ? previousFinalText.current : ''
  const appendedText = finalText.slice(settledText.length)
  const accessibleText = `${finalText}${interimText}`.trim()

  useEffect(() => {
    previousFinalText.current = finalText
  }, [finalText])

  if (errorMessage) {
    return <p className="grandma-transcript grandma-rolling-transcript grandma-rolling-transcript--error" role="status">{errorMessage}</p>
  }

  if (!accessibleText) return null

  return (
    <section
      className="grandma-transcript grandma-rolling-transcript"
      aria-label="Live transcript"
      aria-live="polite"
      aria-atomic="true"
      role="region"
    >
      <span className="grandma-transcript__accessible">{accessibleText}</span>
      <span className="grandma-transcript__final" aria-hidden="true">
        {settledText ? <span className="grandma-transcript__settled">{settledText}</span> : null}
        {appendedText ? <span className="grandma-transcript__new">{appendedText}</span> : null}
      </span>
      {interimText ? <span className="grandma-transcript__interim" aria-hidden="true">{interimText}</span> : null}
    </section>
  )
}
