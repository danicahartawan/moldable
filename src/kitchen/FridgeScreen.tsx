'use client'

import { ClockCounterClockwise } from '@phosphor-icons/react'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import './fridge.css'

const BOUNDS = { x: 108, yUp: 170, yDown: 160 }

// The first Grandkids screen: it opens on the whole fridge, then zooms into its door where the note hangs.
// Popo's Lawar Bali recipe, a small aged note hung on a fridge by a bunch of chilies on a magnet.
// The note can be dragged around the door, and the chilies swing as it moves.
export function FridgeScreen({ onOpen }: { onOpen: () => void }) {
  const drag = useRef<HTMLDivElement>(null)
  const dangle = useRef<HTMLSpanElement>(null)
  const offset = useRef({ x: 0, y: 0 })
  const swing = useRef({ angle: 0, velocity: 0, frame: 0 })
  const moved = useRef(false)
  const cleanup = useRef<(() => void) | null>(null)

  const render = () => {
    const state = swing.current
    if (dangle.current) dangle.current.style.transform = `rotate(${state.angle}deg)`
  }

  // A damped pendulum: the bunch keeps swinging a little after the note stops.
  const startSwing = () => {
    const state = swing.current
    cancelAnimationFrame(state.frame)
    const step = () => {
      state.velocity += -0.1 * state.angle - 0.045 * state.velocity
      state.angle += state.velocity
      render()
      if (Math.abs(state.angle) > 0.05 || Math.abs(state.velocity) > 0.05) state.frame = requestAnimationFrame(step)
      else {
        state.angle = 0
        state.velocity = 0
        render()
      }
    }
    state.frame = requestAnimationFrame(step)
  }

  useEffect(() => () => {
    cancelAnimationFrame(swing.current.frame)
    cleanup.current?.()
  }, [])

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const origin = { x: event.clientX, y: event.clientY, startX: offset.current.x, startY: offset.current.y }
    const scale = (drag.current?.getBoundingClientRect().width ?? 180) / 180 || 1
    let last = event.clientX
    moved.current = false

    const move = (next: PointerEvent) => {
      const dx = (next.clientX - origin.x) / scale
      const dy = (next.clientY - origin.y) / scale
      if (!moved.current && Math.hypot(dx, dy) < 6) return
      moved.current = true
      offset.current = {
        x: Math.max(-BOUNDS.x, Math.min(BOUNDS.x, origin.startX + dx)),
        y: Math.max(-BOUNDS.yUp, Math.min(BOUNDS.yDown, origin.startY + dy)),
      }
      drag.current?.style.setProperty('--fr-x', `${offset.current.x}px`)
      drag.current?.style.setProperty('--fr-y', `${offset.current.y}px`)
      const state = swing.current
      state.velocity = Math.max(-6, Math.min(6, state.velocity + ((next.clientX - last) / scale) * 0.35))
      last = next.clientX
      startSwing()
    }
    const end = () => {
      cleanup.current?.()
      drag.current?.classList.remove('is-dragging')
    }
    cleanup.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      cleanup.current = null
    }
    drag.current?.classList.add('is-dragging')
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  // A drag ends with a click on the note; only a real tap opens the recipe.
  const open = () => {
    if (moved.current) {
      moved.current = false
      return
    }
    onOpen()
  }

  return (
    <div className="fr-screen" aria-label="Fridge">
     <div className="fr-world">
      <span className="fr-floor" aria-hidden="true" />
      <div className="fr-door" aria-hidden="true">
        <span className="fr-handle fr-handle--top" />
        <span className="fr-handle fr-handle--bottom" />
        <span className="fr-grille" />
      </div>

      <div ref={drag} className="fr-drag" onPointerDown={beginDrag}>
        <button type="button" className="fr-card" aria-label="Open Popo’s Lawar Bali recipe" onClick={open}>
          <span className="fr-paper">
            <span className="fr-paper__band" aria-hidden="true">
              <span className="fr-paper__hole" />
              <span className="fr-paper__hole" />
            </span>
            <span className="fr-paper__title">
              Lawar Bali <span className="fr-paper__time">40 mins</span>
            </span>
            <span className="fr-paper__sub">Popo’s recipe</span>
            <span className="fr-paper__footer">
              <ClockCounterClockwise size={15} aria-hidden="true" />
              Version 1
            </span>
          </span>
          <span className="fr-dangle" ref={dangle}>
            <span className="fr-dangle__sway">
              <img className="fr-bunch" src="/assets/chili-magnet.png" alt="" draggable={false} />
            </span>
          </span>
        </button>
      </div>
     </div>
    </div>
  )
}
