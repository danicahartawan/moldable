'use client'

import { forwardRef, useEffect, useRef } from 'react'
import { ClayBody, type ClayHandle } from '@/clay/ClayBody'
import type { Vec } from '@/clay/ClaySim'
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
  /** Where the clay jumps in from, in the clay box's px (e.g. the Adjust orb). Defaults to just above the card. */
  jumpFrom?: Vec
}

const STATUS: Record<GlowState, string> = {
  idle: '',
  listening: 'Listening…',
  hearing: 'Listening…',
  thinking: 'Thinking…',
  done: 'Done',
}

const CLAY_BOX = 56
const CLAY_HOME: Vec = { x: CLAY_BOX / 2, y: CLAY_BOX / 2 }
const CLAY_RADIUS = 17

/**
 * A frosted card that drops in at the top of the screen and narrates the voice request. The clay on its left
 * jumps in when it opens, is pulled longer by loud words, and is kneaded while thinking.
 */
export const VoiceNotification = forwardRef<HTMLDivElement, Props>(function VoiceNotification({ state, heard, result, teal = false, level, jumpFrom }, ref) {
  const main = state === 'done' ? result : heard ? `“${heard}”` : ''
  const clay = useRef<ClayHandle>(null)
  const wasIdle = useRef(true)

  // Opening: the clay leaps in and lands on the card with a squash.
  useEffect(() => {
    if (state === 'idle') {
      wasIdle.current = true
      return
    }
    if (!wasIdle.current) return
    wasIdle.current = false
    clay.current?.place(jumpFrom ?? { x: CLAY_HOME.x + 40, y: -60 })
    clay.current?.jump(CLAY_HOME)
  }, [state, jumpFrom])

  return (
    <div ref={ref} className="vn" data-state={state} role="status" aria-live="polite" aria-hidden={state === 'idle'}>
      <span className="vn__clay" aria-hidden="true">
        <ClayBody
          ref={clay}
          width={CLAY_BOX}
          height={CLAY_BOX}
          home={CLAY_HOME}
          radius={CLAY_RADIUS}
          color={teal ? 'teal' : 'orange'}
          level={state === 'hearing' ? level : undefined}
          knead={state === 'thinking'}
        />
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
