'use client'

import './goo-segmented.css'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { play } from '@/haptics/haptics'
import { aim, prefersReduced, settled, snap, spring, stepSprings, type Params } from './springs'

/* A segmented switch whose thumb is liquid. On a change, a drop leaps to the new option while a smaller one trails it;
   the goo filter melts the two into one pulled-out blob that necks as it stretches and merges back on arrival. */

// The leading drop is quick and lands with a small give; the trailing one is slower and smaller while it lags.
const LEAD: Params = { k: 520, c: 36 }
const TAIL: Params = { k: 150, c: 20 }
// While dragging, the leading drop stays right under the finger.
const FOLLOW: Params = { k: 1400, c: 75 }

export type GooSegmentedOption<T extends string> = { value: T; label: string }

export type GooSegmentedProps<T extends string> = {
  options: readonly GooSegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
  /** Extra classes for each option's button (e.g. the screen's own press feedback). */
  buttonClassName?: string
}

export function GooSegmented<T extends string>({ options, value, onChange, 'aria-label': ariaLabel, className, buttonClassName }: GooSegmentedProps<T>) {
  const filterId = `goo-seg-${useId().replace(/:/g, '')}`
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const lead = useRef<HTMLDivElement>(null)
  const tail = useRef<HTMLDivElement>(null)
  const geo = useRef({ lx: spring(0), lw: spring(0), tx: spring(0), tw: spring(0) })
  const frame = useRef(0)
  const last = useRef(0)
  const placed = useRef(false)
  const [reduced, setReduced] = useState(false)

  const paint = () => {
    const { lx, lw, tx, tw } = geo.current
    // The trailing drop thins the further it lags, so the stretch reads as a neck rather than two pills.
    const lag = Math.abs(tx.x + tw.x / 2 - (lx.x + lw.x / 2))
    const s = 1 - Math.min(0.3, lag / 260)
    if (lead.current) { lead.current.style.transform = `translateX(${lx.x}px)`; lead.current.style.width = `${Math.max(0, lw.x)}px` }
    if (tail.current) { tail.current.style.transform = `translateX(${tx.x}px) scale(${s.toFixed(3)})`; tail.current.style.width = `${Math.max(0, tw.x)}px` }
  }

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last.current) / 1000 || 1 / 60)
    last.current = now
    const all = Object.values(geo.current)
    stepSprings(all, dt)
    paint()
    if (all.every(settled)) {
      all.forEach((s) => snap(s, s.to))
      paint()
      frame.current = 0
      return
    }
    frame.current = requestAnimationFrame(tick)
  }

  // Moves the thumb to the selected option: at once the first time (and under reduced motion), as liquid after.
  const place = (animate: boolean) => {
    const el = buttons.current[options.findIndex((o) => o.value === value)]
    if (!el) return
    const x = el.offsetLeft
    const w = el.offsetWidth
    const g = geo.current
    cancelAnimationFrame(frame.current)
    frame.current = 0
    if (!animate) {
      snap(g.lx, x); snap(g.lw, w); snap(g.tx, x); snap(g.tw, w)
      paint()
      return
    }
    aim(g.lx, x, LEAD); aim(g.lw, w, LEAD); aim(g.tx, x, TAIL); aim(g.tw, w, TAIL)
    last.current = performance.now()
    frame.current = requestAnimationFrame(tick)
  }
  const placeRef = useRef(place)
  placeRef.current = place

  // Dragging: the leading drop follows the finger (its width blending between the options it's between) and the
  // trailing one lags, so the thumb stretches like liquid. On release it settles on the nearest option.
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; sx: number; lx: number; scale: number; moved: boolean; near: number } | null>(null)
  const suppressClick = useRef(false)
  const slots = () => buttons.current.map((b) => (b ? { x: b.offsetLeft, w: b.offsetWidth } : { x: 0, w: 0 }))
  const nearest = (x: number) => {
    const s = slots()
    return s.reduce((best, slot, i) => (Math.abs(slot.x - x) < Math.abs(s[best].x - x) ? i : best), 0)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !root.current) return
    // The thumb owns the drag; the screen around it shouldn't also swipe.
    event.stopPropagation()
    const r = root.current
    const scale = r.getBoundingClientRect().width / (r.offsetWidth || 1) || 1
    drag.current = { id: event.pointerId, sx: event.clientX, lx: geo.current.lx.to, scale, moved: false, near: options.findIndex((o) => o.value === value) }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const dx = (event.clientX - d.sx) / d.scale
    if (!d.moved) {
      if (Math.abs(dx) < 4) return
      d.moved = true
      root.current?.setPointerCapture?.(event.pointerId)
    }
    const s = slots()
    const x = Math.max(s[0].x, Math.min(s[s.length - 1].x, d.lx + dx))
    // Between two options, the width blends from one to the other.
    let w = s[0].w
    for (let i = 0; i < s.length - 1; i++) {
      if (x >= s[i].x && x <= s[i + 1].x) {
        const t = (x - s[i].x) / (s[i + 1].x - s[i].x || 1)
        w = s[i].w + (s[i + 1].w - s[i].w) * t
      }
    }
    if (x >= s[s.length - 1].x) w = s[s.length - 1].w
    const g = geo.current
    aim(g.lx, x, FOLLOW); aim(g.lw, w, FOLLOW); aim(g.tx, x, TAIL); aim(g.tw, w, TAIL)
    if (!frame.current) { last.current = performance.now(); frame.current = requestAnimationFrame(tick) }
    // A soft tick as the thumb crosses into another option.
    const near = nearest(x)
    if (near !== d.near) { d.near = near; play('nav') }
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    if (!d.moved) return
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 0)
    const pick = options[nearest(geo.current.lx.to)]
    if (pick.value !== value) onChange(pick.value)
    else placeRef.current(!prefersReduced())
  }

  // Arrow keys move between the options, like a radio group.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const i = options.findIndex((o) => o.value === value)
    const next = Math.max(0, Math.min(options.length - 1, i + (event.key === 'ArrowRight' ? 1 : -1)))
    if (next === i) return
    event.preventDefault()
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  useLayoutEffect(() => {
    placeRef.current(placed.current && !prefersReduced())
    placed.current = true
  }, [value])

  useEffect(() => {
    setReduced(prefersReduced())
    // Labels change width when the font loads or the layout changes: keep the thumb on its option.
    const snapBack = () => placeRef.current(false)
    document.fonts?.ready.then(snapBack).catch(() => {})
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(snapBack)
    buttons.current.forEach((b) => b && ro?.observe(b))
    return () => { ro?.disconnect(); cancelAnimationFrame(frame.current) }
  }, [])

  return (
    <div ref={root} className={`goo-seg${className ? ` ${className}` : ''}`} role="group" aria-label={ariaLabel}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}
      onClickCapture={(event) => { if (suppressClick.current) { event.stopPropagation(); event.preventDefault() } }}>
      <svg className="goo-seg__defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id={filterId} x="-20%" y="-40%" width="140%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" result="g" />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
      </svg>
      <div className="goo-seg__blobs" aria-hidden="true" style={{ filter: `${reduced ? '' : `url(#${filterId}) `}drop-shadow(0 1px 1.5px rgba(31, 28, 25, .16))` }}>
        <div ref={tail} className="goo-seg__blob" />
        <div ref={lead} className="goo-seg__blob" />
      </div>
      {options.map((o, i) => (
        <button key={o.value} ref={(el) => { buttons.current[i] = el }} type="button" className={`goo-seg__opt${buttonClassName ? ` ${buttonClassName}` : ''}`}
          aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
