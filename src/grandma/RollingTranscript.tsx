'use client'

import { Fan, Oven, Scales, Thermometer, Timer, type Icon, type IconWeight } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { ToolId } from '../home/ToolRail'

type RollingTranscriptProps = {
  finalText: string
  interimText: string
  errorMessage: string | null
  onToolMarkerComplete?: (tool: ToolId) => void
  toolIconWeight?: IconWeight
}

const transcriptTools: Record<string, { id: ToolId; Icon: Icon }> = {
  Blend: { id: 'blend', Icon: Fan },
  Microwave: { id: 'microwave', Icon: Oven },
  Temperature: { id: 'temperature', Icon: Thermometer },
  Timer: { id: 'timer', Icon: Timer },
  Weigh: { id: 'weigh', Icon: Scales },
}

const toolMarkerPattern = /(\[(?:Blend|Microwave|Temperature|Timer|Weigh)\])/g

export function renderTranscriptText(text: string, iconWeight: IconWeight = 'regular') {
  return text.split(toolMarkerPattern).map((segment, index) => {
    const label = segment.startsWith('[') && segment.endsWith(']') ? segment.slice(1, -1) : ''
    const tool = transcriptTools[label]
    if (!tool) return segment

    const ToolIcon = tool.Icon
    return (
      <span className="grandma-transcript-tool-chip" data-tool={tool.id} key={`${label}-${index}`}>
        <ToolIcon size={19} weight={iconWeight} />
        <span className="grandma-transcript-tool-chip__label">{label}</span>
      </span>
    )
  })
}

export function RollingTranscript({ finalText, interimText, errorMessage, onToolMarkerComplete, toolIconWeight }: RollingTranscriptProps) {
  const previousFinalText = useRef('')
  const announcedMarkers = useRef(new Set<string>())
  const [visibleLength, setVisibleLength] = useState(0)
  const settledText = finalText.startsWith(previousFinalText.current) ? previousFinalText.current : ''
  const appendedText = finalText.slice(settledText.length, visibleLength)
  const accessibleText = `${finalText}${interimText}`.replace(/\[([^\]]+)\]/g, '$1').trim()

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

  useEffect(() => {
    const visibleText = finalText.slice(0, visibleLength)
    for (const match of visibleText.matchAll(/\[(Blend|Microwave|Temperature|Timer|Weigh)\]/g)) {
      const tool = transcriptTools[match[1]]
      const markerKey = `${tool.id}:${match.index}`
      if (announcedMarkers.current.has(markerKey)) continue
      announcedMarkers.current.add(markerKey)
      onToolMarkerComplete?.(tool.id)
    }
  }, [finalText, onToolMarkerComplete, visibleLength])

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
          {settledText ? (
            <span className="grandma-transcript__settled">{renderTranscriptText(settledText, toolIconWeight)}</span>
          ) : null}
          {finalText.length > settledText.length ? (
            <span className="grandma-transcript__new">{renderTranscriptText(appendedText, toolIconWeight)}</span>
          ) : null}
        </span>
        {interimText ? (
          <span className="grandma-transcript__interim">{renderTranscriptText(interimText, toolIconWeight)}</span>
        ) : null}
      </span>
    </section>
  )
}
