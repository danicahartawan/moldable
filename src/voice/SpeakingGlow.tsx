'use client'

import { useEffect, useRef, type RefObject } from 'react'
import './speaking-glow.css'

export type GlowState = 'idle' | 'listening' | 'hearing' | 'thinking' | 'done'

/** A number, a ref to one, or a function read every frame. Refs and functions never re-render React. */
export type GlowLevel = number | RefObject<number | null> | (() => number)

type Props = {
  state: GlowState
  /** Voice loudness, 0–1. Only used while `hearing`. */
  level?: GlowLevel
  /** Another element that should receive the same --sg-level / --sg-angle variables (e.g. a notification). */
  mirrorTo?: RefObject<HTMLElement | null>
  /** Called once the done sweep and fade have finished. */
  onDone?: () => void
}

// Degrees per second for each state. One turn every ~7 s at rest.
const SPEED: Record<GlowState, number> = { idle: 0, listening: 51, hearing: 72, thinking: 220, done: 51 }
const SWEEP_MS = 700
const FADE_MS = 600
// Level smoothing: time constant in seconds, so loudness never flickers.
const LEVEL_TAU = 0.14

const readLevel = (level: GlowLevel | undefined) => {
  if (level == null) return 0
  if (typeof level === 'number') return level
  if (typeof level === 'function') return level()
  return level.current ?? 0
}

/**
 * A soft multi-coloured glow that wraps the screen's rounded edge while the voice assistant is active.
 * Place it inside the screen (position: relative, overflow hidden); it fills it and never takes pointer events.
 * The corner radius comes from the --sg-radius custom property on an ancestor.
 */
export function SpeakingGlow({ state, level, mirrorTo, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  const levelRef = useRef(level)
  const onDoneRef = useRef(onDone)
  stateRef.current = state
  levelRef.current = level
  onDoneRef.current = onDone

  const active = state !== 'idle'

  // One animation loop while the glow is visible: it advances the rotation at the current state's speed and
  // smooths the level, writing both as CSS variables. React re-renders only when `state` changes.
  useEffect(() => {
    const el = root.current
    if (!active || !el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let raf = 0
    let last = performance.now()
    let angle = Number(el.style.getPropertyValue('--sg-angle').replace('deg', '')) || 0
    let speed = SPEED[stateRef.current]
    let smooth = 0
    const write = (name: string, value: string) => {
      el.style.setProperty(name, value)
      mirrorTo?.current?.style.setProperty(name, value)
    }
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = stateRef.current
      if (!reduce) {
        speed += (SPEED[s] - speed) * Math.min(1, dt * 4)
        angle = (angle + speed * dt) % 360
        write('--sg-angle', `${angle.toFixed(2)}deg`)
      }
      const target = s === 'hearing' && !reduce ? Math.max(0, Math.min(1, readLevel(levelRef.current))) : 0
      smooth += (target - smooth) * (1 - Math.exp(-dt / LEVEL_TAU))
      write('--sg-level', smooth.toFixed(3))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active, mirrorTo])

  // `done` plays its sweep, then fades; the parent hears about it once it's gone.
  useEffect(() => {
    if (state !== 'done') return
    const timer = window.setTimeout(() => onDoneRef.current?.(), SWEEP_MS + FADE_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  return (
    <div ref={root} className="sg" data-state={state} aria-hidden="true">
      {/* Wide soft bloom that bleeds inward, breathing while listening. */}
      <div className="sg__bloom">
        <div className="sg__ring sg__ring--bloom"><div className="sg__spin" /></div>
      </div>
      {/* The voice: the louder it is, the further the glow reaches toward the centre. */}
      <div className="sg__reach">
        <div className="sg__ring sg__ring--reach"><div className="sg__spin" /></div>
      </div>
      {/* Brighter corners. */}
      <div className="sg__corners">
        <div className="sg__ring sg__ring--corner"><div className="sg__cmask"><div className="sg__spin" /></div></div>
      </div>
      {/* Thin crisp band right on the edge. */}
      <div className="sg__band">
        <div className="sg__ring sg__ring--band"><div className="sg__spin" /></div>
      </div>
      {/* One bright pass around the border when done. */}
      <div className="sg__sweep">
        <div className="sg__ring sg__ring--sweep"><div className="sg__spin sg__spin--sweep" /></div>
      </div>
    </div>
  )
}

// Cheap smooth value noise: hashed points, cosine-interpolated.
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const noise = (t: number) => {
  const i = Math.floor(t)
  const f = t - i
  const u = (1 - Math.cos(f * Math.PI)) / 2
  return hash(i) * (1 - u) + hash(i + 1) * u
}

/**
 * A stand-in for microphone loudness: syllables (~4 per second) inside slower phrases, with short gaps.
 * Returns a function to pass as `level`; it's read once per frame and never re-renders React.
 */
export function createSimulatedLevel(seed = Math.random() * 1000) {
  const start = performance.now()
  return () => {
    const t = (performance.now() - start) / 1000 + seed
    const phrase = noise(t * 0.7)
    const syllable = noise(t * 4.2 + 50)
    const gap = phrase < 0.28 ? phrase / 0.28 : 1
    return Math.min(1, gap * (0.18 + 0.55 * syllable + 0.35 * phrase))
  }
}
