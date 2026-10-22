'use client'

import './fridge.css'
import { HomeViewBoard, type HomeViewHandle } from '@/boards/HomeView'
import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { changeCookbooks, useCookbooks } from '@/cookbook/client'
import { OMA_ID, cleanBookName, nameFromSpeech, newId, type Cookbook, type SavedRecipe } from '@/cookbook/model'
import { hearOnce } from '@/voice/hearOnce'
import { MorphBot } from '@/grandma/MorphBot'
import { RecipePage } from '@/cookbook/RecipePage'

/* 10 Fridge cookbooks. Each cookbook is a retro fridge; its recipes are postcard notes held on by magnets.
   You see a fridge whole, then the camera zooms in until the door fills the screen. Swipe between fridges,
   drag notes anywhere, tap a note to dive into it. */

const W = 600
const H = 1240
const GAP = 300
const NW = 130
const NH = 150
// Lawar Bali, the featured recipe, is its own taller card: a grid of dots, the name big at the foot.
const LAWAR_NH = 188
// Make your own is the same tall card, Lawar Bali's companion. Saved recipes are the shorter postcards.
const noteH = (kind?: 'recipe' | 'saved' | 'new') => (kind === 'new' || kind === 'recipe' ? LAWAR_NH : NH)
// Its 3 × 3 dots, white or apricot, row by row.
const LAWAR_DOTS = [[1, 0, 0], [1, 0, 0], [1, 1, 1]]
// Camera: the whole fridge, or zoomed in until the door fills the screen.
const VIEWS = { over: { k: 0.48, fx: 300, fy: 630 }, door: { k: 1.6, fx: 300, fy: 632 } } as const
type View = keyof typeof VIEWS

type Recipe = [name: string, mins: number, level: string]
// Lawar Bali is built into Oma Lien's fridge; every other card comes from the shared cookbooks (see src/cookbook).
const LAWAR: Recipe = ['Lawar Bali', 40, 'Hard']
type Book = { id: string; name: string; badge: string; label: string; owner: string; base: string; lawar: boolean; saved: SavedRecipe[] }
// A fridge's name drives its chrome badge, its cookbook's label and the owner line on its cards.
const bookFrom = (c: Cookbook): Book => ({
  id: c.id,
  name: c.name,
  badge: c.name ? c.name.toUpperCase() : 'NEW BOOK',
  label: c.name ? `${c.name}’s cookbook` : 'New cookbook',
  owner: c.name ? `${c.name}’s recipe` : 'Your recipe',
  base: c.colour,
  lawar: c.id === OMA_ID,
  saved: c.recipes,
})
// Where cards sit on the door, by how many cards the fridge has (the last is always Make your own): [x, y, rotation].
type Spot = [number, number, number]
const LAYOUTS: Record<number, Spot[]> = {
  1: [[200, 520, 2]],
  2: [[122, 500, -4], [318, 522, 3]],
  3: [[118, 470, -4], [300, 458, 3], [212, 652, 2]],
  4: [[118, 470, -4], [300, 458, 3], [126, 650, 2], [306, 640, -3]],
}
// Where Oma Lien's main card starts: the door view first opens on it.
const START_SPOT = LAYOUTS[2][0]
// Postcard colours: [card, top band, bottom band].
const CARDS = [['#f6c945', '#e7b82e', '#f9da7a'], ['#86cfab', '#70bd97', '#a9e0c4'], ['#86a9ef', '#7095e0', '#a9c3f6'], ['#efe6d2', '#e2d6bc', '#f7f0e2']]
// Make your own: grey card, lighter foot band.
const NEWCARD = ['#d4d4d4', '#d4d4d4', '#dcdcdc']
const MAGS = [['#7a7570', '#1f1c19', '#000000'], ['#ffd27a', '#e0a21c', '#8a5a00'], ['#9fb7ff', '#3546a8', '#1d2a6b'], ['#a8e0b0', '#2c6a39', '#143a1c']]
const ICON = {
  clock: 'M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M10 6.5V10l2.4 1.5',
  level: 'M4 15v-3M8 15V9M12 15V6M16 15V3',
  history: 'M3.5 10a6.5 6.5 0 1 0 2-4.7 M3 3v3.5h3.5 M10 6.5V10l2.4 1.5',
  plus: 'M10 4v12M4 10h12',
  zoomOut: 'M8.5 3a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z M12.5 12.5L17 17 M6 8.5h5',
  zoomIn: 'M8.5 3a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z M12.5 12.5L17 17 M6 8.5h5 M8.5 6v5',
}
const FRIDGE_RADIUS = '130px 130px 34px 34px / 104px 104px 34px 34px'

type Item = { kind: 'recipe'; r: Recipe } | { kind: 'saved'; s: SavedRecipe } | { kind: 'new' }
const itemsOf = (b: Book): Item[] => [
  ...(b.lawar ? [{ kind: 'recipe' as const, r: LAWAR }] : []),
  ...b.saved.map((s) => ({ kind: 'saved' as const, s })),
  { kind: 'new' as const },
]
// Cards are known by what they are, not where they sit, so a new magnet doesn't move the ones already placed.
const itemKey = (it: Item | undefined) => (it?.kind === 'recipe' ? 'lawar' : it?.kind === 'saved' ? it.s.id : 'new')
// Where the k-th of n cards starts. Past four, they settle in two columns down the door, alternately tilted.
const spotFor = (n: number, k: number): Spot => (n <= 4
  ? [...LAYOUTS[Math.max(1, n)][k]] as Spot
  : [k % 2 ? 306 : 118, Math.min(DOOR_BOTTOM - LAWAR_NH, 458 + Math.floor(k / 2) * 168), k % 2 ? 3 : -3])
