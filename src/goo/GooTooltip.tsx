'use client'

import './goo-tooltip.css'
import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import { aim, prefersReduced, settled, snap, spring, stepSprings, type Params } from './springs'

/* A gooey tooltip for a row of pill buttons. The tooltip is a drop pulled out of the button it belongs to: it rises
   out of the button's top on a thick, melting neck (an SVG goo filter over the solid shapes), slides and resizes
   between buttons while it's showing, and drops back into its button when the pointer leaves.
   Two layers share the same geometry: the shapes (goo-filtered, aria-hidden) and, on top, the crisp labels. */

const TIP_H = 36
const TIP_GAP = 10
const TIP_RADIUS = 12
const TIP_PAD = 14
// How close (px between the drop's bottom and its button's top) the two still melt together; the neck snaps by then.
const NECK_REACH = 9
// Room around the row for the goo layer, so the filter has space to draw the tooltip and its neck.
const PAD_X = 40
const PAD_TOP = TIP_H + TIP_GAP + 30
const PAD_BOTTOM = TIP_H + TIP_GAP + 30

const FIRST_SHOW_MS = 80
const HIDE_MS = 120
const LABEL_OUT_MS = 140
// On emerge the label waits for the drop to settle; on travel it follows the outgoing one in.
const LABEL_IN_EMERGE_MS = 210
const LABEL_IN_TRAVEL_MS = 60
const LONG_PRESS_MS = 450

const TRAVEL: Params = { k: 380, c: 32 }
const EMERGE: Params = { k: 300, c: 18 }
const WIDTH_EMERGE: Params = { k: 300, c: 24 }

type Mode = 'hidden' | 'shown' | 'absorbing'
type Box = { cx: number; cy: number; w: number; h: number }
type Label = { key: number; text: string; out: boolean; delay: number }

type Group = {
  register: (id: string, el: HTMLButtonElement | null, tooltip: string) => void
  enter: (id: string, delay: number) => void
  leave: () => void
  press: (id: string, down: boolean) => void
  activeId: string | null
  tipId: string
}
const GooContext = createContext<Group | null>(null)

export type GooTooltipGroupProps = {
  children: ReactNode
  /** The tooltip's fill. It doesn't have to match the buttons: the goo neck blends the two colours where they meet. */
  color?: string
  /** The tooltip's text colour; keep at least 4.5:1 against `color`. */
  textColor?: string
  /** The buttons' fill and text colour. */
  buttonColor?: string
  buttonTextColor?: string
  /** Turn the tooltip from the button's colour to its own over the first 120ms of emerging (and back as it's absorbed),
   *  so the join reads as one material changing colour. Use it when two colours blend muddily in the neck. */
  neckTint?: boolean
  /** Which side of the buttons the tooltip rests on: above (default), or below for buttons along the top edge. */
  side?: 'top' | 'bottom'
  /** Centred on its button (default), or lined up with the button's right edge for buttons along the right edge. */
  align?: 'center' | 'end'
  className?: string
  'aria-label'?: string
}

