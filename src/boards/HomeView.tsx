'use client'

import './home-view.css'
import { VoiceClay, type ClayPlace } from '@/clay/VoiceClay'
import type { Vec } from '@/clay/ClaySim'
import { SpeakingGlow, createSimulatedLevel, type GlowState } from '@/voice/SpeakingGlow'
import { VoiceNotification } from '@/voice/VoiceNotification'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { VersionList, initialVersions, newVersion, type VersionEntry } from './VersionHistory'
import { canPour, pourClose, pourOpen, rectIn, type Rect } from './liquid'
import { GooSegmented } from '@/goo/GooSegmented'
import Link from 'next/link'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'

/* 07b Recipe home view: the title, one sentence about the dish, a row of tags, and the photo with Ingredients and
   Start cooking floating on it. Steps, Ingredients, the versions and the photo open as centred cards over a frosted screen.
   Changes come by voice, from the talk corner. */

type AdjustPhase = 'idle' | 'listening' | 'thinking' | 'writing'
type ModKey = 'serves2' | 'mild' | 'chicken'
type Mods = Record<ModKey, boolean>
type Popup = '' | 'steps' | 'ingr' | 'photo' | 'versions'

const PHOTO = '/assets/lelawar-photo.png'
// The photo's own size; next/image serves a copy sized to where it's shown (about 590 px wide), not the 1.4 MB original.
const PHOTO_W = 1030
const PHOTO_H = 716
const PHOTO_ALT = 'Lelawar in a dark bowl on a banana leaf, topped with fried shallots'

// [name, Oma's words, tidy for 4, tidy for 2]
const ING = GRANDKIDS_RECIPE_CONTEXT.ingredients.map((i) => [i.name, i.familyAmount, i.tidyAmount4, i.tidyAmount2] as const)
const rowOf = (key: string) => GRANDKIDS_RECIPE_CONTEXT.ingredients.findIndex((i) => i.key === key)
const PORK_ROW = rowOf('pork')
const SAMBAL_ROW = rowOf('sambal')
const KENCUR_ROW = rowOf('kencur')

const ICON = {
  clock: 'M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M10 6.5V10l2.4 1.5',
  steps: 'M7 5h10M7 10h10M7 15h10M3 5h.1M3 10h.1M3 15h.1',
  serves: 'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5 M14 8.5a2 2 0 1 0 0-4 M13.5 11.6c2.3.2 4 2 4 4.4',
  flame: 'M10 17c-2.9 0-5-2-5-4.7 0-2.7 2.1-4 2.6-6.6 1 1.1 1.5 2.1 1.5 3.4C10.3 7.4 11.3 5.2 10.8 3c2.7 1.7 4.2 4.6 4.2 7.4C15 14.6 13 17 10 17z',
  chevron: 'M8 4l6 6-6 6',
  history: 'M3.5 10a6.5 6.5 0 1 0 2-4.7 M3 3v3.5h3.5 M10 6.5V10l2.4 1.5',
}
const PLAIN = { bg: '#f2f1ef', ink: '#1f1c19' }
const TINT = { time: { bg: '#fbefb4', ink: '#8a6a0c' }, serves: { bg: '#dcefd2', ink: '#44703a' }, spice: { bg: '#fde3d8', ink: '#c24a24' } }

// Verb tags, shared with 09 Cooking step.
const SPOON = 'M10 2.5c1.7 0 2.8 1.6 2.8 3.4S11.7 9.5 10 9.5 7.2 7.7 7.2 5.9 8.3 2.5 10 2.5z M10 9.5v8'
const V: Record<string, { bg: string; ink: string; icon: string }> = {
  Blend: { bg: '#fde3d8', ink: '#c24a24', icon: 'M6 3h8l-1.2 9H7.2z M6.5 12h7v5h-7z M10 14.5h.01' },
  Toast: { bg: '#fbefb4', ink: '#8a6a0c', icon: 'M2 11h11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z M13 11.5h5' },
  Fry: { bg: '#f8ddd7', ink: '#b2433a', icon: ICON.flame },
  Cook: { bg: '#fbe1d9', ink: '#bb4a30', icon: SPOON },
  Add: { bg: '#fde3d8', ink: '#c24a24', icon: 'M10 4v12M4 10h12' },
  Stir: { bg: '#dcefd2', ink: '#44703a', icon: SPOON },
  Squeeze: { bg: '#dcefd2', ink: '#44703a', icon: 'M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M10 3v14M3 10h14M5.1 5.1l9.8 9.8M14.9 5.1l-9.8 9.8' },
  Serve: { bg: '#fbefb4', ink: '#8a6a0c', icon: 'M3 14h14 M4.5 14a5.5 5.5 0 0 1 11 0 M10 7v1.5 M2 16.5h16' },
}