function cardFor(bi: number, k: number, kind: Item['kind']) {
  if (kind === 'new') return { paper: NEWCARD[0], top: NEWCARD[1], bottom: NEWCARD[2] }
  if (kind === 'recipe') return { paper: '#ff4a00', top: '#ff4a00', bottom: '#ff7350' }
  const c = CARDS[(bi * 2 + k) % CARDS.length]
  return { paper: c[0], top: c[1], bottom: c[2] }
}
// At the door the screen shows 400 units of the fridge; it scrolls between its top and bottom.
const DOOR_FY: number = VIEWS.door.fy
const DOOR_HALF = 320 / VIEWS.door.k
const clampFy = (fy: number) => Math.max(DOOR_HALF, Math.min(H - DOOR_HALF, fy))
function camFor(view: View, i: number, doorFy: number = DOOR_FY) {
  const v = VIEWS[view]
  const fy = view === 'door' ? doorFy : v.fy
  const ox = i * (W + GAP)
  return { k: v.k, tx: 320 - (ox + v.fx) * v.k, ty: 320 - fy * v.k }
}
const camTransform = (c: { k: number; tx: number; ty: number }) => `translate(${Math.round(c.tx)}px, ${Math.round(c.ty)}px) scale(${c.k})`
// Notes stay on the main door: below the freezer seal, above the ribbed base, inside the fridge's sides.
const DOOR_TOP = 396
const DOOR_BOTTOM = 1138
const DOOR_SIDE = 14

function Icon({ d, size = 20, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

// Four corners turned inwards: the page shrinks back onto the fridge. Square ends and corners, as drawn.
function ShrinkIcon() {
  return (
    <svg width={30} height={30} viewBox="350 275 628 628" fill="none" stroke="currentColor" strokeWidth={39} strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
      <path d="M584.5 275V509.5H350 M743.5 275V509.5H978 M350 669.5H584.5V903 M978 669.5H743.5V903" />
    </svg>
  )
}

function ChiliMagnet() {
  return (
    <svg className="fz-chili" width="40" height="58" viewBox="0 0 40 58" aria-hidden="true">
      <path d="M14 4c3 2 9 2 12 0 M16 3l3 9 M24 3l-3 9" fill="none" stroke="#a07a45" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="20" cy="10" r="3.4" fill="#2b2a2a" />
      <path d="M18.5 14c-5 6-8.5 16-11.5 30 3.5-3.5 8-13 12.5-29z" fill="#c8161d" />
      <path d="M20 15c-1.5 11-3 22-4.5 37 3.8-6 6-19 6-36z" fill="#a30f16" />
      <path d="M21.5 14c4 6 7.5 15 11 27-4-3-7.8-11-12-26z" fill="#d7261f" />
      <path d="M20.8 15c2.6 9 4.2 19 4.6 31-2.8-5-4.4-16-5.4-30z" fill="#b5161a" />
      <path d="M12 26c-1.5 3-2.6 6.5-3.4 10 M18.4 24c-.6 5-1.2 10-1.6 15 M26 25c1.4 3.5 2.6 7 3.6 11" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1" strokeLinecap="round" />
      <path d="M17 14.5l1.8-2 M20 15l0-2.6 M22.6 14.4l-1.6-2" fill="none" stroke="#3f6b2a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Every copy of a card face (the note on the door, and the card that grows out of it) moves in step,
// all timed from when the first one appeared, so opening a note never makes its face jump.
let faceEpoch: CSSNumberish | null = null
function useInStep() {
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el?.getAnimations) return
    for (const a of el.getAnimations({ subtree: true })) {
      faceEpoch ??= document.timeline.currentTime
      a.startTime = faceEpoch
    }
  }, [])
  return ref
}

// The Lawar Bali card's face: the dots, then the name big at the foot. Drawn on the note, and on the card that grows out of it.
// Each dot fades between white and apricot in turn, a slow ripple across the grid; it starts on the drawn pattern.
function LawarFace({ name, mins, owner, foot }: { name: string; mins: number; owner: string; foot: string }) {
  const dots = useInStep()
  return (
    <>
      <svg ref={dots} className="fz-lawar__dots" viewBox="0 0 130 128" aria-hidden="true">
        {LAWAR_DOTS.flatMap((row, r) => row.map((white, col) => (
          <circle key={`${r}-${col}`} cx={24.2 + col * 40.3} cy={30.2 + r * 37.3} r="14.3" fill={white ? '#ffffff' : '#ffa24f'}
            style={{ animationDelay: `${-((white ? 0 : 4) + (r + col) * 0.4)}s` }} />
        )))}
      </svg>
      <span className="fz-lawar__name">{name}</span>
      <span className="fz-lawar__mins">{mins} mins</span>
      <span className="fz-lawar__owner">{owner.replace('recipe', 'Recipe')}</span>
      <span className="fz-lawar__foot" style={{ background: foot }}>Version 1</span>
    </>
  )
}

// Make your own's face: a white ring held by four corner brackets, an orange dot on it, the name big, and a foot band
// that starts the recording. Drawn in the design's own px (1387 wide), scaled to the 130-wide card. The dot travels round the ring.
function MakeFace({ owner, foot }: { owner: string; foot: string }) {
  const art = useInStep()
  const bars = (x: number) => [
    <rect key={`v${x}t`} x={x} y="172" width="63" height="200" />, <rect key={`v${x}b`} x={x} y="1101" width="63" height="182" />,
  ]
  return (
    <>
      <svg ref={art} className="fz-make__art" viewBox="0 0 1387 1400" aria-hidden="true">
        <g fill="#ffffff">
          <circle cx="693" cy="741" r="484.25" fill="none" stroke="#ffffff" strokeWidth="208.5" />
          {bars(247)}{bars(1077)}
          <rect x="130" y="290" width="200" height="63" /><rect x="1057" y="290" width="200" height="63" />
          <rect x="130" y="1101" width="200" height="63" /><rect x="1057" y="1101" width="200" height="63" />
        </g>
        <circle className="fz-make__dot" cx="213" cy="845" r="32" fill="#ff4a00" />
      </svg>
      <span className="fz-make__title">Make your own</span>
      <span className="fz-make__owner">{owner.replace('recipe', 'Recipe')}</span>
      <span className="fz-make__foot" style={{ background: foot }}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="10" cy="10" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
        Start Recording
      </span>
    </>
  )
}

// The chrome name on the fridge's top door. On the fridge in front, tapping it makes the name itself editable, in place
// and in the same chrome letters: delete and type. Enter or tapping away keeps the new name, Escape keeps the old one.
function FridgeName({ book, current, onRename }: { book: Book; current: boolean; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const cancelled = useRef(false)
  if (!current) return <p className="fz-badge" aria-hidden="true">{book.badge}</p>
  if (editing) {
    const done = (value: string) => {
      setEditing(false)
      const name = cleanBookName(value)
      if (!cancelled.current && name && name !== book.name) onRename(name)
      cancelled.current = false
    }
    return (
      <input className="fz-badge fz-badge--edit" aria-label="Fridge name" defaultValue={book.name} maxLength={14} autoFocus
        onFocus={(e) => e.currentTarget.select()} onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
        }}
        onBlur={(e) => done(e.currentTarget.value)} />
    )
  }
  return (
    <button type="button" className="fz-badge fz-badge--btn" aria-label={`Rename ${book.label}`} onClick={() => setEditing(true)}>{book.badge}</button>
  )
}

