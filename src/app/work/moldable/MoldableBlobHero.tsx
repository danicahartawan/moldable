'use client'

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

type Point = { x: number; y: number }

const blobShapes: Point[][] = [
  [
    { x: 123, y: 133 }, { x: 147, y: 84 }, { x: 198, y: 78 }, { x: 250, y: 116 },
    { x: 307, y: 127 }, { x: 366, y: 105 }, { x: 399, y: 130 }, { x: 383, y: 175 },
    { x: 333, y: 232 }, { x: 292, y: 331 }, { x: 252, y: 363 }, { x: 207, y: 340 },
    { x: 166, y: 242 }, { x: 127, y: 174 },
  ],
  [
    { x: 115, y: 137 }, { x: 137, y: 88 }, { x: 185, y: 77 }, { x: 238, y: 110 },
    { x: 292, y: 126 }, { x: 354, y: 108 }, { x: 393, y: 131 }, { x: 402, y: 174 },
    { x: 369, y: 229 }, { x: 318, y: 300 }, { x: 284, y: 362 }, { x: 243, y: 371 },
    { x: 201, y: 332 }, { x: 161, y: 264 }, { x: 121, y: 183 },
  ],
]

function closedCurve(points: Point[]) {
  const curves = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const after = points[(index + 2) % points.length]
    return `C ${point.x + (next.x - previous.x) / 6} ${point.y + (next.y - previous.y) / 6}, ${next.x - (after.x - point.x) / 6} ${next.y - (after.y - point.y) / 6}, ${next.x} ${next.y}`
  })
  return `M ${points[0].x} ${points[0].y} ${curves.join(' ')} Z`
}

function MoldableBlob({ index }: { index: number }) {
  const initialPoints = blobShapes[index]
  const [points, setPoints] = useState(initialPoints)
  const drag = useRef<{ index: number; x: number; y: number; points: Point[] } | null>(null)
  const path = useMemo(() => closedCurve(points), [points])
  const word = index === 0 ? 'one' : 'two'

  const toSvgPoint = (event: PointerEvent<SVGPathElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    return {
      x: bounds?.width ? (event.clientX - bounds.left) * 500 / bounds.width : event.clientX,
      y: bounds?.height ? (event.clientY - bounds.top) * 420 / bounds.height : event.clientY,
    }
  }

  const startMolding = (event: PointerEvent<SVGPathElement>) => {
    const pointer = toSvgPoint(event)
    const nearest = points.reduce((closest, candidate, candidateIndex) => {
      const closestDistance = Math.hypot(points[closest].x - pointer.x, points[closest].y - pointer.y)
      const candidateDistance = Math.hypot(candidate.x - pointer.x, candidate.y - pointer.y)
      return candidateDistance < closestDistance ? candidateIndex : closest
    }, 0)
    drag.current = { index: nearest, x: pointer.x, y: pointer.y, points: points.map((point) => ({ ...point })) }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const mold = (event: PointerEvent<SVGPathElement>) => {
    if (!drag.current) return
    const pointer = toSvgPoint(event)
    const rawX = pointer.x - drag.current.x
    const rawY = pointer.y - drag.current.y
    const magnitude = Math.hypot(rawX, rawY)
    const scale = magnitude > 76 ? 76 / magnitude : 1
    setPoints(drag.current.points.map((point, pointIndex) => {
      const rawDistance = Math.abs(pointIndex - drag.current!.index)
      const distance = Math.min(rawDistance, initialPoints.length - rawDistance)
      const influence = Math.exp(-(distance * distance) / 5.5)
      return {
        x: Math.max(54, Math.min(446, point.x + rawX * scale * influence)),
        y: Math.max(42, Math.min(378, point.y + rawY * scale * influence)),
      }
    }))
  }

  const nudge = (event: KeyboardEvent<SVGPathElement>) => {
    const movement: Record<string, Point> = {
      ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: -8 }, ArrowDown: { x: 0, y: 8 },
    }
    if (event.key === 'Escape') {
      setPoints(initialPoints)
      return
    }
    const move = movement[event.key]
    if (!move) return
    event.preventDefault()
    setPoints((current) => current.map((point, pointIndex) => pointIndex === 0
      ? { x: point.x + move.x, y: point.y + move.y }
      : point))
  }

  return (
    <div className="cs-blob-panel">
      <span className="cs-blob-index" aria-hidden="true">0{index + 1}</span>
      <svg className="cs-blob-art" role="img" aria-label={`Orange moldable blob ${word}`} viewBox="0 0 500 420">
        <defs>
          <radialGradient id={`blob-orange-${index}`} gradientUnits="userSpaceOnUse" cx="178" cy="112" r="330">
            <stop stopColor="#ff8a5f" />
            <stop offset=".55" stopColor="#ff633c" />
            <stop offset="1" stopColor="#e94325" />
          </radialGradient>
          <filter id={`blob-shadow-${index}`} x="-30%" y="-30%" width="160%" height="175%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000" floodOpacity=".36" />
          </filter>
        </defs>
        <path
          className="cs-blob-shape"
          role="button"
          aria-label={`Mold orange blob ${word}`}
          tabIndex={0}
          d={path}
          fill={`url(#blob-orange-${index})`}
          filter={`url(#blob-shadow-${index})`}
          onPointerDown={startMolding}
          onPointerMove={mold}
          onPointerUp={() => { drag.current = null }}
          onPointerCancel={() => { drag.current = null }}
          onKeyDown={nudge}
        />
      </svg>
    </div>
  )
}

export function MoldableBlobHero() {
  return (
    <section className="cs-blob-hero" aria-label="Interactive Moldable hero">
      <p className="cs-blob-hint">Pull anywhere to mold</p>
      <div className="cs-blob-panels">
        <MoldableBlob index={0} />
        <MoldableBlob index={1} />
      </div>
    </section>
  )
}
