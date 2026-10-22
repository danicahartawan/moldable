'use client'

import { useEffect, useState } from 'react'
import { VoiceBeam } from 'voice-glow'

// The voice beam along the bottom edge, in the brand orange: a bright core with softer peach lobes either side.
const BEAM_COLORS = ['#ff5a1f', '#ff8a4c', '#ff8a4c', '#ffb27a', '#ffb27a', '#ffd2b0', '#ffd2b0']

export function OrangeBeam({ level, active, className }: { level: () => number; active: boolean; className?: string }) {
  // The beam draws with matchMedia and a canvas, so it mounts after the page does (which also keeps the server's HTML and the
  // client's the same); where those don't exist (tests, very old browsers) there is simply no beam.
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(typeof window.matchMedia === 'function') }, [])
  if (!ready) return null
  return (
    <VoiceBeam
      type="mobile"
      theme="light"
      strength={0.7}
      level={level}
      active={active}
      colors={BEAM_COLORS}
      bandColors={{ core: '#ff5a1f', above: '#ffb27a', mid: '#ff8a4c', below: '#ffd2b0' }}
      staticColors
    >
      <div className={className ?? 'gm-recipe-change__beam-host'} />
    </VoiceBeam>
  )
}
