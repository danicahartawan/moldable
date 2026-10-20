'use client'

import { useEffect, useId, useRef } from 'react'

type Node = { x: number; y: number; r: number }

// One clay ball. The "tip" rests hidden inside it and gets pulled out toward the cursor.
const REST: Node[] = [
  { x: 60, y: 60, r: 38 }, // 0 ball
  { x: 60, y: 60, r: 14 }, // 1 tip
]
const LIMBS: [number, number][] = [[0, 1]]
const PULL_RADIUS = 46

const STEPS = 8 // circles per limb; interpolated radii give the taper
const DOTS = LIMBS.length * STEPS

type MoldableMarkProps = {
  className?: string
  color?: string
  interactive?: boolean
  shaded?: boolean
  title?: string
}

export function MoldableMark({ className = '', color = 'currentColor', interactive = true, shaded = true, title = 'Moldable' }: MoldableMarkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dotRefs = useRef<(SVGCircleElement | null)[]>([])
  const bodyRef = useRef<SVGCircleElement>(null)
  const filterId = useId().replace(/:/g, '')

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const pos = REST.map((n) => ({ ...n }))
    const vel = REST.map(() => ({ x: 0, y: 0 }))
    const pointer = { x: 0, y: 0, active: false }
    let raf = 0

    const toSvg = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect()
      pointer.x = ((e.clientX - r.left) / r.width) * 120
      pointer.y = ((e.clientY - r.top) / r.height) * 120
    }
    const move = (e: PointerEvent) => { toSvg(e); pointer.active = true }
    const leave = () => { pointer.active = false }
    if (interactive) {
      window.addEventListener('pointermove', move)
      svg.addEventListener('pointerleave', leave)
    }

    const draw = () => {
      bodyRef.current?.setAttribute('cx', pos[0].x.toFixed(2))
      bodyRef.current?.setAttribute('cy', pos[0].y.toFixed(2))
      bodyRef.current?.setAttribute('r', pos[0].r.toFixed(2))
      LIMBS.forEach(([i, j], k) => {
        for (let t = 0; t < STEPS; t++) {
          const f = (t + 1) / STEPS
          const dot = dotRefs.current[k * STEPS + t]
          if (!dot) continue
          dot.setAttribute('cx', (pos[i].x + (pos[j].x - pos[i].x) * f).toFixed(2))
          dot.setAttribute('cy', (pos[i].y + (pos[j].y - pos[i].y) * f).toFixed(2))
          dot.setAttribute('r', (pos[i].r + (pos[j].r - pos[i].r) * f - Math.min(pos[i].r, pos[j].r) * 0.55 * Math.sin(Math.PI * f)).toFixed(2))
        }
      })
    }

    const tick = (t: number) => {
      pos.forEach((n, i) => {
        const rest = REST[i]
        // gentle breathing drift
        const bx = reduce ? 0 : Math.sin(t / 4200 + i * 1.7) * 1.6
        const by = reduce ? 0 : Math.cos(t / 5000 + i * 2.3) * 1.6
        let tx = rest.x + bx
        let ty = rest.y + by
        if (pointer.active) {
          const dx = pointer.x - rest.x
          const dy = pointer.y - rest.y
          const d = Math.hypot(dx, dy) || 1
          if (d < PULL_RADIUS * 1.6) {
            // ball leans a little; tip stretches out up to ~28 units past the surface
            const reach = i === 0 ? Math.min(d, 8) : Math.min(d, 52)
            tx += (dx / d) * reach
            ty += (dy / d) * reach
          }
        }
        // spring toward target -> wobbly clay settle
        vel[i].x = (vel[i].x + (tx - n.x) * 0.02) * 0.93
        vel[i].y = (vel[i].y + (ty - n.y) * 0.02) * 0.93
        n.x += vel[i].x
        n.y += vel[i].y
        n.r = rest.r * (1 + (reduce ? 0 : Math.sin(t / 3600 + i) * 0.035))
      })
      draw()
      raf = requestAnimationFrame(tick)
    }

    draw()
    if (!reduce || interactive) raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      svg.removeEventListener('pointerleave', leave)
    }
  }, [interactive])

  return (
    <svg
      ref={svgRef}
      className={`moldable-mark ${className}`.trim()}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
    >
      <defs>
        {/* gooey merge: blur then hard-threshold alpha so limbs fuse like wet clay */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
        <radialGradient id={`${filterId}h`} cx="0.35" cy="0.3" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${filterId}s`} cx="0.5" cy="0.5" r="0.62">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
      </defs>
      <mask id={`${filterId}m`}>
        <g filter={`url(#${filterId})`} fill="#fff">
          <circle ref={bodyRef} cx={REST[0].x} cy={REST[0].y} r={REST[0].r} />
          {Array.from({ length: DOTS }, (_, k) => (
            <circle key={k} ref={(el) => { dotRefs.current[k] = el }} />
          ))}
        </g>
      </mask>
      <g mask={`url(#${filterId}m)`}>
        <rect width="120" height="120" fill={color} />
        {shaded && <rect width="120" height="120" fill={`url(#${filterId}h)`} />}
        {shaded && <rect width="120" height="120" fill={`url(#${filterId}s)`} />}
      </g>
    </svg>
  )
}
