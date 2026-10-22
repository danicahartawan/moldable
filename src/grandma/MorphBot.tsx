'use client'

import { useEffect, useState } from 'react'
import { BotAvatar } from 'bot-avatars'
import { outlinePath } from '../clay/ClayBody'

const POINTS = 12
const BASE = 38
const FRAME_MS = 50

// The bot's body is a ring of points that breathe on their own, and every few seconds it pulls out into an odd, stretched shape
// (like a lump of goo being tugged one way) before easing back to round.
export function morphPath(t: number, strength = 1) {
  const cycle = 4.6
  const phase = (t % cycle) / cycle
  // A tug: grows over the first stretch of the cycle, then relaxes. A new direction every cycle.
  const tug = Math.sin(Math.min(1, phase / 0.6) * Math.PI) * (phase < 0.6 ? 1 : 0) * strength
  const seed = Math.floor(t / cycle)
  const dir = (seed * 2.399) % (Math.PI * 2)
  const arms = 1 + (seed % 2)
  const points = Array.from({ length: POINTS }, (_, i) => {
    const angle = (i / POINTS) * Math.PI * 2
    const breathe = 1 + 0.035 * Math.sin(t * 1.7 + i * 1.3) + 0.025 * Math.sin(t * 2.9 + i * 2.1)
    const pull = tug * 0.55 * Math.max(0, Math.cos((angle - dir) * arms)) ** 2
    const r = BASE * (breathe + pull)
    return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r }
  })
  return outlinePath(points)
}

export function MorphBot({ size, paused = false, state = 'default', color = '#ff4d0d' }: { size: number; paused?: boolean; state?: 'default' | 'working' | 'sleeping'; color?: string }) {
  const [path, setPath] = useState(() => morphPath(0, 0))

  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPath(morphPath(0, 0))
      return
    }
    const begin = performance.now()
    const tick = window.setInterval(() => setPath(morphPath((performance.now() - begin) / 1000)), FRAME_MS)
    return () => window.clearInterval(tick)
  }, [paused])

  return (
    <BotAvatar
      path={path}
      type="circle"
      color={color}
      ink="#fff"
      brightness={1}
      saturation={2.5}
      shading="smooth"
      jumpEvery={0}
      size={size}
      state={state}
    />
  )
}
