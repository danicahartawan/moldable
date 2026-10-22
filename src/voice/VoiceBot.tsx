'use client'

import { useEffect, useRef, useState } from 'react'
import { MorphBot } from '@/grandma/MorphBot'
import type { ClayPlace } from '@/clay/VoiceClay'
import type { Vec } from '@/clay/ClaySim'

// The same size as the bot on the Grandma screen; while it is changing the amounts it shrinks to a small hopper.
const ISLAND_SIZE = 96
const ROW_SCALE = 0.25
const TEAL = '#16b8b3'
const ORANGE = '#ff4d0d'
const TURN_MS = 1100

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (from: string, to: string, t: number) => {
  const a = channels(from)
  const b = channels(to)
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * The bot that stands where the clay used to: in the middle of the island while it listens, then hopping onto each amount it
 * changes. It starts orange and turns teal once the change is being made.
 */
export function VoiceBot({ place, teal, from }: { place: ClayPlace; teal: boolean; from?: Vec | null }) {
  // Kept on screen for a moment after it is sent away, so it can shrink out.
  const [last, setLast] = useState<NonNullable<ClayPlace> | null>(place)
  const [leaving, setLeaving] = useState(false)
  // It comes out of the button that started it (`from`), then travels to where it listens.
  const [launched, setLaunched] = useState(false)
  // The colour glides between orange and teal instead of switching.
  const [color, setColor] = useState(teal ? TEAL : ORANGE)
  const colorNow = useRef(color)
  colorNow.current = color
  useEffect(() => {
    const target = teal ? TEAL : ORANGE
    const from = colorNow.current
    if (from === target) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setColor(target)
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TURN_MS)
      setColor(mix(from, target, ease(t)))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [teal])
  useEffect(() => {
    if (!place) {
      setLaunched(false)
      return
    }
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setLaunched(true)))
    return () => cancelAnimationFrame(frame)
  }, [place === null])

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
  const fromButton = Boolean(from) && !launched && !leaving
  const at = fromButton && from ? from : last.at
  const scale = leaving ? 0 : fromButton ? 0.18 : last.kind === 'row' ? ROW_SCALE : 1
  return (
    <span
      className={`hv-voicebot${leaving ? ' is-leaving' : ''}`}
      style={{ left: at.x, top: at.y, width: ISLAND_SIZE, height: ISLAND_SIZE, transform: `translate(-50%, -50%) scale(${scale})` }}
      aria-hidden="true"
    >
      <MorphBot size={ISLAND_SIZE} color={color} />
    </span>
  )
}
