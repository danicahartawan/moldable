'use client'

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'

const D = 'var(--ink)'
const W = '#ffffff'

type Recipe = { name: string; mins: number; level: string; bg: string; ink: string; photo?: boolean }
type Book = { label: string; from: string; R: Recipe[] }

// Cookbooks other than Oma Lien's Lelawar Bali are placeholders.
const BOOKS: Book[] = [
  { label: 'Oma Lien’s cookbook', from: 'From Oma Lien’s cards', R: [
    { name: 'Lelawar Bali', mins: 30, level: 'hard', bg: '#2a2622', ink: W, photo: true },
    { name: 'Soto ayam', mins: 60, level: 'medium', bg: '#f5d653', ink: D },
    { name: 'Rendang', mins: 180, level: 'hard', bg: '#6e2e1f', ink: W },
    { name: 'Nasi kuning', mins: 50, level: 'medium', bg: '#f2c14e', ink: D },
    { name: 'Opor ayam', mins: 70, level: 'medium', bg: '#f3eadb', ink: D },
    { name: 'Sayur lodeh', mins: 40, level: 'easy', bg: '#cfe3b4', ink: D },
    { name: 'Perkedel', mins: 35, level: 'easy', bg: '#e9c38a', ink: D },
    { name: 'Gulai ikan', mins: 55, level: 'medium', bg: '#ec923b', ink: D },
  ] },
  { label: 'Tante Ani’s cookbook', from: 'From Tante Ani’s notebook', R: [
    { name: 'Klepon', mins: 45, level: 'easy', bg: '#9cc04a', ink: D },
    { name: 'Kue lapis', mins: 90, level: 'medium', bg: '#e0559f', ink: W },
    { name: 'Es cendol', mins: 40, level: 'easy', bg: '#7fb6a4', ink: D },
    { name: 'Dadar gulung', mins: 35, level: 'easy', bg: '#b9d97a', ink: D },
    { name: 'Bubur sumsum', mins: 30, level: 'easy', bg: '#f3eadb', ink: D },
    { name: 'Onde-onde', mins: 60, level: 'medium', bg: '#e9c38a', ink: D },
  ] },
  { label: 'Om Budi’s cookbook', from: 'From Om Budi’s voice notes', R: [
    { name: 'Sambal matah', mins: 10, level: 'easy', bg: '#ec923b', ink: D },
    { name: 'Sate lilit', mins: 50, level: 'medium', bg: '#b4347c', ink: W },
    { name: 'Ayam betutu', mins: 150, level: 'hard', bg: '#6e2e1f', ink: W },
    { name: 'Bakwan', mins: 25, level: 'easy', bg: '#e9c38a', ink: D },
    { name: 'Tempe mendoan', mins: 20, level: 'easy', bg: '#f5d653', ink: D },
  ] },
  { label: 'Lebaran table', from: 'Shared by the whole family', R: [
    { name: 'Ketupat', mins: 240, level: 'hard', bg: '#2c6a39', ink: W },
    { name: 'Opor ayam', mins: 70, level: 'medium', bg: '#f3eadb', ink: D },
    { name: 'Sambal goreng ati', mins: 45, level: 'medium', bg: '#b4347c', ink: W },
    { name: 'Rendang', mins: 180, level: 'hard', bg: '#6e2e1f', ink: W },
    { name: 'Nastar', mins: 80, level: 'medium', bg: '#f2c14e', ink: D },
    { name: 'Kastengel', mins: 60, level: 'medium', bg: '#f5d653', ink: D },
  ] },
]

const TILE_COUNT = 22
const RADIUS = 205
const TOOLS = [
  { label: 'Search', d: 'M8.5 3.5a5 5 0 1 0 0 10a5 5 0 1 0 0-10z M12.5 12.5L17 17' },
  { label: 'Modify', d: 'M3 6h9M15 6h2M3 14h3M9 14h8 M13.5 4.2v3.6 M7.5 12.2v3.6' },
  { label: 'Tidy', d: 'M10 2.5l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z' },
]

// Grid slot for card k: three columns, the middle one lifted for a staggered look.
function gpos(k: number): [number, number] {
  const c = k % 3
  const r = Math.floor(k / 3)
  return [(c - 1) * 200, -150 + r * 200 - (c === 1 ? 40 : 0)]
}

