'use client'

import { useEffect, useRef, useState } from 'react'

type RollingTranscriptProps = {
  finalText: string
  interimText: string
  errorMessage: string | null
}

export function RollingTranscript({ finalText, interimText, errorMessage }: RollingTranscriptProps) {
  const previousFinalText = useRef('')
  const [visibleLength, setVisibleLength] = useState(0)
  const settledText = finalText.startsWith(previousFinalText.current) ? previousFinalText.current : ''
  const appendedText = finalText.slice(settledText.length, visibleLength)
  const accessibleText = `${finalText}${interimText}`.trim()

  useEffect(() => {
    const settledLength = finalText.startsWith(previousFinalText.current)
      ? previousFinalText.current.length
      : 0
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || finalText.length <= settledLength) {
      setVisibleLength(finalText.length)
      previousFinalText.current = finalText
      return
    }

    let nextLength = settledLength
    setVisibleLength(settledLength)
    const typing = window.setInterval(() => {
      nextLength += 1
      setVisibleLength(nextLength)
      if (nextLength >= finalText.length) {
        window.clearInterval(typing)
        previousFinalText.current = finalText
      }
    }, 28)

    return () => window.clearInterval(typing)
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
      <span className="grandma-transcript__visual" aria-hidden="true">
        <span className="grandma-transcript__final">
          {settledText ? <span className="grandma-transcript__settled">{settledText}</span> : null}
          {finalText.length > settledText.length ? (
            <span className="grandma-transcript__new">{appendedText}</span>
          ) : null}
        </span>
        {interimText ? <span className="grandma-transcript__interim">{interimText}</span> : null}
      </span>
    </section>
  )
}
