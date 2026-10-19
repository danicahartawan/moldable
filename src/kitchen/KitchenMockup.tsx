'use client'

import { useEffect, useRef, useState } from 'react'
import { ExploreBoard } from '@/boards/Explore'
import { HomeViewBoard } from '@/boards/HomeView'

type Screen = 'home' | 'explore'

const HINTS: Record<Screen, string> = {
  home: 'Tap around the screen. The round button by the title shows the steps.',
  explore: 'Tap the globe to spread the recipes. Swipe across to change cookbooks.',
}

export function KitchenMockup() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState<Screen>('home')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    // three.js is loaded only on this page, on the client.
    import('./buildScene')
      .then(({ buildScene }) => {
        if (cancelled || !canvas.current || !screen.current) return
        cleanup = buildScene(canvas.current, screen.current)
        setReady(true)
      })
      .catch((err) => {
        console.error(err)
        setFailed(true)
      })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <div className="kitchen">
      <canvas ref={canvas} className="kitchen__gl" aria-hidden="true" />
      <div className="kitchen__css">
        <div ref={screen} className="kitchen__screen">
          <div className={`kitchen__host${show === 'home' ? '' : ' is-off'}`} inert={show !== 'home'}>
            <HomeViewBoard />
          </div>
          <div className={`kitchen__host${show === 'explore' ? '' : ' is-off'}`} inert={show !== 'explore'}>
            <ExploreBoard />
          </div>
          <div className="kitchen__glare" aria-hidden="true" />
        </div>
      </div>

      <div className="kitchen__dock">
        <p className="kitchen__hint">{HINTS[show]}</p>
        <div className="kitchen__bar" role="toolbar" aria-label="Choose a screen">
          <button type="button" aria-pressed={show === 'home'} onClick={() => setShow('home')}>Home</button>
          <button type="button" aria-pressed={show === 'explore'} onClick={() => setShow('explore')}>Explore</button>
        </div>
      </div>

      <div className={`kitchen__loading${ready ? ' is-gone' : ''}`}>
        <p>{failed ? 'The table could not be set. Reload the page to try again.' : 'Setting the table…'}</p>
      </div>
    </div>
  )
}
