'use client'

import { forwardRef } from 'react'
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
}

const STATUS: Record<GlowState, string> = {
  idle: '',
  listening: 'Listening…',
  hearing: 'Listening…',
  thinking: 'Thinking…',
  done: 'Done',
}

/**
 * A frosted card that drops in at the top of the screen and narrates the voice request,
 * with a lump of clay on its left that swells and squashes with the voice (--sg-level, mirrored from SpeakingGlow).
 */
export const VoiceNotification = forwardRef<HTMLDivElement, Props>(function VoiceNotification({ state, heard, result, teal = false }, ref) {
  const main = state === 'done' ? result : heard ? `“${heard}”` : ''

  return (
    <div ref={ref} className="vn" data-state={state} role="status" aria-live="polite" aria-hidden={state === 'idle'}>
      <span className="vn__clay" aria-hidden="true">
        <span className="vn__voice">
          <span className={`vn__lump${teal ? ' is-teal' : ''}`} />
        </span>
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