export function GooTooltipGroup({
  children, color = '#1f1c19', textColor = '#ffffff', buttonColor = '#1f1c19', buttonTextColor = '#ffffff', neckTint = false,
  side = 'top', align = 'center', className, 'aria-label': ariaLabel,
}: GooTooltipGroupProps) {
  const uid = useId().replace(/:/g, '')
  const filterId = `goo-${uid}`
  const tipId = `goo-tip-${uid}`

  const buttons = useRef(new Map<string, { el: HTMLButtonElement; tooltip: string }>())
  const row = useRef<HTMLDivElement>(null)
  const tipShape = useRef<HTMLDivElement>(null)
  const ownerShape = useRef<HTMLDivElement>(null)
  const labelBox = useRef<HTMLDivElement>(null)
  const measurer = useRef<HTMLSpanElement>(null)

  const mode = useRef<Mode>('hidden')
  const owner = useRef<string | null>(null)
  const ownerEdges = useRef({ top: 0, bottom: 0 })
  const geo = useRef({ cx: spring(0), cy: spring(0), w: spring(0), h: spring(0) })
  const frame = useRef(0)
  const last = useRef(0)
  const timers = useRef<{ show?: number; hide?: number; drop?: number; gone?: number }>({})
  const widths = useRef(new Map<string, number>())
  const labelKey = useRef(0)
  const [labels, setLabels] = useState<Label[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reduced, setReduced] = useState(false)
  const reducedRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const sync = () => { reducedRef.current = prefersReduced(); setReduced(reducedRef.current) }
    sync()
    mq?.addEventListener?.('change', sync)
    // Labels are measured in Archivo; measure again once it has loaded.
    document.fonts?.ready.then(() => widths.current.clear()).catch(() => {})
    const t = timers.current
    return () => {
      mq?.removeEventListener?.('change', sync)
      cancelAnimationFrame(frame.current)
      Object.values(t).forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const labelWidth = (text: string) => {
    const cached = widths.current.get(text)
    if (cached) return cached
    const m = measurer.current
    if (!m) return text.length * 8 + TIP_PAD * 2
    m.textContent = text
    const w = Math.ceil(m.getBoundingClientRect().width) + TIP_PAD * 2
    widths.current.set(text, w)
    return w
  }

  // A button's box, in the row's own px.
  const rectOf = (id: string) => {
    const b = buttons.current.get(id)
    if (!b) return null
    return { x: b.el.offsetLeft, y: b.el.offsetTop, w: b.el.offsetWidth, h: b.el.offsetHeight, tooltip: b.tooltip }
  }
  // Resting 10px off the button (above or below, centred or lined up with its right edge), or tucked inside it:
  // centred on it, squashed to 60% height, no wider than it.
  const shownBox = (id: string): Box | null => {
    const r = rectOf(id)
    if (!r) return null
    const w = labelWidth(r.tooltip)
    const cx = align === 'end' ? r.x + r.w - w / 2 : r.x + r.w / 2
    const cy = side === 'top' ? r.y - TIP_GAP - TIP_H / 2 : r.y + r.h + TIP_GAP + TIP_H / 2
    return { cx, cy, w, h: TIP_H }
  }
  const hiddenBox = (id: string): Box | null => {
    const r = rectOf(id)
    return r && { cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: Math.min(labelWidth(r.tooltip), r.w) * 0.8, h: TIP_H * 0.6 }
  }

  const paint = () => {
    const { cx, cy, w, h } = geo.current
    const width = Math.max(0, w.x)
    const height = Math.max(0, h.x)
    const left = cx.x - width / 2 + PAD_X
    const top = cy.x - height / 2 + PAD_TOP
    const tip = tipShape.current
    if (tip) {
      tip.style.transform = `translate3d(${left}px, ${top}px, 0)`
      tip.style.width = `${width}px`
      tip.style.height = `${height}px`
      tip.style.borderRadius = `${Math.min(TIP_RADIUS, height / 2)}px`
    }
    const box = labelBox.current
    if (box) {
      box.style.transform = `translate3d(${cx.x - width / 2}px, ${cy.x - TIP_H / 2}px, 0)`
      box.style.width = `${width}px`
    }
    // The drop only melts into its button while it's close (emerging or being absorbed). Resting or travelling
    // 10px above, the button's copy leaves the goo layer, so two long flat edges never smudge together.
    const own = ownerShape.current
    const edge = ownerEdges.current
    const gap = side === 'top' ? edge.top - (cy.x + height / 2) : cy.x - height / 2 - edge.bottom
    if (own) own.style.opacity = gap < NECK_REACH ? '1' : '0'
  }

  const placeOwner = (id: string) => {
    const r = rectOf(id)
    const el = ownerShape.current
    if (!r || !el) return
    ownerEdges.current = { top: r.y, bottom: r.y + r.h }
    el.style.transform = `translate3d(${r.x + PAD_X}px, ${r.y + PAD_TOP}px, 0)`
    el.style.width = `${r.w}px`
    el.style.height = `${r.h}px`
  }

  const setVisible = (on: boolean) => {
    tipShape.current?.classList.toggle('is-on', on)
    ownerShape.current?.classList.toggle('is-on', on)
  }

  // The tooltip's fill, optionally starting from the button's (neck tint).
  const tint = (from: string, to: string, delay = 0) => {
    const tip = tipShape.current
    if (!tip) return
    tip.style.transition = 'none'
    tip.style.backgroundColor = from
    void tip.offsetWidth
    tip.style.transition = `background-color 120ms ease ${delay}ms`
    tip.style.backgroundColor = to
  }

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last.current) / 1000 || 1 / 60)
    last.current = now
    const g = geo.current
    const all = [g.cx, g.cy, g.w, g.h]
    stepSprings(all, dt)
    paint()
    if (all.every(settled)) {
      all.forEach((s) => snap(s, s.to))
      paint()
      frame.current = 0
      if (mode.current === 'absorbing') finishAbsorb()
      return
    }
    frame.current = requestAnimationFrame(tick)
  }
  const run = () => {
    if (frame.current) return
    last.current = performance.now()
    frame.current = requestAnimationFrame(tick)
  }

  const finishAbsorb = () => {
    mode.current = 'hidden'
    owner.current = null
    setVisible(false)
    setLabels([])
  }

  const showLabel = (text: string, delay: number) => {
    const key = ++labelKey.current
    setLabels((cur) => [...cur.map((l) => ({ ...l, out: true })), { key, text, out: false, delay }])
    window.setTimeout(() => setLabels((cur) => cur.filter((l) => !l.out || l.key > key)), LABEL_OUT_MS + 40)
  }
  const dropLabels = () => {
    setLabels((cur) => cur.map((l) => ({ ...l, out: true })))
    const key = labelKey.current
    window.setTimeout(() => setLabels((cur) => cur.filter((l) => !l.out || l.key > key)), LABEL_OUT_MS + 40)
  }

  // Emerge from the button (or, mid-absorb, turn back from wherever the drop is); travel if it's already showing.
  const show = (id: string) => {
    const t = timers.current
    window.clearTimeout(t.drop)
    window.clearTimeout(t.gone)
    const to = shownBox(id)
    if (!to) return
    const g = geo.current
    const was = mode.current
    const text = buttons.current.get(id)?.tooltip ?? ''
    if (was === 'shown' && owner.current === id) return
    owner.current = id
    mode.current = 'shown'
    setActiveId(id)
    placeOwner(id)

    if (reducedRef.current) {
      // Reduced motion: no goo, no springs. It fades in (or swaps its label) where it rests.
      ;[g.cx, g.cy, g.w, g.h].forEach((s, i) => snap(s, [to.cx, to.cy, to.w, to.h][i]))
      paint()
      setVisible(true)
      if (tipShape.current) tipShape.current.style.backgroundColor = color
      showLabel(text, 0)
      return
    }

    if (was === 'hidden') {
      const from = hiddenBox(id)!
      snap(g.cx, from.cx); snap(g.cy, from.cy); snap(g.w, from.w); snap(g.h, from.h)
      aim(g.cx, to.cx, TRAVEL); aim(g.cy, to.cy, EMERGE); aim(g.w, to.w, WIDTH_EMERGE); aim(g.h, to.h, EMERGE)
      paint()
      setVisible(true)
      if (neckTint) tint(buttonColor, color)
      else if (tipShape.current) { tipShape.current.style.transition = 'none'; tipShape.current.style.backgroundColor = color }
      showLabel(text, LABEL_IN_EMERGE_MS)
    } else if (was === 'absorbing') {
      // Quick re-entry: carry on from where the drop is, with no restart.
      aim(g.cx, to.cx, TRAVEL); aim(g.cy, to.cy, EMERGE); aim(g.w, to.w, WIDTH_EMERGE); aim(g.h, to.h, EMERGE)
      if (neckTint) tint(tipShape.current?.style.backgroundColor || buttonColor, color)
      showLabel(text, LABEL_IN_EMERGE_MS / 2)
    } else {
      // Travel: the same drop slides over and takes the new label's width; no goo, it stays up.
      aim(g.cx, to.cx, TRAVEL); aim(g.w, to.w, TRAVEL); aim(g.cy, to.cy, TRAVEL); aim(g.h, to.h, TRAVEL)
      showLabel(text, LABEL_IN_TRAVEL_MS)
    }
    run()
  }

  // Absorb: the label blurs out first, then the drop falls back into its button and melts in.
  const hide = () => {
    const t = timers.current
    window.clearTimeout(t.show)
    if (mode.current !== 'shown' || !owner.current) return
    const id = owner.current
    mode.current = 'absorbing'
    setActiveId(null)
    dropLabels()
    if (reducedRef.current) {
      setVisible(false)
      t.gone = window.setTimeout(finishAbsorb, 120)
      return
    }
    t.drop = window.setTimeout(() => {
      const to = hiddenBox(id)
      if (!to || mode.current !== 'absorbing') return
      const g = geo.current
      aim(g.cx, to.cx, TRAVEL); aim(g.cy, to.cy, EMERGE); aim(g.w, to.w, WIDTH_EMERGE); aim(g.h, to.h, EMERGE)
      if (neckTint) tint(color, buttonColor, 90)
      run()
    }, LABEL_OUT_MS - 60)
  }

  const api = useRef({ show, hide })
  api.current = { show, hide }

  const enter = useCallback((id: string, delay: number) => {
    const t = timers.current
    window.clearTimeout(t.hide)
    window.clearTimeout(t.show)
    // Already up (or melting back in): no delay, it travels or turns back at once.
    if (mode.current !== 'hidden' || delay <= 0) api.current.show(id)
    else t.show = window.setTimeout(() => api.current.show(id), delay)
  }, [])
  const leave = useCallback(() => {
    const t = timers.current
    window.clearTimeout(t.show)
    window.clearTimeout(t.hide)
    // A short wait, so crossing the gap between pills travels instead of absorbing.
    t.hide = window.setTimeout(() => api.current.hide(), HIDE_MS)
  }, [])
  const register = useCallback((id: string, el: HTMLButtonElement | null, tooltip: string) => {
    if (el) buttons.current.set(id, { el, tooltip })
    else buttons.current.delete(id)
  }, [])
  // The drop's copy of the button gives with it when it's pressed.
  const press = useCallback((id: string, down: boolean) => {
    if (owner.current !== id || !ownerShape.current) return
    ownerShape.current.style.scale = down ? '0.96' : '1'
  }, [])

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Escape' || mode.current !== 'shown') return
    window.clearTimeout(timers.current.hide)
    api.current.hide()
  }

  const ctx = useMemo<Group>(() => ({ register, enter, leave, press, activeId, tipId }), [register, enter, leave, press, activeId, tipId])
  const incoming = labels.filter((l) => !l.out)
  const current = incoming[incoming.length - 1]

  const vars = {
    '--goo-tip': color, '--goo-tip-ink': textColor, '--goo-btn': buttonColor, '--goo-btn-ink': buttonTextColor,
    '--goo-pad-x': `${PAD_X}px`, '--goo-pad-top': `${PAD_TOP}px`, '--goo-pad-bottom': `${PAD_BOTTOM}px`,
  } as CSSProperties

  return (
    <GooContext.Provider value={ctx}>
      <div className={`goo${reduced ? ' is-reduced' : ''}${className ? ` ${className}` : ''}`} style={vars} onKeyDown={onKeyDown} role="group" aria-label={ariaLabel}>
        <svg className="goo__defs" width="0" height="0" aria-hidden="true" focusable="false">
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" result="g" />
            <feComposite in="SourceGraphic" in2="g" operator="atop" />
          </filter>
        </svg>
        <div ref={row} className="goo__row">
          {/* Shapes only: the drop, and a copy of the button it belongs to so the two can melt together. */}
          <div className="goo__shapes" aria-hidden="true" style={reduced ? undefined : { filter: `url(#${filterId})` }}>
            <div ref={tipShape} className="goo__tip" />
            <div ref={ownerShape} className="goo__owner" />
          </div>
          {children}
          {/* Crisp labels, unfiltered, on top of the same geometry. */}
          <div className="goo__labels">
            <div ref={labelBox} className="goo__label-box">
              <span id={tipId} role="tooltip" className="goo__sr">{current?.text ?? ''}</span>
              {labels.map((l) => (
                <span key={l.key} aria-hidden="true" className={`goo__label${l.out ? ' is-out' : ''}`} style={{ '--goo-delay': `${l.delay}ms` } as CSSProperties}>{l.text}</span>
              ))}
            </div>
            <span ref={measurer} className="goo__label goo__measure" aria-hidden="true" />
          </div>
        </div>
      </div>
    </GooContext.Provider>
  )
}

