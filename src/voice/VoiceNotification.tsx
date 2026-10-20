'use client'

import { forwardRef, useEffect, useRef } from 'react'
import { ClayBody, type ClayHandle } from '@/clay/ClayBody'
import type { GlowState } from './SpeakingGlow'
import './voice-notification.css'

type Props = {
  state: GlowState
  /** What the person said, shown as it's heard. */
  heard: string
  /** What changed, shown when done. */
  result: string
  /** The clay turns teal once the change has been mixed in. */
  teal?: boolean
  /** Voice loudness 0–1, read every frame by the clay. */
  level?: () => number
  /**
   * Draw a clay of its own in the clay box. Turn this off when the screen draws one clay over everything
   * (the clay home view does, so the same clay can leave the island for the ingredient rows).
   */
  ownClay?: boolean
}

const STATUS: Record<GlowState, string> = {
  idle: '',
  listening: 'Listening…',
  hearing: 'Listening…',
  thinking: 'Thinking…',
  done: 'Done',
}

const CLAY_BOX = 56
const CLAY_RADIUS = 17

/** The card's own clay: mounted only while the card is open, popping in from a dot. */
function CardClay({ state, teal, level }: { state: GlowState; teal: boolean; level?: () => number }) {
  const clay = useRef<ClayHandle>(null)
  useEffect(() => {
    clay.current?.hide()
    clay.current?.appear()
  }, [])
  return (
    <ClayBody
      ref={clay}
      width={CLAY_BOX}
      height={CLAY_BOX}
      home={{ x: CLAY_BOX / 2, y: CLAY_BOX / 2 }}
      radius={CLAY_RADIUS}
      color={teal ? 'teal' : 'orange'}
      level={state === 'hearing' ? level : undefined}
      knead={state === 'thinking'}
    />
  )
}

/**
 * A frosted card that drops in at the top of the screen and narrates the voice request.
 * The clay box on its left holds the clay: its own, or space for the screen's one clay.
 */
export const VoiceNotification = forwardRef<HTMLDivElement, Props>(function VoiceNotification({ state, heard, result, teal = false, level, ownClay = true }, ref) {
  const main = state === 'done' ? result : heard ? `“${heard}”` : ''

  return (
    <div ref={ref} className="vn" data-state={state} role="status" aria-live="polite" aria-hidden={state === 'idle'}>
      <span className="vn__clay" aria-hidden="true">
        {ownClay && state !== 'idle' && <CardClay state={state} teal={teal} level={level} />}
      </span>
      <span className="vn__text">
        <span className="vn__status">{STATUS[state]}</span>
        {main ? (
          <span key={main} className={`vn__main${state === 'done' ? ' is-result' : ''}`}>{main}</span>
        ) : (
          <span className="vn__main vn__main--hint">Say what you’d like to change</span>
        )}
      </span>
    </div>
  )
})