// [text, bold, changed]; the first part of each step is its verb.
type Part = [string, boolean, boolean?]
type Look = Mods & { kencur: boolean }
const STEPS: ((m: Look) => Part[])[] = [
  (m) => [['Blend', true], [' half the ', false], ['onions, garlic, ', true], [m.mild ? 'a little sambal' : 'sambal', true, m.mild], [', ', false],
    ...(m.kencur ? [['ginger + lime zest', true, true], [', pepper', true]] as Part[] : [['kencur, pepper', true]] as Part[]),
    [' and ', false], ['lime leaves', true], [' into a fine paste.', false]],
  () => [['Toast', true], [' the ', false], ['coconut', true], [' in a dry pan until golden.', false]],
  () => [['Fry', true], [' the rest of the ', false], ['shallots', true], [' and ', false], ['garlic', true], [' in hot oil.', false]],
  () => [['Cook', true], [' the ', false], ['paste', true], [' until it smells sweet.', false]],
  (m) => [['Add', true], [' the ', false], [m.chicken ? 'chicken' : 'pork', true, m.chicken], [' and the toasted ', false], ['coconut', true], ['.', false]],
  () => [['Stir', true], [' until no pink is left.', false]],
  () => [['Squeeze', true], [' in the ', false], ['lime', true], [' and add the ', false], ['chives', true], ['.', false]],
  () => [['Serve', true], [' on ', false], ['pandan rice', true], ['.', false]],
]