/**
 * Naming a new fridge, in the Grandma screen's own layout: the question big at the top, the name written underneath as
 * she says it (or types it, straight onto the page, no box), and the clay listening at the foot (tap it to say it again).
 * Close and Save sit in the white pill top right. The name is picked out of what was said (“It's Uncle Budi's cookbook”
 * → Uncle Budi). Enter keeps it, Escape (or close) leaves the fridge as it was.
 */
function FridgeNamer({ book, fresh, onSave, onClose }: { book: Book; fresh: boolean; onSave: (name: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(book.name)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [problem, setProblem] = useState('')
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const listen = async () => {
    if (listening) return
    setListening(true)
    setHeard('')
    setProblem('')
    try {
      const words = await hearOnce({ onWords: (w) => { if (alive.current) setHeard(w) } })
      if (!alive.current) return
      const name = nameFromSpeech(words)
      if (name) setValue(name)
      else setProblem('I didn’t catch a name. Tap me and try again, or type it.')
    } catch {
      if (alive.current) setProblem('The microphone is off. Type the name instead.')
    } finally {
      if (alive.current) setListening(false)
    }
  }
  const listenRef = useRef(listen)
  listenRef.current = listen
  // A new fridge listens for its name at once (the tap that made it is the gesture the microphone needs).
  useEffect(() => { if (fresh) void listenRef.current() }, [fresh])
  const save = () => {
    const name = cleanBookName(value)
    if (name && name !== book.name) onSave(name)
    onClose()
  }
  const live = listening && heard ? nameFromSpeech(heard) : ''
  return (
    <div className="fz-namer" role="dialog" aria-label={fresh ? 'Name the new fridge' : `Rename ${book.label}`} onPointerDown={(e) => e.stopPropagation()}>
      <form className="fz-namer__page" onSubmit={(e) => { e.preventDefault(); save() }}>
        <h2 className="fz-namer__title">{fresh ? 'Whose cookbook is this?' : 'What should this fridge be called?'}</h2>
        <input className="fz-namer__name" aria-label="Fridge name" value={live || value} maxLength={24} placeholder="Type a name" autoComplete="off"
          onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }} />
        <div className="fz-namer__actions">
          <button type="button" aria-label="Not now" onClick={onClose}><Icon d="M5.5 5.5l9 9M14.5 5.5l-9 9" size={22} width={1.8} /></button>
          <button type="submit" aria-label="Save" disabled={!cleanBookName(live || value)}><Icon d="M4.5 10.5l3.6 3.6 7.4-8" size={22} width={1.9} /></button>
        </div>
      </form>
      <button type="button" className={`fz-namer__clay${listening ? ' is-listening' : ''}`} aria-label={listening ? 'Listening' : 'Say the name'} onClick={() => void listen()}>
        <MorphBot size={96} paused={!listening} />
      </button>
      <p className="fz-namer__hint" aria-live="polite">{listening ? (heard ? `“${heard}”` : 'Listening…') : problem || 'Tap me to say it'}</p>
    </div>
  )
}

