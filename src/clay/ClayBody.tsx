'use client'

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { ClaySim, type ClayTuning, type Vec } from './ClaySim'
import './clay-body.css'

export type ClayHandle = {
  jump: (to: Vec, landingNormal?: Vec) => void
  crawl: (to: Vec, contactNormal?: Vec) => void
  stretch: (direction: Vec, amount?: number) => void
  release: () => void
  touch: (normal?: Vec, strength?: number) => void
  moveTo: (p: Vec) => void
  place: (p: Vec) => void
  readonly sim: ClaySim | null
}

type Props = {
  /** Size of the drawing area in px. The clay moves in these coordinates and may poke out of it. */
  width: number
  height: number
  /** Where it rests, in the drawing area's px. */
  home: Vec
  /** Resting radius in px. */
  radius: number
  color?: 'orange' | 'teal'
  /** Voice loudness 0–1, read every frame (no React re-render). */
  level?: () => number
  /** Which way loud words pull it. */
  voiceDirection?: Vec
  /** Being worked, e.g. while thinking. */
  knead?: boolean
  tuning?: Partial<ClayTuning>
  className?: string
  style?: CSSProperties
}

/** Smooth closed curve through the points (Catmull-Rom as cubic Béziers). */
export function outlinePath(points: readonly Vec[]) {
  const n = points.length
  if (!n) return ''
  const f = (v: number) => v.toFixed(2)
  let d = `M${f(points[0].x)} ${f(points[0].y)}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n]
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`
  }
  return `${d}Z`
}

// A small tile of clay grain, made once. It's laid in fixed world space and clipped to the body, so it never stretches.
let grain: string | null = null
function grainTile() {
  if (grain !== null || typeof document === 'undefined') return grain
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (!g) return (grain = '')
  const img = g.createImageData(64, 64)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 145
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return (grain = c.toDataURL())
}

/**
 * A lump of soft clay drawn from a 12-point spring outline. Stretching keeps its volume, the front leads and the back lags,
 * it squashes on contact, ripples a little while moving, and its light and grain stay put while the shape changes.
 */