export type GooButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** What the tooltip says for this button. */
  tooltip: string
  /** An icon before the label; with no children, the button is a round icon-only button. */
  icon?: ReactNode
}

export function GooButton({ tooltip, icon, children, className, onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, onFocus, onBlur, ...rest }: GooButtonProps) {
  const group = useContext(GooContext)
  if (!group) throw new Error('GooButton must sit inside a GooTooltipGroup')
  const id = useId()
  const ref = useRef<HTMLButtonElement>(null)
  const longPress = useRef<number | undefined>(undefined)
  const { register, enter, leave, press, activeId, tipId } = group

  useLayoutEffect(() => {
    register(id, ref.current, tooltip)
    return () => register(id, null, tooltip)
  }, [id, tooltip, register])
  useEffect(() => () => window.clearTimeout(longPress.current), [])

  const endTouch = (event: ReactPointerEvent<HTMLButtonElement>) => {
    press(id, false)
    if (event.pointerType !== 'touch') return
    window.clearTimeout(longPress.current)
    leave()
  }

  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={`goo-btn${children ? '' : ' goo-btn--icon'}${className ? ` ${className}` : ''}`}
      aria-describedby={activeId === id ? tipId : undefined}
      onPointerEnter={(event) => { onPointerEnter?.(event); if (event.pointerType !== 'touch') enter(id, FIRST_SHOW_MS) }}
      onPointerLeave={(event) => { onPointerLeave?.(event); press(id, false); if (event.pointerType !== 'touch') leave() }}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        press(id, true)
        // Touch has no hover: a long press shows it, and it's absorbed on release.
        if (event.pointerType === 'touch') longPress.current = window.setTimeout(() => enter(id, 0), LONG_PRESS_MS)
      }}
      onPointerUp={(event) => { onPointerUp?.(event); endTouch(event) }}
      onPointerCancel={(event) => { onPointerCancel?.(event); endTouch(event) }}
      onFocus={(event) => {
        onFocus?.(event)
        // Keyboard focus only (a click or tap also focuses the button).
        let keyboard = true
        try { keyboard = event.currentTarget.matches(':focus-visible') } catch {}
        if (keyboard) enter(id, 0)
      }}
      onBlur={(event) => { onBlur?.(event); leave() }}
    >
      {icon}
      {children}
    </button>
  )
}
