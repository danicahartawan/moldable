'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ClayBody, type ClayHandle } from './ClayBody'
import { DEFAULT_TUNING, type ClayTuning, type Vec } from './ClaySim'
import './voice-clay.css'

/** Where the clay should be, worked out from the voice state. `null` means no voice session: no clay. */
export type ClayPlace = { kind: 'island'; at: Vec } | { kind: 'row'; at: Vec } | null

type Props = {
  place: ClayPlace
  /** The session was cancelled: leave quickly (~250 ms), with no done step. */
  quickExit?: boolean
  /** Voice loudness 0–1, read every frame. */
  level?: () => number
  knead?: boolean
  color?: 'orange' | 'teal'
  /** Drawing area in px (the screen). */
  width: number
  height: number
}

const RADIUS = 17
// On an ingredient row it compacts to a smaller lump, and stretches less so crossing a long way it stays a lump.
const ROW_SIZE = 0.6
const ROW_TUNING: Partial<ClayTuning> = { maxStretch: 1, volume: 0.6 }
const ISLAND_TUNING: Partial<ClayTuning> = { maxStretch: DEFAULT_TUNING.maxStretch, volume: DEFAULT_TUNING.volume }
// How long each exit takes before the clay is unmounted (and its animation loop stops).
const EXIT_MS = { soft: 650, quick: 300, fade: 340, reduced: 160 }

type Exit = keyof typeof EXIT_MS

/**
 * The one clay on the home view. It only exists during a voice session: it pops into the listening island,
 * reacts to the voice, may hop out to crawl along ingredient rows, and leaves when the session ends —
 * shrinking away from the island, fading where it is on a row, or going at once when cancelled.
 * If voice comes back while it's leaving, it turns round and stays.
 */
export function VoiceClay({ place, quickExit = false, level, knead = false, color = 'orange', width, height }: Props) {
  const [mounted, setMounted] = useState(place !== null)
  const [exit, setExit] = useState<Exit | null>(null)
  const clay = useRef<ClayHandle>(null)
  const last = useRef<ClayPlace>(null)
  const exitTimer = useRef<number | undefined>(undefined)
  const reduced = useRef(false)
  const leaving = useRef(false)

  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    return () => window.clearTimeout(exitTimer.current)
  }, [])

  // Voice starts (or comes back while leaving): mount it, or turn the exit round.
  useEffect(() => {
    if (place === null) return
    window.clearTimeout(exitTimer.current)
    setExit(null)
    setMounted(true)
  }, [place])

  // Follow the place: pop in, hop between island and rows, crawl from row to row.
  useLayoutEffect(() => {
    const c = clay.current
    if (!c || place === null) return
    const prev = last.current
    last.current = place
    if (prev === null) {
      c.setRestSize(place.kind === 'row' ? ROW_SIZE : 1)
      c.setTuning(place.kind === 'row' ? ROW_TUNING : ISLAND_TUNING)
      c.place(place.at)
      c.hide()
      c.appear()
      return
    }
    // Wanted again while leaving: turn round (it grows back from wherever it had shrunk to).
    if (leaving.current) {
      leaving.current = false
      c.appear()
    }
    if (prev.kind === 'island' && place.kind === 'row') {
      c.setRestSize(ROW_SIZE)
      c.setTuning(ROW_TUNING)
      c.jump(place.at)
    } else if (prev.kind === 'row' && place.kind === 'row') {
      if (prev.at.x !== place.at.x || prev.at.y !== place.at.y) c.crawl(place.at, { x: 0, y: 1 })
    } else if (place.kind === 'island') {
      c.setRestSize(1)
      c.setTuning(ISLAND_TUNING)
      if (prev.at.x !== place.at.x || prev.at.y !== place.at.y) c.jump(place.at)
    }
  }, [place, mounted])

  // Voice ends: leave the way that fits where it is, then unmount (which stops its animation loop).
  useEffect(() => {
    if (place !== null || !mounted || exit) return
    const where = last.current
    const kind: Exit = reduced.current ? 'reduced' : quickExit ? 'quick' : where?.kind === 'row' ? 'fade' : 'soft'
    if (kind === 'soft' || kind === 'quick') clay.current?.vanish(kind)
    leaving.current = true
    setExit(kind)
    exitTimer.current = window.setTimeout(() => {
      setMounted(false)
      setExit(null)
      last.current = null
      leaving.current = false
    }, EXIT_MS[kind])
  }, [place, mounted, exit, quickExit])

  if (!mounted) return null
  return (
    <div className={`voice-clay${exit === 'fade' || exit === 'reduced' ? ` is-${exit}` : ''}`} aria-hidden="true">
      <ClayBody
        ref={clay}
        width={width}
        height={height}
        home={place?.at ?? last.current?.at ?? { x: 0, y: 0 }}
        radius={RADIUS}
        color={color}
        level={place?.kind === 'island' ? level : undefined}
        knead={knead && place?.kind === 'island'}
      />
    </div>
  )
}