// The fridge body: rolled sides, domed top, freezer door and seal, chrome hinge, ribbed base and handles.
function FridgeBody({ base }: { base: string }) {
  return (
    <>
      <div className="fz-floor" aria-hidden="true" />
      <div className="fz-body" aria-hidden="true" style={{ background: base }}>
        <div className="fz-body__sides" />
        <div className="fz-body__dome" />
        <div className="fz-body__shade" />
        <div className="fz-body__freezer" />
        <div className="fz-body__seal" />
        <div className="fz-body__door" />
        <div className="fz-body__hinge" />
        <div className="fz-body__ribs" />
      </div>
      <div className="fz-handle fz-handle--top" aria-hidden="true"><div className="fz-handle__post" /><div className="fz-handle__bar" /><div className="fz-handle__shine" /></div>
      <div className="fz-handle fz-handle--bottom" aria-hidden="true"><div className="fz-handle__post" /><div className="fz-handle__bar" /><div className="fz-handle__shine" /></div>
    </>
  )
}

type Open = { b: number; k: number }
type Drag = { bi: number; k: number; key: string; rot: number; sx: number; sy: number; ox: number; oy: number; moved: boolean; u: number; fy: number }

type FridgeProps = {
  /** Start cooking, from the recipe home view inside the fridge: leads to the cooking-step screen. */
  onStartCooking?: () => void
  /** Make your own, on a fridge: hands the display over to Grandma's screen to tell that fridge a new recipe.
      Without it, the page moves to /grandma. */
  onRecord?: (book: { id: string; name: string }) => void
  /** Open straight onto Lawar Bali (e.g. handed over from the grandma screen). */
  startOpen?: boolean
  /** Whether the screen is showing; the opening zoom waits until it is. */
  active?: boolean
  /** Bumped to close the open note back onto the fridge door (e.g. Done at the end of cooking). */
  closeRequest?: number
  /** Lets a host (the voice page) reach the recipe screen's voice island. */
  homeRef?: React.Ref<HomeViewHandle>
  /** Bumped (`n`) to go to a fridge and pop one of its cards, e.g. a recipe just saved from Grandma's screen. */
  focus?: { book: string; recipe?: string; n: number }
}