function CardFace({ r }: { r: Recipe }) {
  return (
    <>
      {r.photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ex-photo" src="/assets/lelawar-photo.png" alt="" />
          <span aria-hidden="true" className="ex-shade" />
        </>
      )}
      <span className="ex-meta" style={{ color: r.ink }}>{r.mins} mins<br /><span style={{ fontWeight: 300 }}>{r.level}</span></span>
      <span className="ex-name" style={{ color: r.ink }}>{r.name}</span>
    </>
  )
}

export function ExploreBoard({ onOpenRecipe }: { onOpenRecipe?: (name: string) => void } = {}) {
  const [mode, setMode] = useState<'globe' | 'grid'>('globe')
  const [settled, setSettled] = useState(false)
  const [pick, setPick] = useState(-1)
  const [tools, setTools] = useState(false)
  const [book, setBook] = useState(0)
  const [out, setOut] = useState(false)

  const drag = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const wheel = useRef({ x: 0, locked: false })
  const timers = useRef<{ flat?: number; swap?: number }>({})

  useEffect(() => {
    const t = timers.current
    return () => { clearTimeout(t.flat); clearTimeout(t.swap) }
  }, [])

  const grid = mode === 'grid'
  const R = BOOKS[book].R

  const chooseBook = (b: number) => {
    if (b === book) return
    setMode('globe'); setPick(-1); setOut(true); setSettled(false); setTools(false)
    clearTimeout(timers.current.flat)
    clearTimeout(timers.current.swap)
    timers.current.swap = window.setTimeout(() => { setBook(b); setOut(false) }, 520)
  }

  const step = (dir: number) => {
    if (pick >= 0) return
    const b = book + dir
    if (b >= 0 && b < BOOKS.length) chooseBook(b)
  }

  const toGrid = () => {
    setMode('grid'); setSettled(false)
    clearTimeout(timers.current.flat)
    timers.current.flat = window.setTimeout(() => setSettled(true), 1000)
  }

  const toGlobe = () => {
    clearTimeout(timers.current.flat)
    setMode('globe'); setPick(-1); setSettled(false)
  }

  const onPointerDown = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true
      window.setTimeout(() => { swiped.current = false }, 60)
      step(dx < 0 ? 1 : -1)
    }
  }
  const onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || wheel.current.locked) return
    wheel.current.x += e.deltaX
    if (Math.abs(wheel.current.x) > 70) {
      step(wheel.current.x > 0 ? 1 : -1)
      wheel.current = { x: 0, locked: true }
      window.setTimeout(() => { wheel.current.locked = false }, 800)
    }
  }

  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => {
    const r = R[i % R.length]
    const y = 1 - (2 * (i + 0.5)) / TILE_COUNT
    const lat = (Math.asin(y) * 180) / Math.PI
    const lon = (i * 137.508) % 360
    const inGrid = grid && i < R.length
    const tf = out
      ? 'translate3d(0px, 0px, 0px) scale(.12)'
      : grid
        ? inGrid ? `translate3d(${gpos(i)[0]}px, ${gpos(i)[1]}px, 0) scale(1)` : 'translate3d(0px, 0px, -600px) scale(.3)'
        : `rotateY(${lon.toFixed(1)}deg) rotateX(${(-lat).toFixed(1)}deg) translateZ(${RADIUS}px) scale(.56)`
    const gone = out || settled || (grid && !inGrid)
    return { i, r, tf, gone }
  })

  const lastY = gpos(R.length - 1)[1]
  const picked = pick >= 0 ? R[pick] : null

  return (
    <div className="hv-stage">
      <div className="hv-screen ex-screen" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onWheel={onWheel}>
        <div className="ex-persp">
          <div className={grid ? 'ex-globe' : 'ex-globe is-spinning'}>
            {tiles.map(({ i, r, tf, gone }) => (
              <button key={i} type="button" className="ex-tile" aria-label={`${r.name}, ${r.mins} minutes, ${r.level}`}
                aria-hidden={gone} tabIndex={gone ? -1 : grid || i === 0 ? 0 : -1}
                style={{ background: r.bg, transform: tf, opacity: gone ? 0 : 1, pointerEvents: gone ? 'none' : 'auto' }}
                onClick={() => { if (swiped.current) return; if (!grid) toGrid(); else setPick(i % R.length) }}>
                <CardFace r={r} />
              </button>
            ))}
          </div>
        </div>

        {grid && settled && (
          <div className="ex-scroll">
            <div className="ex-nudge" style={{ height: 339 + lastY + 240 }}>
              {R.map((r, k) => (
                <button key={k} type="button" className="ex-tile ex-tile--flat" aria-label={`${r.name}, ${r.mins} minutes, ${r.level}`}
                  style={{ left: 320 + gpos(k)[0] - 90, top: 339 + gpos(k)[1] - 90, background: r.bg }}
                  onClick={() => { if (!swiped.current) setPick(k) }}>
                  <CardFace r={r} />
                </button>
              ))}
            </div>
          </div>
        )}

        {grid && (
          <>
            <div aria-hidden="true" className="ex-frost ex-frost--top" />
            <div aria-hidden="true" className="ex-frost ex-frost--bottom" />
          </>
        )}

        <div className="ex-books" role="group" aria-label="Cookbooks, swipe left or right to switch">
          {BOOKS.map((b, i) => {
            const o = i - book
            const cur = o === 0
            return (
              <button key={b.label} type="button" className="hv-tap ex-book" aria-current={cur} tabIndex={cur ? 0 : -1}
                aria-label={cur ? `${b.label}, ${b.R.length} recipes, open now` : `Switch to ${b.label}`}
                style={{ transform: `translateX(calc(-50% + ${o * 270}px)) scale(${cur ? 1 : 0.86})`, opacity: cur ? 1 : 0, filter: `blur(${cur ? 0 : 4}px)` }}
                onClick={() => { if (!swiped.current) chooseBook(i) }}>
                <span className="ex-book__label">{b.label}</span>
                <span className="ex-book__count" style={{ opacity: cur ? 1 : 0 }}>{b.R.length} recipes</span>
              </button>
            )
          })}
        </div>
        <div aria-hidden="true" className="ex-dots">
          {BOOKS.map((b, i) => (
            <span key={b.label} style={{ width: i === book ? 18 : 6, background: i === book ? '#fff' : 'rgba(255, 255, 255, .45)' }} />
          ))}
        </div>

        {grid && (
          <button type="button" className="hv-tap hv-blurin ex-back" onClick={toGlobe}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="10" cy="10" r="7" /><path d="M3 10h14M10 3c2.5 2 2.5 12 0 14M10 3c-2.5 2-2.5 12 0 14" />
            </svg>
            Back to globe
          </button>
        )}

        <button type="button" className="hv-tap ex-notch" aria-expanded={tools} aria-label="Hardware notch. Press to show the tools."
          style={{ background: tools ? 'var(--ink)' : 'var(--ink-faint)' }} onClick={() => setTools((t) => !t)} />
        <div className="ex-tools" role="group" aria-label="Tools" style={{ pointerEvents: tools ? 'auto' : 'none' }}>
          {TOOLS.map((t, i) => (
            <button key={t.label} type="button" className="hv-tap ex-tool" tabIndex={tools ? 0 : -1} onClick={() => setTools(false)}
              style={{ transform: `translateX(${tools ? 0 : -110}px) scale(${tools ? 1 : 0.6})`, opacity: tools ? 1 : 0, transitionDelay: `${tools ? i * 0.06 : (2 - i) * 0.04}s` }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
              {t.label}
            </button>
          ))}
        </div>

        {picked && (
          <div className="ex-pick">
            <div className="hv-blurin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <div className="ex-pick__card" style={{ background: picked.bg }}>
                {picked.photo && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ex-photo" src="/assets/lelawar-photo.png" alt="Lelawar in a dark bowl on a banana leaf" />
                    <span aria-hidden="true" className="ex-shade" />
                  </>
                )}
                <p className="ex-pick__meta" style={{ color: picked.ink }}>{picked.mins} mins<br /><span style={{ fontWeight: 300 }}>{picked.level}</span></p>
                <p className="ex-pick__name" style={{ color: picked.ink }}>{picked.name}</p>
              </div>
              <p className="hv-voice__small">{BOOKS[book].from}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="hv-tap ex-pill" onClick={() => setPick(-1)}>Back</button>
                <button type="button" className="hv-tap ex-pill ex-pill--dark" onClick={() => { onOpenRecipe?.(picked.name); setPick(-1) }}>Open recipe</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="hv-caption">Explore recipes. Swipe left or right to switch cookbooks, tap the globe to lay the cards out, and press the notch on the left edge for tools.</p>
    </div>
  )
}
