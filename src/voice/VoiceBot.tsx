'use client'

import { useEffect, useState } from 'react'
import { MorphBot } from '@/grandma/MorphBot'
import type { ClayPlace } from '@/clay/VoiceClay'

// The same size as the bot on the Grandma screen; while it is changing the amounts it shrinks to a small hopper.
const ISLAND_SIZE = 96
const ROW_SCALE = 0.25
const TEAL = '#16b8b3'

/**
 * The bot that stands where the clay used to: in the middle of the island while it listens, then hopping onto each amount it
 * changes. It starts orange and turns teal once the change is being made.
 */
export function VoiceBot({ place, teal }: { place: ClayPlace; teal: boolean }) {
  // Kept on screen for a moment after it is sent away, so it can shrink out.
  const [last, setLast] = useState<NonNullable<ClayPlace> | null>(place)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (place) {
      setLast(place)
      setLeaving(false)
      return
    }
    setLeaving(true)
    const gone = window.setTimeout(() => setLast(null), 420)
    return () => window.clearTimeout(gone)
  }, [place])

  if (!last) return null
  const scale = leaving ? 0 : last.kind === 'row' ? ROW_SCALE : 1
  return (
    <span
      className={`hv-voicebot${leaving ? ' is-leaving' : ''}`}
      style={{ left: last.at.x, top: last.at.y, width: ISLAND_SIZE, height: ISLAND_SIZE, transform: `translate(-50%, -50%) scale(${scale})` }}
      aria-hidden="true"
    >
      <MorphBot size={ISLAND_SIZE} color={teal ? TEAL : '#ff4d0d'} />
    </span>
  )
}