export const ClayBody = forwardRef<ClayHandle, Props>(function ClayBody(
  { width, height, home, radius, color = 'orange', level, voiceDirection, knead = false, tuning, className, style },
  ref,
) {
  const uid = useId().replace(/:/g, '')
  const ids = { path: `clay-path-${uid}`, fill: `clay-fill-${uid}`, teal: `clay-teal-${uid}`, shade: `clay-shade-${uid}`, clip: `clay-clip-${uid}`, grain: `clay-grain-${uid}` }
  const simRef = useRef<ClaySim | null>(null)
  if (!simRef.current) simRef.current = new ClaySim(home, radius, { tuning })
  const pathRef = useRef<SVGPathElement>(null)
  const fillRef = useRef<SVGRadialGradientElement>(null)
  const tealRef = useRef<SVGRadialGradientElement>(null)
  const levelRef = useRef(level)
  levelRef.current = level
  const [tile, setTile] = useState<string | null>(null)

  useImperativeHandle(ref, () => {
    const sim = simRef.current!
    return {
      jump: (to, n) => sim.jump(to, n),
      crawl: (to, n) => sim.crawl(to, n),
      stretch: (dir, amount) => sim.stretch(dir, amount),
      release: () => sim.release(),
      touch: (n, s) => sim.touch(n, s),
      moveTo: (p) => sim.moveTo(p),
      place: (p) => sim.place(p),
      get sim() { return simRef.current },
    }
  }, [])

  useEffect(() => { setTile(grainTile()) }, [])
  useEffect(() => { if (tuning && simRef.current) Object.assign(simRef.current.tuning, tuning) }, [tuning])
  useEffect(() => { if (simRef.current) simRef.current.knead = knead }, [knead])
  useEffect(() => {
    simRef.current?.setLevel(level ? () => levelRef.current?.() ?? 0 : null, voiceDirection)
  }, [Boolean(level), voiceDirection?.x, voiceDirection?.y]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { simRef.current?.moveTo(home) }, [home.x, home.y]) // eslint-disable-line react-hooks/exhaustive-deps

  // The simulation runs in its own animation loop and writes straight to the SVG; React never re-renders per frame.
  useEffect(() => {
    const sim = simRef.current!
    sim.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let raf = 0
    let last = performance.now()
    const draw = () => {
      pathRef.current?.setAttribute('d', outlinePath(sim.outline))
      // The light stays up and to the left of the body's centre, whatever shape it's in.
      const c = sim.center
      for (const g of [fillRef.current, tealRef.current]) {
        g?.setAttribute('cx', (c.x - radius * 0.38).toFixed(2))
        g?.setAttribute('cy', (c.y - radius * 0.46).toFixed(2))
      }
    }
    const frame = (now: number) => {
      sim.step((now - last) / 1000)
      last = now
      if (!sim.settled) draw()
      raf = requestAnimationFrame(frame)
    }
    draw()
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [radius])

  const sim = simRef.current
  const r = radius
  const c = sim.center
  return (
    <svg className={`clay${className ? ` ${className}` : ''}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style} aria-hidden="true">
      <defs>
        <radialGradient ref={fillRef} id={ids.fill} gradientUnits="userSpaceOnUse" cx={c.x - r * 0.38} cy={c.y - r * 0.46} r={r * 2.1}>
          <stop offset="0" stopColor="#ffc3a3" />
          <stop offset=".24" stopColor="#ff8a5c" />
          <stop offset=".56" stopColor="#ff5a26" />
          <stop offset="1" stopColor="#d9420f" />
        </radialGradient>
        <radialGradient ref={tealRef} id={ids.teal} gradientUnits="userSpaceOnUse" cx={c.x - r * 0.38} cy={c.y - r * 0.46} r={r * 2.1}>
          <stop offset="0" stopColor="#d4f7f4" />
          <stop offset=".26" stopColor="#86dede" />
          <stop offset=".58" stopColor="#3fbfbd" />
          <stop offset="1" stopColor="#1f9d9d" />
        </radialGradient>
        {/* Shading from the current outline: darker inside the lower-right edge, a soft light inside the upper-left. */}
        <filter id={ids.shade} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={r * 0.2} result="soft" />
          <feOffset in="soft" dx={-r * 0.14} dy={-r * 0.2} result="up" />
          <feComposite in="SourceAlpha" in2="up" operator="out" result="lowerEdge" />
          <feFlood floodColor="#7a2200" floodOpacity=".42" />
          <feComposite in2="lowerEdge" operator="in" result="dark" />
          <feOffset in="soft" dx={r * 0.12} dy={r * 0.16} result="down" />
          <feComposite in="SourceAlpha" in2="down" operator="out" result="upperEdge" />
          <feFlood floodColor="#fff4ec" floodOpacity=".55" />
          <feComposite in2="upperEdge" operator="in" result="light" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="dark" />
            <feMergeNode in="light" />
          </feMerge>
        </filter>
        {/* The outline has no fill of its own, so each <use> can paint it (orange, teal) and clip the grain to it. */}
        <path ref={pathRef} id={ids.path} d={outlinePath(sim.outline)} />
        <clipPath id={ids.clip}><use href={`#${ids.path}`} /></clipPath>
        {tile && (
          <pattern id={ids.grain} patternUnits="userSpaceOnUse" width="64" height="64">
            <image href={tile} width="64" height="64" />
          </pattern>
        )}
      </defs>
      <g filter={`url(#${ids.shade})`}>
        <use href={`#${ids.path}`} fill={`url(#${ids.fill})`} />
        <use href={`#${ids.path}`} fill={`url(#${ids.teal})`} className="clay__teal" style={{ opacity: color === 'teal' ? 1 : 0 }} />
      </g>
      {tile && <rect className="clay__grain" x={-width} y={-height} width={width * 3} height={height * 3} fill={`url(#${ids.grain})`} clipPath={`url(#${ids.clip})`} />}
    </svg>
  )
})