function Icon({ d, size = 17, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

// The talk corner's scripted chat: what the grandkid says, and what the notification says once it's done.
const ADJUST_SCRIPT = ['Actually, I just want two servings.', 'What can I use instead of kencur?'] as const
const ADJUST_RESULTS = ['Halved everything for 2 servings.', 'Swapped kencur for ginger and lime zest.'] as const
// How long "Done" shows in the island before the clay leaves.
const DONE_HOLD_MS = 1200
// With no speech at all, the session gives up after this long.
const NO_SPEECH_MS = 6000
// How long the clay takes to turn fully teal.
const CLAY_MIX_MS = 5300
// The clay's resting spot in the island, in screen px, until the island has been measured.
const ISLAND_SPOT: Vec = { x: 62, y: 62 }
// After "Done", the ingredients open and the clay hops onto each amount it changes; each one is rewritten as it lands.
type Pass = { kind: 'serves2' | 'kencur'; rows: number[] }
const PASSES: Pass[] = [
  { kind: 'serves2', rows: ING.flatMap((r, i) => (r[2] !== r[3] ? [i] : [])) },
  { kind: 'kencur', rows: [KENCUR_ROW] },
]
// How the amounts are written: tidied, or as Oma says them. The switch's thumb is liquid (GooSegmented).
const AMOUNT_MODES = [{ value: 'tidy', label: 'Tidy' }, { value: 'oma', label: 'Oma’s words' }] as const
// A card (other than Ingredients) folds away in this long, the frost with it.
const CARD_OUT_MS = 300
// The card pours in (720ms) before the first hop; then one row at a time, and a moment on the last.
const CARD_IN_MS = 760
// The Ingredients pill and the card it pours into, as on the cooking step: the blob changes from one look to the other.
const PILL_LOOK = { radius: 24, fill: 'rgba(255, 255, 255, 0.78)', shadow: '0 0 0 0 rgba(31,28,25,0), 0 0 0 0 rgba(31,28,25,0)' }
const CARD_LOOK = { radius: 32, fill: 'rgba(255, 255, 255, 0.9)', shadow: '0 0 0 1px rgba(31,28,25,.05), 0 24px 60px rgba(31,28,25,.18)' }
const HOP_MS = 450
const LAND_MS = 220
const LAST_HOLD_MS = 700
// On an amount the clay is ~10px across its radius and sits on its top edge.
const HOP_CLAY_RADIUS = 10
const VOICE_CHANGES = ['Servings 4 → 2', 'Kencur swapped out'] as const

// Where an element sits inside the screen, in the screen's own (unscaled) px.
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  // Less however far anything in between has been scrolled (the Ingredients card scrolls).
  for (let up = el.parentElement; up && up !== root; up = up.parentElement) {
    x -= up.scrollLeft
    y -= up.scrollTop
  }
  return { x, y }
}

// What the recipe needs besides ingredients, below them in the Ingredients card.
const TOOLS: { name: string; icon: string }[] = [
  { name: 'Bowl', icon: 'M3 10h14a7 7 0 0 1-14 0z M7.5 16.5h5' },
  { name: 'Dry pan', icon: 'M2.5 10.5h11a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z M13.5 11.5h4.5' },
  { name: 'Blender', icon: 'M6 3h8l-1.2 9H7.2z M6.6 12h6.8l.6 5H6z M8.2 6.5h3.6' },
  { name: 'Spatula', icon: 'M8.5 2.5h3v6.2l-1.5 1.8-1.5-1.8z M10 10.5v7' },
  { name: 'Rice pot', icon: 'M4 9h12v6a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 15z M2.5 9h15 M8 6.5h4 M10 6.5V9' },
]

export type HomeViewHandle = {
  /** Start a voice session (the wake word, in the wireframe). */
  startVoice: () => void
  /** Cancel it: the clay leaves at once, with no done step. */
  cancelVoice: () => void
}

type HomeViewProps = {
  embedded?: boolean
  overlay?: ReactNode
  /** One clay for the voice session, moving between the island and the screen. */
  clay?: boolean
  /** Wireframe testing: the person never speaks, so the session gives up after ~6 s. */
  noSpeech?: boolean
  /** Start cooking: leads to the cooking-step screen. Without it, Start cooking links to the cooking board. */
  onStartCooking?: () => void
}

export const HomeViewBoard = forwardRef<HomeViewHandle, HomeViewProps>(function HomeViewBoard(
  { embedded = false, overlay = null, clay = false, noSpeech = false, onStartCooking },
  ref,
) {
  const embedRef = useRef<HTMLDivElement>(null)
  const [embedScale, setEmbedScale] = useState(1)

  // Embedded, the 640px board scales to whatever square its host gives it.
  useLayoutEffect(() => {
    const host = embedRef.current
    if (!embedded || !host) return
    const fit = () => setEmbedScale(host.clientWidth / 640 || 1)
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(host)
    return () => observer?.disconnect()
  }, [embedded])

  const [m, setM] = useState<Mods>({ serves2: false, mild: false, chicken: false })
  const [kencur, setKencur] = useState(false)
  const [open, setOpen] = useState<Popup>('')
  const [tidy, setTidy] = useState(true)
  // Every change adds a version; the button next to the tags opens the history.
  const [versions, setVersions] = useState<VersionEntry[]>(initialVersions)
  const record = (what: string) => setVersions((cur) => newVersion(cur, what))
  const setAmounts = (next: boolean) => {
    if (next === tidy) return
    setTidy(next)
    record(next ? 'Tidied amounts' : 'Amounts in Oma’s words')
  }

  // The talk corner: the speaking glow, the notification island and the clay follow it.
  const [phase, setPhase] = useState<AdjustPhase>('idle')
  const [heard, setHeard] = useState('')
  const [glow, setGlow] = useState<GlowState>('idle')
  const [result, setResult] = useState('')
  const [blobTeal, setBlobTeal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [islandSpot, setIslandSpot] = useState<Vec>(ISLAND_SPOT)
  // The amounts the clay is rewriting: which change, which row it's on, and how many rows it has done.
  const [pass, setPass] = useState<Pass | null>(null)
  const [hop, setHop] = useState<number | null>(null)
  const [landed, setLanded] = useState(0)
  const [hopSpot, setHopSpot] = useState<Vec | null>(null)
  const voiceLevel = useRef<() => number>(() => 0)
  const screenRef = useRef<HTMLDivElement>(null)
  const stage = useRef(0)
  const timers = useRef<number[]>([])

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  useEffect(() => () => clearTimers(), [])


  // Where the clay sits in the island: the centre of the notification's clay box, in screen px.
  useLayoutEffect(() => {
    if (!clay || phase !== 'listening') return
    const box = screenRef.current?.querySelector<HTMLElement>('.vn__clay')
    const card = box?.offsetParent as HTMLElement | null
    if (!box || !card) return
    setIslandSpot({ x: card.offsetLeft + box.offsetLeft + box.offsetWidth / 2, y: card.offsetTop + box.offsetTop + box.offsetHeight / 2 })
  }, [phase, clay])

  // The clay sits on top of the thing it's hopping onto, in screen px.
  useLayoutEffect(() => {
    const root = screenRef.current
    const el = hop !== null && root?.querySelector<HTMLElement>(`[data-hop-row="${hop}"] .hm-ingr__amt`)
    if (!root || !el) {
      setHopSpot(null)
      return
    }
    const at = offsetIn(el, root)
    setHopSpot({ x: Math.min(at.x + el.offsetWidth / 2, 640 - 24), y: at.y - HOP_CLAY_RADIUS + 1 })
  }, [hop])

  const beginAdjust = () => {
    if (phase !== 'idle') return
    clearTimers()
    if (stage.current >= ADJUST_SCRIPT.length) {
      setM((cur) => ({ ...cur, serves2: false }))
      setKencur(false)
      setVersions(initialVersions())
      stage.current = 0
    }
    const next = stage.current + 1
    setOpen('')
    setClosing(false)
    setCancelled(false)
    setPhase('listening')
    setGlow('listening')
    setHeard('')
    setResult('')
    setBlobTeal(false)
    // No microphone in the wireframe: loudness is a smoothed noise curve while the request is being spoken.
    voiceLevel.current = createSimulatedLevel()
    if (noSpeech) {
      // Nobody says anything: give up after a while, as if tapped away (the latest cancelVoice, which sees the current phase).
      later(NO_SPEECH_MS, () => voiceApi.current.cancelVoice())
      return
    }
    later(CLAY_MIX_MS, () => setBlobTeal(true))
    later(1400, () => { setHeard(ADJUST_SCRIPT[next - 1]); setGlow('hearing') })
    later(5000, () => { setPhase('thinking'); setGlow('thinking') })
    later(5800, () => {
      stage.current = next
      setPhase('writing')
      setGlow('done')
      setResult(ADJUST_RESULTS[next - 1])
      if (next === 1) setM((cur) => ({ ...cur, serves2: true }))
      else setKencur(true)
      // "Done" shows for a moment in the island; then the ingredients open and the clay hops out onto each amount it changes.
      const run = PASSES[next - 1]
      later(DONE_HOLD_MS, () => { setTidy(true); setPass(run); setLanded(0); setOpen('ingr') })
      let at = DONE_HOLD_MS + CARD_IN_MS
      run.rows.forEach((row, i) => {
        later(at, () => setHop(row))
        later(at + LAND_MS, () => setLanded(i + 1))
        at += HOP_MS
      })
      later(at + LAST_HOLD_MS - HOP_MS, () => {
        setHop(null)
        setPass(null)
        setHeard('')
        setPhase('idle')
        record(VOICE_CHANGES[next - 1])
      })
    })
  }

  // Cancelled (tapped away, or no speech): everything stops and the clay leaves at once, with no done step.
  const cancelVoice = () => {
    if (phase === 'idle' || phase === 'writing') return
    clearTimers()
    setCancelled(true)
    setPhase('idle')
    setGlow('idle')
    setHeard('')
    setBlobTeal(false)
  }
  const voiceApi = useRef({ beginAdjust, cancelVoice })
  voiceApi.current = { beginAdjust, cancelVoice }
  useImperativeHandle(ref, () => ({ startVoice: () => voiceApi.current.beginAdjust(), cancelVoice: () => voiceApi.current.cancelVoice() }), [])

  // Tapping anywhere outside the island while it's listening or thinking cancels.
  const tapAway = (event: React.PointerEvent) => {
    if (phase !== 'listening' && phase !== 'thinking') return
    if ((event.target as HTMLElement).closest('.vn, .hv-talk')) return
    cancelVoice()
  }

  // One source of truth: where the clay is comes from the voice state (and what it's hopping onto).
  const clayPlace: ClayPlace = useMemo(() => {
    if (!clay || phase === 'idle') return null
    if (phase === 'writing' && hop !== null && hopSpot) return { kind: 'row', at: hopSpot }
    return { kind: 'island', at: islandSpot }
  }, [clay, phase, hop, hopSpot, islandSpot])
  // The island stays on "Done" until the clay hops out of it.
  const islandState: GlowState = phase === 'idle' ? 'idle' : phase === 'writing' ? (pass ? 'idle' : 'done') : glow

// Closing runs the opening backwards (where motion can play): Ingredients pours back into its pill, and the other
  // cards shrink a little, blur and fade with the frost, the way they bloomed in.
  const [closing, setClosing] = useState(false)
  const close = () => {
    if (!open || closing) return
    if (canPour()) setClosing(true)
    else { setOpen(''); setClosing(false) }
  }
  // A card on its way out is no longer a dialog, and can't be pressed again.
  const dialog = (label: string) => (closing ? { 'aria-hidden': true, inert: true } : { role: 'dialog', 'aria-label': label })
  useEffect(() => {
    if (!closing || open === 'ingr') return
    const gone = window.setTimeout(() => { setOpen(''); setClosing(false) }, CARD_OUT_MS)
    return () => window.clearTimeout(gone)
  }, [closing, open])
  const ingrPill = useRef<HTMLButtonElement>(null)
  const ingrCard = useRef<HTMLDivElement>(null)
  const ingrBlob = useRef<HTMLDivElement>(null)
  const ingrRect = useRef<Rect | null>(null)
  // Whether there's more above or below in the card's scroll; the edges blur only where there is.
  const ingrEdges = useRef<HTMLDivElement>(null)
  const markEdges = (s: HTMLElement) => {
    const v = ingrEdges.current
    if (!v) return
    v.dataset.above = String(s.scrollTop > 2)
    v.dataset.below = String(s.scrollTop + s.clientHeight < s.scrollHeight - 2)
  }
  useLayoutEffect(() => {
    const s = ingrEdges.current?.querySelector<HTMLElement>('.hm-ingr__scroll')
    if (open === 'ingr' && s) markEdges(s)
  }, [open])
  useLayoutEffect(() => {
    const r = screenRef.current
    const b = ingrBlob.current
    if (open !== 'ingr' || !r || !b || !ingrCard.current) return
    if (!closing) {
      const to = rectIn(ingrCard.current, r)
      ingrRect.current = to
      pourOpen(b, ingrPill.current ? rectIn(ingrPill.current, r) : to, to, PILL_LOOK, CARD_LOOK)
      return
    }
    const from = ingrRect.current
    if (from && ingrPill.current) pourClose(b, from, rectIn(ingrPill.current, r), CARD_LOOK, PILL_LOOK)
    const gone = window.setTimeout(() => { setOpen(''); setClosing(false) }, 540)
    return () => window.clearTimeout(gone)
  }, [open, closing])

  // Escape closes whichever card is open.
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const look: Look = { ...m, kencur }
  const mins = 40 - (m.serves2 ? 10 : 0) - (m.chicken ? 5 : 0)
  const sentenceKey = `${m.serves2}${m.mild}${m.chicken}`
  const current = versions[0]?.version ?? 1
  const tags = [
    { key: 'time', icon: ICON.clock, label: `${mins} min`, ...(mins !== 40 ? TINT.time : PLAIN) },
    { key: 'serves', icon: ICON.serves, label: `Serves ${m.serves2 ? 2 : 4}`, ...(m.serves2 ? TINT.serves : PLAIN) },
    { key: 'spice', icon: ICON.flame, label: m.mild ? 'Mild' : 'Hot', ...(m.mild ? TINT.spice : PLAIN) },
  ]

  const startCooking = (className: string, size: number) => {
    const inner = <>Start cooking<Icon d={ICON.chevron} size={size} /></>
    return onStartCooking
      ? <button type="button" className={className} onClick={() => { close(); onStartCooking() }}>{inner}</button>
      : <Link href="/boards/cooking" className={className}>{inner}</Link>
  }

  return (
    <div className={embedded ? 'hv-embed' : 'hv-stage'} ref={embedRef}>
      <div ref={screenRef} onPointerDown={tapAway} className={`hv-screen hm${embedded ? ' hv-screen--embedded' : ''}`} data-testid="grandkids-square"
        data-voice={glow === 'idle' || glow === 'done' ? undefined : 'on'} style={embedded ? { transform: `scale(${embedScale})` } : undefined}>

        {/* The page, as one layer, so it can ease back while the voice glow has the focus. */}
        <div className="hv-content" inert={!!open}>
          <section className="hm-over" aria-label="Recipe overview">
            <h1 className="hm-title">Lelawar Bali</h1>
            <p key={sentenceKey} className="hm-sentence hm-blurin">
              Balinese minced <strong className={m.chicken ? 'hm-mark' : undefined}>{m.chicken ? 'chicken' : 'pork'}</strong> with toasted{' '}
              <strong>coconut</strong>, fried in a <span className={m.mild ? 'hm-mark' : undefined}>{m.mild ? 'gentle spice paste' : 'fresh spice paste'}</span>{' '}
              and served on <strong>pandan rice</strong>.
            </p>
            <div className="hm-tags">
              <button type="button" className="hm-tap hm-tag hm-tag--steps" aria-haspopup="dialog" onClick={() => setOpen('steps')}>
                <Icon d={ICON.steps} />8 steps<span className="hm-tag__chev"><Icon d={ICON.chevron} size={14} width={2} /></span>
              </button>
              {tags.map((t) => (
                <span key={t.key} className="hm-tag" style={{ background: t.bg, color: t.ink }}><Icon d={t.icon} />{t.label}</span>
              ))}
              {/* Status: the current version; it ticks up with every change and opens the version history. */}
              <button type="button" className={`hm-tap hm-tag hm-tag--status${versions[0]?.who === 'Grandkid' ? ' is-changed' : ''}`}
                aria-haspopup="dialog" aria-label={`Version history, version ${current}`} onClick={() => setOpen('versions')}>
                <Icon d={ICON.history} /><span key={current} className="hm-blurin">v{current}</span>
              </button>
            </div>
          </section>

          <button type="button" className="hm-tap hm-photo" aria-label="See the whole photo" data-haptics="open" onClick={() => setOpen('photo')}>
            <Image src={PHOTO} alt={PHOTO_ALT} width={PHOTO_W} height={PHOTO_H} sizes="592px" loading="eager" />
          </button>

          <div className="hm-float">
            <button ref={ingrPill} type="button" className={`hm-tap hm-pill${open === 'ingr' ? ' is-poured' : ''}`} aria-haspopup="dialog" aria-expanded={open === 'ingr' && !closing} aria-label="Ingredients" title="Ingredients" onClick={() => setOpen('ingr')}>
              <Icon d={ICON.steps} size={20} width={1.7} />
            </button>
            {startCooking('hm-tap hm-go', 18)}
          </div>
        </div>

        {open && <button type="button" className={`hm-frost${closing ? ` is-closing${open === 'ingr' ? '' : ' is-quick'}` : ''}`} aria-label="Close" onClick={close} tabIndex={closing ? -1 : undefined} />}

        {open === 'steps' && (
          <div className={`hm-center${closing ? ' is-closing' : ''}`}>
            <div className="hm-card hm-card--steps" {...dialog('Steps')}>
              <p className="hm-card__title"><b>8 steps</b> About {mins} min</p>
              <ol className="hm-steps">
                {STEPS.map((step, i) => {
                  const [verb, ...rest] = step(look)
                  const tag = V[verb[0]]
                  return (
                    <li key={i} className="hm-blurin" style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}>
                      <span className="hm-steps__n">{i + 1}</span>
                      <span className="hm-steps__text">
                        <span className="hm-verb" style={{ background: tag.bg, color: tag.ink }}>
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={tag.icon} /></svg>
                          {verb[0]}
                        </span>
                        {rest.map(([t, bold, changed], j) => (
                          bold ? <strong key={j} className={changed ? 'hm-mark' : undefined}>{t}</strong> : <span key={j} className={changed ? 'hm-mark' : undefined}>{t}</span>
                        ))}
                      </span>
                    </li>
                  )
                })}
              </ol>
              <button type="button" className="hm-tap hm-done" onClick={close}>Done</button>
            </div>
          </div>
        )}

        {open === 'photo' && (
          <div className={`hm-center${closing ? ' is-closing' : ''}`}>
            <button type="button" className="hm-card hm-card--photo" aria-label="Close photo" onClick={close}>
              <Image src={PHOTO} alt={PHOTO_ALT} width={PHOTO_W} height={PHOTO_H} sizes="584px" />
            </button>
          </div>
        )}

        {open === 'ingr' && (
          <div className={`hm-center${closing ? ' is-closing' : ''}`}>
            <div ref={ingrBlob} className="hm-blob" aria-hidden="true" />
            <div ref={ingrCard} className="hm-card hm-card--ingr" {...dialog('Ingredients')}>
              <div className="hm-ingr__head hm-pour" style={{ '--i': 0 } as React.CSSProperties}>
                <p className="hm-card__title"><b>Ingredients</b> Serves {m.serves2 ? 2 : 4}</p>
                <GooSegmented className="hm-seg" buttonClassName="hm-tap" aria-label="How amounts are written"
                  options={AMOUNT_MODES} value={tidy ? 'tidy' : 'oma'} onChange={(v) => setAmounts(v === 'tidy')} />
              </div>
              {/* Ingredients, and below them the tools: one scroll, whose rows blur as they pass under its edges. */}
              <div ref={ingrEdges} className="hm-ingr__view">
              <div className="hm-ingr__scroll" onScroll={(e) => markEdges(e.currentTarget)}>
              <ul className="hm-ingr">
                {ING.map((r, i) => {
                  // While the clay is rewriting, a row it hasn't reached yet still shows how it was.
                  const waiting = !!pass && pass.rows.indexOf(i) >= landed
                  const halved = m.serves2 && !(waiting && pass?.kind === 'serves2')
                  const meat = i === PORK_ROW && m.chicken
                  const swapped = i === KENCUR_ROW && kencur && !(waiting && pass?.kind === 'kencur')
                  const spicy = i === SAMBAL_ROW && m.mild
                  let amt: string = halved ? r[3] : r[2]
                  if (spicy) amt = halved ? '¼ tbsp' : '½ tbsp'
                  if (swapped) amt = `${amt} + zest`
                  const changed = (halved && r[2] !== r[3]) || spicy || swapped
                  return (
                    <li key={r[0]} className={`hm-pour${hop === i ? ' is-hop' : ''}`} style={{ '--i': i + 1 } as React.CSSProperties} data-family-amount={r[1]} data-hop-row={i}>
                      <span key={`${swapped}`} className={swapped ? 'hm-mark hm-blurin' : meat ? 'hm-mark' : undefined}>{meat ? 'Chicken' : swapped ? 'Ginger + lime zest' : r[0]}</span>
                      <span className={`hm-ingr__amt${tidy ? '' : ' is-raw'}`}>
                        <span key={`${amt}-${changed}`} className={`${pass ? 'hm-blurin' : ''}${tidy && changed ? ' hm-mark' : ''}`}>{tidy ? amt : r[1]}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <section className="hm-tools" aria-labelledby="hm-tools-title">
                <p id="hm-tools-title" className="hm-card__title hm-pour" style={{ '--i': ING.length + 1 } as React.CSSProperties}>Tools you’ll need</p>
                <ul className="hm-ingr hm-tools__list">
                  {TOOLS.map((t, i) => (
                    <li key={t.name} className="hm-pour" style={{ '--i': ING.length + 2 + i } as React.CSSProperties}>
                      <span className="hm-tools__name"><Icon d={t.icon} size={20} width={1.7} />{t.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
              </div>
              <span className="hm-ingr__edge hm-ingr__edge--top" aria-hidden="true" />
              <span className="hm-ingr__edge hm-ingr__edge--bottom" aria-hidden="true" />
              </div>
              <button type="button" className="hm-tap hm-done hm-pour" style={{ '--i': ING.length + TOOLS.length + 2 } as React.CSSProperties} onClick={close}>Done</button>
            </div>
          </div>
        )}

        {open === 'versions' && (
          <div className={`hm-center${closing ? ' is-closing' : ''}`}>
            <div className="hm-card hm-card--versions" {...dialog('Version history')}>
              <p className="hm-card__title"><b>Version history</b> v{current}</p>
              <VersionList entries={versions} />
              <button type="button" className="hm-tap hm-done" onClick={close}>Done</button>
            </div>
          </div>
        )}

        {/* The wake word, in the wireframe: an unmarked corner you can tap (or reach with the keyboard). */}
        <button type="button" className="hv-talk" aria-label="Talk to Moldable" onClick={beginAdjust} />

        <SpeakingGlow state={glow} level={() => voiceLevel.current()} onDone={() => setGlow('idle')} />
        <VoiceNotification state={islandState} heard={heard} result={result} teal={blobTeal} level={() => voiceLevel.current()} ownClay={!clay} />
        {clay && (
          <VoiceClay
            place={clayPlace}
            quickExit={cancelled}
            level={() => voiceLevel.current()}
            knead={phase === 'thinking'}
            color={blobTeal ? 'teal' : 'orange'}
            width={640}
            height={640}
          />
        )}
      </div>
      {embedded ? overlay : <p className="hv-caption">Grandkid home view, 640 × 640 for the 5.73 in display.</p>}
    </div>
  )
})
