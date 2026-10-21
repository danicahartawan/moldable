'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { ambienceOn, restoreAmbience, setAmbience, subscribeAmbience } from './ambience'

/** The switch for the kitchen's rain and jazz. Styling comes from where it sits (the kitchen bar, the boards nav). */
export function AmbienceToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribeAmbience, ambienceOn, () => false)
  useEffect(() => restoreAmbience(), [])
  return (
    <button type="button" className={className} aria-pressed={on} title={on ? 'Turn off the rain and jazz' : 'Play rain and soft jazz in the background'}
      onClick={() => setAmbience(!on)}>
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 13.5a3.5 3.5 0 0 1-.4-7A4.5 4.5 0 0 1 14.3 6a3.2 3.2 0 0 1 .2 6.4 M7 16l-.6 1.5 M10.5 15l-.6 1.5 M14 16l-.6 1.5" />
      </svg>
      Rain &amp; jazz
    </button>
  )
}
