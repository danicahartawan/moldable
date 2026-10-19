'use client'

import {
  BowlFood,
  Drop,
  Fan,
  Grains,
  Jar,
  Leaf,
  Oven,
  Scales,
  Thermometer,
  Timer,
  type Icon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'

export type ToolId = 'microwave' | 'blend' | 'timer' | 'weigh' | 'temperature'
type PantryId = 'kencur' | 'coconut' | 'lime' | 'salt' | 'green-beans'
type ShelfItemId = ToolId | PantryId

type ShelfItemDefinition = {
  id: ShelfItemId
  label: string
  Icon: Icon
}

const tools: readonly ShelfItemDefinition[] = [
  { id: 'microwave', label: 'Microwave', Icon: Oven },
  { id: 'blend', label: 'Blend', Icon: Fan },
  { id: 'timer', label: 'Timer', Icon: Timer },
  { id: 'weigh', label: 'Weigh', Icon: Scales },
  { id: 'temperature', label: 'Temperature', Icon: Thermometer },
]

const pantry: readonly ShelfItemDefinition[] = [
  { id: 'kencur', label: 'Kencur', Icon: Leaf },
  { id: 'coconut', label: 'Coconut', Icon: BowlFood },
  { id: 'lime', label: 'Lime', Icon: Drop },
  { id: 'salt', label: 'Salt', Icon: Jar },
  { id: 'green-beans', label: 'Green beans', Icon: Grains },
]

const shelf: readonly ShelfItemDefinition[] = [...tools, ...pantry]
const VISIBLE = 3
const ARC_RADIUS = 200
const CHIP_SIZE = 72
const EDGE_INSET = 28

// Angle (deg, measured from the top edge) of each carousel slot around the corner.
const slotAngle = (slot: number) => 12 + slot * 22

export function ToolRail({ activatedTool = null }: { activatedTool?: ToolId | null }) {
  const [start, setStart] = useState(0)
  const [selectedItem, setSelectedItem] = useState<ShelfItemId | null>(null)
  const [activeItem, setActiveItem] = useState<ShelfItemId | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const wheel = useRef({ travel: 0, locked: false })
  const maxStart = shelf.length - VISIBLE
  const shift = (delta: number) => setStart((current) => Math.min(maxStart, Math.max(0, current + delta)))

  // Spin the carousel past the other tools before settling on the one that was named.
  useEffect(() => {
    if (!activatedTool) return
    const index = shelf.findIndex((item) => item.id === activatedTool)
    const target = Math.min(Math.max(0, index), maxStart)
    setSelectedItem(activatedTool)
    setActiveItem(null)
    setIsOpen(true)
    const hide = window.setTimeout(() => setIsOpen(false), 4200)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setStart(target)
      setActiveItem(activatedTool)
      return () => window.clearTimeout(hide)
    }

    let position = 0
    const path: number[] = []
    for (let step = position; step <= maxStart; step += 1) path.push(step)
    for (let step = maxStart - 1; step >= target; step -= 1) path.push(step)
    let cursor = 0
    setStart(0)
    const spin = window.setInterval(() => {
      cursor += 1
      if (cursor >= path.length) {
        window.clearInterval(spin)
        setActiveItem(activatedTool)
        return
      }
      setStart(path[cursor])
    }, 120)
    return () => {
      window.clearInterval(spin)
      window.clearTimeout(hide)
    }
  }, [activatedTool, maxStart])

  const beginDrag = (event: PointerEvent<HTMLElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, moved: false }
  }

  // Swipe up (or left) to bring the next tool forward, down (or right) to go back.
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const start = drag.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx
    if (Math.abs(delta) < 34) return
    shift(delta < 0 ? 1 : -1)
    drag.current = { x: event.clientX, y: event.clientY, moved: true }
  }

  const endDrag = () => {
    window.setTimeout(() => { drag.current = null }, 0)
  }

  return (
    <div
      className={`tool-rail${isOpen ? ' tool-rail--open' : ''}`}
      onPointerLeave={() => { setActiveItem(null); setIsOpen(false) }}
      onFocusCapture={() => setIsOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false)
      }}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={(event) => {
        // Gather wheel travel and move one tool at a time, with a pause, so a trackpad swipe doesn't whip through the shelf.
        if (wheel.current.locked) return
        wheel.current.travel += event.deltaY
        if (Math.abs(wheel.current.travel) < 90) return
        shift(wheel.current.travel > 0 ? 1 : -1)
        wheel.current = { travel: 0, locked: true }
        window.setTimeout(() => { wheel.current.locked = false }, 520)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') shift(1)
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') shift(-1)
      }}
    >
      <div className="tool-rail__hotspot" onPointerEnter={() => setIsOpen(true)} aria-hidden="true" />
      <div
        className="tool-rail__orbit"
        role="toolbar"
        aria-label="Cooking tools and pantry"
      >
        {shelf.map(({ id, label, Icon: ToolIcon }, index) => {
          const slot = index - start
          const inView = slot >= 0 && slot < VISIBLE
          const isEdge = slot === VISIBLE
          const shown = inView || isEdge
          const angle = (slotAngle(Math.min(Math.max(slot, -1), VISIBLE + 1)) * Math.PI) / 180
          return (
            <button
              className={`tool-chip${isEdge ? ' tool-chip--edge' : ''}${shown ? '' : ' tool-chip--hidden'}${activeItem === id || selectedItem === id ? ' tool-chip--expanded' : ''}${activatedTool === id ? ' tool-chip--arrival' : ''}`}
              type="button"
              aria-label={label}
              aria-pressed={selectedItem === id}
              tabIndex={shown ? 0 : -1}
              data-position={slot}
              key={id}
              style={{
                left: Math.round(ARC_RADIUS * Math.sin(angle) - CHIP_SIZE / 2 + EDGE_INSET),
                top: Math.round(ARC_RADIUS * Math.cos(angle) - CHIP_SIZE / 2 + EDGE_INSET),
              }}
              onClick={() => {
                if (drag.current?.moved) return
                if (isEdge) shift(1)
                setSelectedItem(id)
                setActiveItem(id)
              }}
              onFocus={() => setActiveItem(id)}
              onPointerEnter={() => setActiveItem(id)}
            >
              <ToolIcon size={36} weight="regular" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