export function FridgeScreen({ onStartCooking, onRecord, startOpen = false, active = true, closeRequest = 0, homeRef, focus }: FridgeProps) {
  const router = useRouter()
  const cookbooks = useCookbooks()
  const books = useMemo(() => cookbooks.books.map(bookFrom), [cookbooks])
  const [i, setI] = useState(0)
  const [view, setView] = useState<View>(startOpen ? 'door' : 'over')
  // Where the door view is scrolled to (its centre, in world units). A scroll writes the camera straight to the DOM,
  // so the door stays under the finger; React only re-renders as a scroll starts and once it settles.
  const fyRef = useRef(clampFy(START_SPOT[1] + noteH('recipe') / 2))
  const fyTarget = useRef(fyRef.current)
  const camEl = useRef<HTMLDivElement>(null)
  const [panning, setPanning] = useState(false)
  const panningRef = useRef(false)
  const panIdle = useRef<number | undefined>(undefined)
  const glide = useRef(0)
  // Zooming in aims the door view at the fridge's main card (its first), or the card asked for, wherever it has been moved to.
  const aimAt = (bi: number, k = 0) => {
    cancelAnimationFrame(glide.current)
    glide.current = 0
    const spot = spotIn(posRef.current, bi, k)
    fyRef.current = fyTarget.current = clampFy(spot[1] + noteH(kindAt(bi, k)) / 2)
  }
  // What a fridge's k-th card is; a fridge being added (not in this render yet) holds only Make your own.
  const kindAt = (bi: number, k: number) => (bi < books.length ? itemsOf(books[bi])[k]?.kind : 'new')
  const aimRef = useRef(aimAt)
  aimRef.current = aimAt
  const settle = () => {
    window.clearTimeout(panIdle.current)
    panIdle.current = window.setTimeout(() => {
      if (glide.current) return settle()
      panningRef.current = false
      setPanning(false)
    }, 160)
  }
  // A finger moves the door 1:1; a wheel glides it the rest of the way, a little each frame.
  const scrollTo = (fy: number, smooth = false) => {
    fyTarget.current = clampFy(fy)
    if (!panningRef.current) { panningRef.current = true; setPanning(true) }
    const paint = () => { if (camEl.current) camEl.current.style.transform = camTransform(camFor('door', i, fyRef.current)) }
    const follow = () => {
      const gap = fyTarget.current - fyRef.current
      fyRef.current = Math.abs(gap) < 0.5 ? fyTarget.current : fyRef.current + gap * 0.3
      paint()
      glide.current = fyRef.current === fyTarget.current ? 0 : requestAnimationFrame(follow)
    }
    cancelAnimationFrame(glide.current)
    glide.current = 0
    if (smooth) glide.current = requestAnimationFrame(follow)
    else { fyRef.current = fyTarget.current; paint() }
    settle()
  }
  const [ready, setReady] = useState(startOpen)
  const [fresh, setFresh] = useState(-1)
  // Where cards have been dragged to, by fridge and card; the rest sit where their fridge's layout puts them.
  const [pos, setPos] = useState<Record<string, Spot>>({})
  const posRef = useRef(pos)
  posRef.current = pos
  const keyOf = (bi: number, k: number) => `${books[bi]?.id ?? 'next'}:${itemKey(books[bi] ? itemsOf(books[bi])[k] : undefined)}`
  const spotIn = (placed: Record<string, Spot>, bi: number, k: number): Spot => placed[keyOf(bi, k)] ?? spotFor(books[bi] ? itemsOf(books[bi]).length : 1, k)
  // The cards picked up most recently sit on top, in the order they were last touched.
  const [raised, setRaised] = useState<string[]>([])
  // A card that has just arrived (a recipe saved from Grandma's screen) pops onto the door.
  const [popped, setPopped] = useState<string | null>(null)
  // A new fridge being named: it asks whose cookbook it is and listens at once.
  const [naming, setNaming] = useState<{ id: string; fresh: boolean } | null>(null)
  const [dragging, setDragging] = useState<[number, number] | null>(null)
  const [open, setOpen] = useState<Open | null>(startOpen ? { b: 0, k: 0 } : null)
  const [phase, setPhase] = useState(startOpen ? 2 : 0)

  const root = useRef<HTMLDivElement>(null)
  const lock = useRef(0)
  const acc = useRef(0)
  const accT = useRef<number | undefined>(undefined)
  const drag = useRef<Drag | null>(null)
  const suppress = useRef(false)
  const down = useRef<{ x: number; y: number; fy: number; pan: boolean } | null>(null)
  const timers = useRef<Record<string, number | undefined>>({})
  const later = (name: string, ms: number, fn: () => void) => {
    window.clearTimeout(timers.current[name])
    timers.current[name] = window.setTimeout(fn, ms)
  }
  useEffect(() => () => {
    Object.values(timers.current).forEach((t) => window.clearTimeout(t))
    window.clearTimeout(accT.current)
    window.clearTimeout(panIdle.current)
    cancelAnimationFrame(glide.current)
  }, [])

  // On first showing: the world fades in, whole, then zooms to the door.
  const started = useRef(startOpen)
  useEffect(() => {
    if (!active || started.current) return
    started.current = true
    let shown = false
    const ready = window.setTimeout(() => { shown = true; setReady(true) }, 60)
    timers.current.zoom = window.setTimeout(() => { aimRef.current(0); setView('door') }, 1100)
    return () => {
      // Torn down before it showed (e.g. React's dev double-run): let the next run start it again.
      if (shown) return
      window.clearTimeout(ready)
      window.clearTimeout(timers.current.zoom)
      started.current = false
    }
  }, [active])

  const last = books.length

  // Every fridge is seen whole first: zoom out, slide over, then zoom into its door.
  const go = (to: number) => {
    if (open) return
    const n = Math.max(0, Math.min(last, to))
    if (n === i) return
    window.clearTimeout(timers.current.zoom)
    // Each camera move takes .85s (.fz-cam): out, then the slide, then in.
    lock.current = Date.now() + 2000
    const wait = view === 'door' ? 600 : 0
    setView('over')
    later('slide', wait, () => { aimAt(n); setI(n) })
    if (n < last) later('zoom', wait + 1250, () => setView('door'))
  }
  const step = (d: number) => { if (Date.now() >= lock.current) go(i + d) }

  const addFridge = () => {
    const n = books.length
    const id = newId('fridge')
    void changeCookbooks({ type: 'add_book', id })
    setFresh(n)
    setI(n)
    aimAt(n)
    setView('over')
    lock.current = Date.now() + 1350
    later('zoom', 850, () => { setView('door'); setFresh(-1) })
    // Once it's in view, it asks whose cookbook it is.
    later('name', 1500, () => setNaming({ id, fresh: true }))
  }

  // One world unit in screen px: the screen's real on-screen scale times the camera's.
  const unit = () => {
    const r = root.current?.getBoundingClientRect()
    return (r && r.width ? r.width / 640 : 1) * VIEWS[view].k
  }

  const startDrag = (event: ReactPointerEvent, bi: number, k: number) => {
    if (open || bi !== i) return
    event.stopPropagation()
    const p = spotIn(pos, bi, k)
    const key = keyOf(bi, k)
    drag.current = { bi, k, key, rot: p[2], sx: event.clientX, sy: event.clientY, ox: p[0], oy: p[1], moved: false, u: unit(), fy: fyRef.current }
    setRaised((cur) => [...cur.filter((x) => x !== key), key])
    setDragging([bi, k])
  }

  // Make your own's hand-over to Grandma's screen, waiting for the card to finish turning white.
  const handOff = useRef<(() => void) | null>(null)
  const openNote = (k: number) => {
    if (open) return
    window.clearTimeout(timers.current.out)
    setOpen({ b: i, k })
    setPhase(0)
    setDragging(null)
    later('p1', 30, () => setPhase(1))
    // Make your own goes straight to Grandma's screen: the card grows to fill the display, turning the white of her new
    // note on the way, and the moment it is white (its colour transition ends, see the fly below) the display dissolves
    // into her note (in the kitchen) or the page moves to /grandma. A timer stands in when there are no transitions.
    if (itemsOf(books[i])[k].kind === 'new') {
      const book = { id: books[i].id, name: books[i].name }
      handOff.current = () => {
        handOff.current = null
        window.clearTimeout(timers.current.record)
        if (onRecord) onRecord(book)
        else router.push('/grandma')
        // When the fridge is out of sight, the card is put back, ready for when you come back.
        later('close', 1200, () => { setOpen(null); setPhase(0) })
      }
      later('record', 900, () => handOff.current?.())
      return
    }
    // The page starts fading in over the card's colour just before the card has finished growing.
    later('p2', 520, () => setPhase(2))
  }
  // Closing runs it backwards: the page fades out over the card's colour (3), then the card shrinks back onto its note (0).
  // With `whole` (the back button), once the card has landed the camera carries on out to the whole fridge.
  const closeNote = (whole = false) => {
    if (!open || phase === 3) return
    window.clearTimeout(timers.current.p2)
    setPhase(3)
    later('p1', 240, () => setPhase(0))
    later('close', 240 + 680, () => setOpen(null))
    if (whole) later('out', 240 + 680 + 120, () => setView('over'))
  }
  // Asked from outside (Done at the end of cooking): fold the open note back onto the door.
  const closeRef = useRef(closeNote)
  closeRef.current = closeNote
  useEffect(() => { if (closeRequest) closeRef.current() }, [closeRequest])

  // Asked from outside (a recipe just saved from Grandma's screen): close anything open, glide to that fridge's door,
  // aim at the new card and pop it on.
  const focusRef = useRef(() => {})
  focusRef.current = () => {
    if (!focus) return
    const n = books.findIndex((b) => b.id === focus.book)
    if (n < 0) return
    const k = focus.recipe ? itemsOf(books[n]).findIndex((it) => it.kind === 'saved' && it.s.id === focus.recipe) : 0
    started.current = true
    setReady(true)
    setOpen(null)
    setPhase(0)
    Object.values(timers.current).forEach((t) => window.clearTimeout(t))
    setView('over')
    later('slide', n === i ? 0 : 300, () => { aimAt(n, Math.max(0, k)); setI(n) })
    later('zoom', n === i ? 500 : 1200, () => setView('door'))
    if (k >= 0 && focus.recipe) {
      const key = `${focus.book}:${focus.recipe}`
      later('pop', n === i ? 1100 : 1800, () => setPopped(key))
      later('unpop', (n === i ? 1100 : 1800) + 1200, () => setPopped(null))
    }
  }
  useEffect(() => { if (focus?.n) focusRef.current() }, [focus?.n])
  const clickNote = (bi: number, k: number) => {
    if (suppress.current) { suppress.current = false; return }
    if (bi === i) openNote(k)
  }

  const onDown = (event: ReactPointerEvent) => {
    // The fridge handles its own swipes; the kitchen around it shouldn't also turn the page.
    event.stopPropagation()
    down.current = { x: event.clientX, y: event.clientY, fy: fyRef.current, pan: false }
  }
  const onMove = (event: ReactPointerEvent) => {
    const d = drag.current
    if (!d) {
      // Dragging empty door up or down scrolls the fridge (at the door, with nothing open).
      const dn = down.current
      if (!dn || open || view !== 'door') return
      const dx = event.clientX - dn.x
      const dy = event.clientY - dn.y
      if (!dn.pan && (Math.abs(dy) < 6 || Math.abs(dy) < Math.abs(dx) * 1.3)) return
      dn.pan = true
      scrollTo(dn.fy - dy / unit())
      return
    }
    // The camera may have scrolled since the drag began: the note stays under the finger.
    const dx = (event.clientX - d.sx) / d.u
    const dy = (event.clientY - d.sy) / d.u + (fyRef.current - d.fy)
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return
    d.moved = true
    const h = noteH(kindAt(d.bi, d.k))
    const x = Math.max(DOOR_SIDE, Math.min(W - NW - DOOR_SIDE, d.ox + dx))
    const y = Math.max(DOOR_TOP, Math.min(DOOR_BOTTOM - h, d.oy + dy))
    setPos((cur) => ({ ...cur, [d.key]: [x, y, d.rot] }))
    // Carrying a note past the top or bottom of the screen scrolls the fridge with it.
    if (view === 'door') {
      const fy = fyRef.current
      if (y + h > fy + DOOR_HALF - 16) scrollTo(fy + Math.min(14, y + h - (fy + DOOR_HALF - 16)))
      else if (y < fy - DOOR_HALF + 16) scrollTo(fy - Math.min(14, fy - DOOR_HALF + 16 - y))
    }
  }
  const onUp = (event: ReactPointerEvent) => {
    const d = drag.current
    if (d) {
      drag.current = null
      if (d.moved) { suppress.current = true; window.setTimeout(() => { suppress.current = false }, 0) }
      setDragging(null)
      return
    }
    const dn = down.current
    down.current = null
    if (!dn || dn.pan || open || event.type === 'pointerleave') return
    const dx = event.clientX - dn.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - dn.y) * 1.3) step(dx < 0 ? 1 : -1)
  }
  // Wheel or trackpad: up and down scroll the door; sideways moves between fridges.
  const onWheel = (event: WheelEvent) => {
    if (open) return
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      if (view !== 'door') return
      event.preventDefault()
      scrollTo(fyTarget.current + event.deltaY / unit(), true)
      return
    }
    acc.current += event.deltaX
    window.clearTimeout(accT.current)
    accT.current = window.setTimeout(() => { acc.current = 0 }, 200)
    if (Math.abs(acc.current) > 40) {
      const dir = acc.current > 0 ? 1 : -1
      acc.current = 0
      step(dir)
    }
  }

  // The wheel listener is native, so it can stop the page scrolling while the door does.
  const wheelRef = useRef(onWheel)
  wheelRef.current = onWheel
  useEffect(() => {
    const el = root.current
    if (!el) return
    const listen = (event: WheelEvent) => wheelRef.current(event)
    el.addEventListener('wheel', listen, { passive: false })
    return () => el.removeEventListener('wheel', listen)
  }, [])

  const cam = camFor(view, i, fyRef.current)
  const camStyle: CSSProperties = {
    transform: camTransform(cam),
    opacity: ready ? 1 : 0,
    filter: `blur(${ready ? (open && phase > 0 ? 6 : 0) : 14}px)`,
  }

  // The note being opened: a same-colour clone flies from the note's rect to fill the screen, turning the colour of
  // the page it opens on the way (Lawar Bali's orange becomes its home view's white), so the page fades in over itself.
  let fly: CSSProperties | null = null
  let flyFace: { k: number; h: number; kind: 'lawar' | 'make'; name: string; mins: number; owner: string; foot: string } | null = null
  let page: { kind: 'main' } | { kind: 'saved'; recipe: SavedRecipe; by: string } | null = null
  if (open) {
    const ob = books[open.b]
    const it = itemsOf(ob)[open.k]
    const oc = camFor(view, open.b, fyRef.current)
    const p = spotIn(pos, open.b, open.k)
    const c = cardFor(open.b, open.k, it.kind)
    const w = NW * oc.k
    const h = noteH(it.kind) * oc.k
    const left = oc.tx + (open.b * (W + GAP) + p[0]) * oc.k
    const top = oc.ty + p[1] * oc.k
    const dx = 320 - (left + w / 2)
    const dy = 320 - (top + h / 2)
    const S = Math.max(640 / w, 640 / h) * 1.2
    const main = it.kind === 'recipe'
    // Every card turns white as it grows: Lawar Bali's and saved recipes' pages are white, and so is Grandma's new note.
    const pageBg = '#fff'
    fly = {
      left: Math.round(left), top: Math.round(top), width: Math.round(w), height: Math.round(h), background: phase > 0 ? pageBg : c.paper, borderRadius: phase > 0 ? 0 : 2,
      transform: phase > 0 ? `translate(${dx}px, ${dy}px) rotate(0deg) scale(${S.toFixed(3)})` : `rotate(${p[2]}deg)`,
    }
    // The Lawar Bali and Make your own cards carry their faces as they grow, fading them on the way.
    if (it.kind === 'recipe') flyFace = { k: oc.k, h: LAWAR_NH, kind: 'lawar', name: it.r[0], mins: it.r[1], owner: ob.owner, foot: c.bottom }
    if (it.kind === 'new') flyFace = { k: oc.k, h: LAWAR_NH, kind: 'make', name: '', mins: 0, owner: ob.owner, foot: c.bottom }
    if (main) page = { kind: 'main' }
    if (it.kind === 'saved') page = { kind: 'saved', recipe: it.s, by: `From ${ob.label}` }
  }
  const shown = !!open && phase >= 2
  const leaving = phase === 3 ? ' fz-out' : ''

  return (
    <div ref={root} className="fz" aria-label="Fridge cookbooks"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>

      <div ref={camEl} className={`fz-cam${panning ? ' is-panning' : ''}`} style={camStyle}>
        {books.map((b, bi) => {
          const d = bi - i
          const cur = d === 0
          const locked = !cur || !!open
          return (
            <div key={b.id} className={`fz-book${bi === fresh ? ' fz-pop' : ''}`} style={{ left: bi * (W + GAP), opacity: cur ? 1 : Math.abs(d) === 1 ? 0.6 : 0 }}>
              <FridgeBody base={b.base} />
              <FridgeName book={b} current={cur && !open && !naming} onRename={(name) => void changeCookbooks({ type: 'rename_book', id: b.id, name })} />
              {Math.abs(d) === 1 && !open && (
                <button type="button" className="fz-book__pick" aria-label={`Go to ${b.label}`} onClick={() => go(bi)} />
              )}
              {itemsOf(b).map((it, k) => {
                const p = spotIn(pos, bi, k)
                const c = cardFor(bi, k, it.kind)
                const mag = MAGS[(bi + k) % MAGS.length]
                const isNew = it.kind === 'new'
                const main = it.kind === 'recipe'
                const key = keyOf(bi, k)
                const lifted = !!dragging && dragging[0] === bi && dragging[1] === k
                const name = it.kind === 'recipe' ? it.r[0] : it.kind === 'saved' ? it.s.name : ''
                const mins = it.kind === 'recipe' ? it.r[1] : it.kind === 'saved' ? it.s.minutes : null
                return (
                  <button
                    key={key}
                    type="button"
                    className={`fz-note${main ? ' fz-note--lawar' : ''}${isNew ? ' fz-note--make' : ''}${lifted ? ' fz-drag' : ''}${popped === key ? ' fz-note--pop' : ''}`}
                    disabled={locked}
                    aria-label={isNew ? 'Make your own recipe. Drag to move, tap to start.' : `${name}${mins ? `, ${mins} minutes` : ''}. Drag to move, tap to open.`}
                    onPointerDown={(event) => startDrag(event, bi, k)}
                    onClick={() => clickNote(bi, k)}
                    style={{
                      left: Math.round(p[0]), top: Math.round(p[1]), height: noteH(it.kind), zIndex: 10 + k + (raised.indexOf(key) + 1) * 20, background: c.paper,
                      cursor: cur ? (lifted ? 'grabbing' : 'grab') : 'default',
                      transform: `rotate(${lifted ? 0 : p[2]}deg) scale(${lifted ? 1.06 : 1})`,
                      boxShadow: lifted ? '0 22px 30px rgba(31,28,25,.34)' : '0 6px 10px rgba(31,28,25,.24), 0 1px 2px rgba(31,28,25,.2)',
                      visibility: open && open.b === bi && open.k === k ? 'hidden' : 'visible',
                    }}
                  >
                    {main && it.kind === 'recipe' ? (
                      <LawarFace name={it.r[0]} mins={it.r[1]} owner={b.owner} foot={c.bottom} />
                    ) : isNew ? (
                      <MakeFace owner={b.owner} foot={c.bottom} />
                    ) : (
                      <>
                        <span className="fz-note__top" aria-hidden="true" style={{ background: c.top }}><span /></span>
                        <span className="fz-note__body">
                          <span className="fz-note__line">
                            <span className="fz-note__name">{name}</span>
                            {mins ? <span className="fz-note__mins">{mins} mins</span> : null}
                          </span>
                          <span className="fz-note__owner">{b.owner}</span>
                        </span>
                        <span className="fz-note__foot" style={{ background: c.bottom }}>
                          <Icon d={ICON.history} size={8} width={2} />Version 1
                        </span>
                      </>
                    )}
                    <span className="fz-note__sheen" aria-hidden="true" />
                    {main ? <ChiliMagnet /> : (
                      <span className="fz-note__magnet" aria-hidden="true" style={{ background: `radial-gradient(circle at 34% 30%, ${mag[0]}, ${mag[1]} 52%, ${mag[2]})` }} />
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}

        {/* After the last fridge: a dashed outline that builds a new one. */}
        <div className="fz-book" style={{ left: last * (W + GAP), opacity: last - i === 0 ? 1 : last - i === 1 ? 0.6 : 0 }}>
          <button type="button" className="fz-ghost" aria-label={i === last ? 'Build a new fridge for another cookbook' : 'Go to New fridge'}
            onClick={() => { if (open) return; if (i === last) addFridge(); else go(last) }}>
            <span className="fz-ghost__plus" aria-hidden="true"><Icon d="M10 3.5v13M3.5 10h13" size={70} width={2} /></span>
            <span className="fz-ghost__title">New fridge</span>
            <span className="fz-ghost__sub">A cookbook for someone else in the family</span>
          </button>
        </div>
      </div>

      <div className="fz-dots" style={{ opacity: open ? 0 : 1 }}>
        <nav aria-label="Cookbooks">
          {books.map((b, bi) => (
            <button key={b.id} type="button" className="fz-tap" aria-label={b.label} aria-current={bi === i ? 'true' : undefined} onClick={() => go(bi)}>
              <span className="fz-dot" style={{ width: bi === i ? 22 : 6, background: bi === i ? '#1f1c19' : '#a9a39b' }} />
            </button>
          ))}
          <button type="button" className="fz-tap" aria-label="New fridge" aria-current={i === last ? 'true' : undefined} style={{ color: i === last ? '#1f1c19' : '#a9a39b' }} onClick={() => go(last)}>
            <Icon d="M10 3v14M3 10h14" size={12} width={3} />
          </button>
        </nav>
      </div>

      {!open && i < last && (
        <button type="button" className="fz-tap fz-zoom" aria-label={view === 'door' ? 'See the whole fridge' : 'Zoom in to the door'} onClick={() => { if (view !== 'door') aimAt(i); setView(view === 'door' ? 'over' : 'door') }}>
          <Icon d={view === 'door' ? ICON.zoomOut : ICON.zoomIn} size={24} width={1.6} />
        </button>
      )}

      {fly && (
        <div className={`fz-fly${phase > 0 ? ' is-big' : ''}`} aria-hidden="true" style={fly}
          onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'background-color' && phase === 1) handOff.current?.() }}>
          {flyFace && (
            <div className="fz-fly__face" style={{ width: NW, height: flyFace.h, transform: `scale(${flyFace.k})`, ...(flyFace.kind === 'make' ? { '--fz-face-ink': '#0d0d0d' } : {}) } as CSSProperties}>
              {flyFace.kind === 'lawar'
                ? <><LawarFace name={flyFace.name} mins={flyFace.mins} owner={flyFace.owner} foot={flyFace.foot} /><ChiliMagnet /></>
                : <MakeFace owner={flyFace.owner} foot={flyFace.foot} />}
            </div>
          )}
        </div>
      )}

      {shown && page?.kind === 'main' && (
        <div className={`fz-in fz-page${leaving}`} style={{ background: '#fff' }}>
          <HomeViewBoard ref={homeRef} embedded clay onStartCooking={onStartCooking}
            titleActions={<button type="button" className="hm-tap" aria-label="Back to the fridge" onClick={() => closeNote(true)}><ShrinkIcon /></button>} />
        </div>
      )}

      {naming && books.some((b) => b.id === naming.id) && (
        <FridgeNamer key={naming.id} book={books.find((b) => b.id === naming.id)!} fresh={naming.fresh}
          onSave={(name) => void changeCookbooks({ type: 'rename_book', id: naming.id, name })} onClose={() => setNaming(null)} />
      )}

      {shown && page?.kind === 'saved' && (
        <article className={`fz-in fz-page${leaving}`} aria-label={page.recipe.name} style={{ background: '#fff' }}>
          <RecipePage recipe={page.recipe} by={page.by}
            actions={<button type="button" aria-label="Back to the fridge" onClick={() => closeNote(true)}><ShrinkIcon /></button>} />
        </article>
      )}
    </div>
  )
}
