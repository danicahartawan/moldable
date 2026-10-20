'use client'

import { VoiceClay, type ClayPlace } from '@/clay/VoiceClay'
import type { Vec } from '@/clay/ClaySim'
import { SpeakingGlow, createSimulatedLevel, type GlowState } from '@/voice/SpeakingGlow'
import { VoiceNotification } from '@/voice/VoiceNotification'
import { VersionHistory, initialVersions, newVersion, type VersionEntry } from '@/kitchen/VersionHistory'
import { Eye, HandWaving, ImageSquare, ListBullets, ListChecks, SlidersHorizontal, Sparkle, X } from '@phosphor-icons/react'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'

type AdjustPhase = 'idle' | 'listening' | 'thinking' | 'writing'

const rowOf = (key: string) => GRANDKIDS_RECIPE_CONTEXT.ingredients.findIndex((ingredient) => ingredient.key === key)
const KENCUR_ROW = rowOf('kencur')
const PORK_ROW = rowOf('pork')
const SAMBAL_ROW = rowOf('sambal')

// The Adjust menu's Modify rows.
type ModKey = 'serves2' | 'mild' | 'chicken'
const MODIFY: { key: ModKey; label: string; hint: string; on: string; off: string }[] = [
  { key: 'serves2', label: 'Serves 2', hint: 'half of everything', on: 'Servings 4 → 2', off: 'Servings 2 → 4' },
  { key: 'mild', label: 'Less spicy', hint: 'half the sambal', on: 'Less spicy', off: 'Spicy again' },
  { key: 'chicken', label: 'Chicken', hint: 'instead of pork', on: 'Chicken instead of pork', off: 'Back to pork' },
]
// The Adjust menu blooms out of its button and folds back into it.
const MENU_CLOSE_MS = 220

// Scripted two-stage Adjust demo: what the grandkid says, then the pencil pass that follows.
const ADJUST_SCRIPT = [
  'Actually, I just want two servings.',
  'What can I use instead of kencur?',
] as const
// How long "Done" shows in the island before the clay hops out to mark the rows.
const DONE_HOLD_MS = 1200
// With no speech at all, the session gives up after this long.
const NO_SPEECH_MS = 6000
// The clay's resting spot in the island, in screen px, until the island has been measured.
const ISLAND_SPOT: Vec = { x: 62, y: 62 }
// On a row the clay is ~10px across its radius; it sits on top of the amount being rewritten.
const ROW_CLAY_RADIUS = 10

export type HomeViewHandle = {
  /** Start a voice session (the wake word, in the wireframe). */
  startVoice: () => void
  /** Cancel it: the clay leaves at once, with no done step. */
  cancelVoice: () => void
}

// What the notification says once each request has been carried out.
const ADJUST_RESULTS = [
  'Halved everything for 2 servings.',
  'Swapped kencur for ginger and lime zest.',
] as const

// [name, Oma's words, tidy amount, tidy amount for 2]
const ING = GRANDKIDS_RECIPE_CONTEXT.ingredients.map((ingredient) => [
  ingredient.name,
  ingredient.familyAmount,
  ingredient.tidyAmount4,
  ingredient.tidyAmount2,
] as const)

const TOOLS = [
  { name: 'Bowl', d: 'M3 10h18c0 6-4 10-9 10s-9-4-9-10z M9 20h6' },
  { name: 'Dry pan', d: 'M2 12h13a3 3 0 0 1-3 4H5a3 3 0 0 1-3-4z M15 13h7' },
  { name: 'Blender', d: 'M7 3h10l-1.5 11h-7z M8 14h8v6H8z M12 17h.01' },
  { name: 'Spatula', d: 'M14 3h5v6h-5z M16.5 9v12' },
  { name: 'Rice pot', d: 'M4 9h16v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z M2 9h20 M10 6h4' },
]

function Mark({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={on ? 'hv-mark' : undefined}>{children}</span>
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

// `clay` swaps the mascot for orange clay: a blob inside the Adjust chip, and teal mixed into the clay while the screen is fogged.
// How long the clay takes to turn fully teal, after the drop falls and is smeared through.
const CLAY_MIX_MS = 5300

// The recipe in a glance: what Popo said, in order.
const GLANCE_STEPS = [
  'Blend half an onion, garlic, chili, kencur, pepper and lime leaves into a fine paste. Keep a little texture, don’t let it go watery.',
  'Weigh one good handful of ground beef. Popo’s handful may be different from yours.',
  'Toast the grated coconut in a dry pan, stirring the whole time. Check it after two minutes and trust the colour over the clock.',
  'Sauté the rest of the onion, then the garlic and the paste, until the sound turns sharp and the oil separates.',
  'Add the beef and let the edges go deep golden. Don’t stir every second.',
  'Mix in the coconut, green beans and chives. Keep the beans a little crisp.',
  'Turn off the heat and squeeze in lime. Taste: savoury first, then fragrant, a little spicy, fresh at the end.',
] as const

// A full-page widget: the ingredients first, then the steps on a yellow note. Scrolls slowly and fades out at the foot.
function GlanceSheet({ checked, onToggle, onClose }: { checked: ReadonlySet<number>; onToggle: (row: number) => void; onClose: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = scroller.current
    if (!box) return
    const slow = (event: WheelEvent) => {
      event.preventDefault()
      box.scrollTop += event.deltaY * 0.3
    }
    box.addEventListener('wheel', slow, { passive: false })
    return () => box.removeEventListener('wheel', slow)
  }, [])

  return (
    <div className="hv-glance-sheet" role="dialog" aria-label="The recipe at a glance">
      <button type="button" className="hv-tap hv-glance-sheet__close" aria-label="Close" onClick={onClose}>
        <X size={18} weight="bold" />
      </button>
      <div ref={scroller} className="hv-glance-sheet__scroll">
        <h2 className="hv-glance-sheet__title">Ingredients</h2>
        <ul className="hv-glance-sheet__pills">
          {ING.map((r, i) => (
            <li
              key={r[0]}
              role="checkbox"
              tabIndex={0}
              aria-checked={checked.has(i)}
              onClick={() => onToggle(i)}
              onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onToggle(i) } }}
            >
              <span>{r[0]}</span>
              <span className="hv-amt">{r[2]}</span>
            </li>
          ))}
        </ul>

        <section className="hv-note" aria-label="Steps">
          <span className="hv-note__band" aria-hidden="true"><span /><span /></span>
          <ol>
            {GLANCE_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="hv-note__foot"><ListChecks size={20} aria-hidden="true" /> Steps · {GLANCE_STEPS.length}</p>
        </section>
      </div>
    </div>
  )
}

type HomeViewProps = {
  embedded?: boolean
  overlay?: ReactNode
  clay?: boolean
  /** Wireframe testing: the person never speaks, so the session gives up after ~6 s. */
  noSpeech?: boolean
}

export const HomeViewBoard = forwardRef<HomeViewHandle, HomeViewProps>(function HomeViewBoard({ embedded = false, overlay = null, clay = false, noSpeech = false }, ref) {
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

  const [swap, setSwap] = useState(false)
  // Overview (photo, summary, version history) or Steps; the round button by the title switches them.
  const [view, setView] = useState<'over' | 'steps'>('over')
  const [serves2, setServes2] = useState(false)
  const [mild, setMild] = useState(false)
  const [chicken, setChicken] = useState(false)
  // Tidy amounts: neat measures, or Popo's own words.
  const [tidy, setTidy] = useState(true)
  const [menu, setMenu] = useState<'closed' | 'open' | 'closing'>('closed')
  const menuTimer = useRef<number | undefined>(undefined)
  const [rowsDone, setRowsDone] = useState(0)
  const [kencurSwap, setKencurSwap] = useState(false)
  const [phase, setPhase] = useState<AdjustPhase>('idle')
  const [heard, setHeard] = useState('')
  // The speaking glow and its notification follow the Adjust flow: listening → hearing → thinking → done.
  const [glow, setGlow] = useState<GlowState>('idle')
  const [result, setResult] = useState('')
  const voiceLevel = useRef<() => number>(() => 0)
  // With the clay look, the Adjust chip's blob turns teal once the teal has been mixed all the way through.
  const [blobTeal, setBlobTeal] = useState(false)
  // Glance: the whole recipe on one sheet (from the Adjust menu).
  const [glanceOpen, setGlanceOpen] = useState(false)
  // With the clay look, ingredients can be checked off.
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const toggleChecked = (row: number) => setChecked((current) => {
    const next = new Set(current)
    if (!next.delete(row)) next.add(row)
    return next
  })
  // The version history under the recipe: every change from Adjust or voice adds a version.
  const [versions, setVersions] = useState<VersionEntry[]>(initialVersions)
  const [penRow, setPenRow] = useState<number | null>(null)
  const [penPos, setPenPos] = useState<{ left: number; top: number } | null>(null)
  // With the clay look there is one clay, and only during a voice session: where it is comes from the voice state.
  const [cancelled, setCancelled] = useState(false)
  const [rowSpot, setRowSpot] = useState<Vec | null>(null)
  const [islandSpot, setIslandSpot] = useState<Vec>(ISLAND_SPOT)
  const screenRef = useRef<HTMLDivElement>(null)
  const stage = useRef(0)
  const timers = useRef<number[]>([])
  const listRef = useRef<HTMLUListElement>(null)
  const m = { serves2, mild, chicken }

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = [] }
  useEffect(() => () => { clearTimers(); window.clearTimeout(menuTimer.current) }, [])

  const record = (what: string) => setVersions((current) => newVersion(current, what))

  const closeMenu = () => {
    if (menu !== 'open') return
    setMenu('closing')
    window.clearTimeout(menuTimer.current)
    menuTimer.current = window.setTimeout(() => setMenu('closed'), MENU_CLOSE_MS)
  }
  const toggleMenu = () => {
    if (menu === 'open') return closeMenu()
    window.clearTimeout(menuTimer.current)
    setMenu('open')
  }
  const modify = (key: ModKey) => {
    const turnOn = !m[key]
    if (key === 'serves2') {
      setServes2(turnOn)
      setRowsDone(turnOn ? ING.length : 0)
    }
    if (key === 'mild') setMild(turnOn)
    if (key === 'chicken') setChicken(turnOn)
    const row = MODIFY.find((r) => r.key === key)!
    record(turnOn ? row.on : row.off)
    setTidy(true)
    closeMenu()
  }
  const toggleTidy = () => {
    record(tidy ? 'Amounts in Popo’s words' : 'Tidied amounts')
    setTidy((t) => !t)
  }
  const glance = () => {
    setGlanceOpen((open) => !open)
    closeMenu()
  }

  useLayoutEffect(() => {
    if (penRow === null) return
    const row = listRef.current?.children[penRow] as HTMLElement | undefined
    const amount = row?.querySelector<HTMLElement>('.hv-amt')
    if (!row || !amount) return
    // The pencil tip sits at ~92% across and ~81% down the 96 x 82 mascot image.
    setPenPos({ left: amount.offsetLeft - 88, top: row.offsetTop + row.offsetHeight / 2 - 60 })
  }, [penRow])

  // The row the clay should sit on, in screen px: on top of the amount being rewritten, clear of the card's right edge.
  useLayoutEffect(() => {
    if (!clay || penRow === null) {
      setRowSpot(null)
      return
    }
    const row = listRef.current?.children[penRow] as HTMLElement | undefined
    const amount = row?.querySelector<HTMLElement>('.hv-amt')
    const card = listRef.current?.parentElement
    if (!row || !amount || !card) return
    const maxX = card.clientWidth - 22 - ROW_CLAY_RADIUS * 1.6
    setRowSpot({
      x: card.offsetLeft + Math.min(amount.offsetLeft + amount.offsetWidth / 2, maxX),
      y: card.offsetTop + row.offsetTop - ROW_CLAY_RADIUS + 1,
    })
  }, [penRow, clay])

  // Where the clay sits in the island: the centre of the notification's clay box, in screen px.
  useLayoutEffect(() => {
    if (!clay || phase !== 'listening') return
    const box = screenRef.current?.querySelector<HTMLElement>('.vn__clay')
    const card = box?.offsetParent as HTMLElement | null
    if (!box || !card) return
    setIslandSpot({ x: card.offsetLeft + box.offsetLeft + box.offsetWidth / 2, y: card.offsetTop + box.offsetTop + box.offsetHeight / 2 })
  }, [phase, clay])

  const runPencilPass = (onRow: (row: number) => void, rowMs: number) => {
    let at = 0
    ING.forEach((_, row) => {
      later(at, () => { setPenRow(row); onRow(row) })
      at += row === KENCUR_ROW && stage.current === 2 ? 900 : rowMs
    })
    later(at + 250, () => { setPenRow(null); setHeard(''); setPhase('idle') })
  }

  const beginAdjust = () => {
    if (phase !== 'idle') return
    clearTimers()
    if (stage.current >= ADJUST_SCRIPT.length) {
      setServes2(false)
      setRowsDone(0)
      setKencurSwap(false)
      setVersions(initialVersions())
      stage.current = 0
    }
    const next = stage.current + 1
    setCancelled(false)
    setPhase('listening')
    setGlow('listening')
    setHeard('')
    setResult('')
    setBlobTeal(false)
    // No microphone in the wireframe: loudness is a smoothed noise curve while the request is being spoken.
    voiceLevel.current = createSimulatedLevel()
    if (noSpeech) {
      // Nobody says anything: give up after a while, as if tapped away.
      // (the latest cancelVoice, which sees the current phase)
      later(NO_SPEECH_MS, () => voice.current.cancelVoice())
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
      record(next === 1 ? 'Servings 4 → 2' : 'Kencur swapped out')
      if (next === 1) setServes2(true)
      // "Done" shows for a moment in the island before the rows are marked.
      later(DONE_HOLD_MS, () => {
        if (next === 1) runPencilPass((row) => setRowsDone((done) => Math.max(done, row + 1)), 450)
        else runPencilPass((row) => { if (row === KENCUR_ROW) setKencurSwap(true) }, 300)
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
  const voice = useRef({ beginAdjust, cancelVoice })
  voice.current = { beginAdjust, cancelVoice }
  useImperativeHandle(ref, () => ({ startVoice: () => voice.current.beginAdjust(), cancelVoice: () => voice.current.cancelVoice() }), [])

  // Tapping anywhere outside the island while it's listening or thinking cancels.
  const tapAway = (event: React.PointerEvent) => {
    // The Adjust menu closes when you tap anywhere else.
    if (menu === 'open' && !(event.target as HTMLElement).closest('.hv-menu, .hv-adjust-btn')) closeMenu()
    if (phase !== 'listening' && phase !== 'thinking') return
    if ((event.target as HTMLElement).closest('.vn, .hv-talk')) return
    cancelVoice()
  }

  // One source of truth: where the clay is comes from the voice state (and the row being marked).
  const clayPlace: ClayPlace = useMemo(() => {
    if (!clay || phase === 'idle') return null
    if (phase === 'writing' && penRow !== null && rowSpot) return { kind: 'row', at: rowSpot }
    if (phase === 'writing' && penRow !== null) return null
    return { kind: 'island', at: islandSpot }
  }, [clay, phase, penRow, rowSpot, islandSpot])
  // The island stays open until the clay leaves it: through "Done", closing as the clay hops out to the rows.
  const islandState: GlowState = phase === 'idle' ? 'idle' : phase === 'writing' ? (penRow === null ? 'done' : 'idle') : glow

  const mins = 40 - (m.serves2 ? 10 : 0) - (m.chicken ? 5 : 0)
  const roll = (shown: boolean, from: number): CSSProperties => ({
    transform: `translateY(${shown ? 0 : from}px)`, filter: `blur(${shown ? 0 : 8}px)`, opacity: shown ? 1 : 0,
  })

  return (
    <div className={embedded ? 'hv-embed' : 'hv-stage'} ref={embedRef}>
      <div ref={screenRef} onPointerDown={tapAway} className={`hv-screen${embedded ? ' hv-screen--embedded' : ''}`} data-testid="grandkids-square" data-voice={glow === 'idle' || glow === 'done' ? undefined : 'on'} style={embedded ? { transform: `scale(${embedScale})` } : undefined}>

        {/* The cards, as one layer, so they can ease back together while the voice glow has the focus. */}
        <div className="hv-content">
        <section className="hv-card hv-recipe" aria-label="Recipe">
          <div className="hv-recipe__head">
            <div style={{ minWidth: 0 }}>
              <h1 className="hv-title">Lawar Bali</h1>
              <p className="hv-sub">Popo’s recipe</p>
            </div>
            {/* Overview ↔ Steps: it stays put; only its icon swaps. */}
            <button type="button" className="hv-tap hv-round" aria-pressed={view === 'steps'} aria-label={view === 'over' ? 'Show the steps' : 'Show the overview'}
              onClick={() => setView((v) => (v === 'over' ? 'steps' : 'over'))}>
              {view === 'over' ? <ListBullets size={22} aria-hidden="true" /> : <ImageSquare size={22} aria-hidden="true" />}
            </button>
          </div>

          {view === 'over' ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hv-photo" src="/assets/lelawar-oma.png" alt="Oma Lien holding a plate of lawar" />
              <p className="hv-overview">
                Balinese minced <Mark on={m.chicken}>{m.chicken ? 'chicken' : 'pork'}</Mark> with toasted coconut, fried in a{' '}
                <Mark on={m.mild}>{m.mild ? 'gentle spice paste' : 'fresh spice paste'}</Mark> and served on pandan rice.
              </p>
              <VersionHistory entries={versions} />
            </>
          ) : (
            <div className="hv-steps">
              <ol>
                {GLANCE_STEPS.map((step, i) => (
                  <li key={step} className="hv-blurin" style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className="hv-steps__n">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div aria-hidden="true" className="hv-steps__veil" />
            </div>
          )}

          <div className="hv-recipe__foot">
            {/* Waving is a gesture, not a button. */}
            <span className="hv-wave-hint"><HandWaving size={20} aria-hidden="true" /> Wave to start</span>
            <button type="button" className={`hv-tap hv-round hv-adjust-btn${menu === 'open' ? ' is-open' : ''}`} aria-label="Adjust the recipe" aria-haspopup="menu" aria-expanded={menu === 'open'} onClick={toggleMenu}>
              <SlidersHorizontal size={22} aria-hidden="true" />
            </button>
          </div>

          {menu !== 'closed' && (
            <div className={`hv-menu${menu === 'closing' ? ' is-closing' : ''}`} role="menu" aria-label="Adjust the recipe" onKeyDown={(event) => { if (event.key === 'Escape') closeMenu() }}>
              <button type="button" role="menuitemcheckbox" aria-checked={glanceOpen} className="hv-tap hv-menu__row hv-menu__row--glance" onClick={glance}>
                <span className="hv-menu__label"><Eye size={20} aria-hidden="true" />Glance</span>
                <span className="hv-menu__hint">Quick look</span>
              </button>
              <span aria-hidden="true" className="hv-menu__rule" />
              <p className="hv-menu__title">Modify</p>
              {MODIFY.map((row) => (
                <button key={row.key} type="button" role="menuitemcheckbox" aria-checked={m[row.key]} className={`hv-tap hv-menu__row${m[row.key] ? ' is-on' : ''}`} onClick={() => modify(row.key)}>
                  <span className="hv-menu__label">{row.label}</span>
                  <span className="hv-menu__hint">{row.hint}</span>
                </button>
              ))}
              <span aria-hidden="true" className="hv-menu__rule" />
              <button type="button" role="menuitemcheckbox" aria-checked={tidy} className={`hv-tap hv-menu__row${tidy ? ' is-on' : ''}`} onClick={toggleTidy}>
                <span className="hv-menu__label"><Sparkle size={18} aria-hidden="true" />Tidy amounts</span>
                <span className="hv-menu__hint">{tidy ? 'On' : 'Popo’s words'}</span>
              </button>
            </div>
          )}
        </section>

        <section className="hv-card hv-swap" aria-label={swap ? 'Tools: bowl, dry pan, blender, spatula and rice pot. Tap for cooking time' : `Cooking time ${mins} minutes. Tap for tools`}>
          <button type="button" className="hv-tap hv-swap__btn" onClick={() => setSwap((s) => !s)}>
            <span className="hv-roll" style={roll(!swap, -50)}>
              <span className="hv-h">Cooking time</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="hv-mins"><Mark on={mins !== 40}>{mins}</Mark></span>
                <span style={{ fontSize: 22 }}>mins</span>
              </span>
            </span>
            <span className="hv-roll" style={roll(swap, 50)}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span className="hv-h">Tools</span><span className="hv-count">5</span></span>
              <span className="hv-tools">
                {TOOLS.map((t) => (
                  <span key={t.name} className="hv-tool">
                    <span className="hv-tool__icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.d} /></svg>
                    </span>
                    {t.name}
                  </span>
                ))}
              </span>
            </span>
          </button>
          <span aria-hidden="true" className="hv-dots">
            <span style={{ background: swap ? 'var(--line)' : 'var(--ink)' }} />
            <span style={{ background: swap ? 'var(--ink)' : 'var(--line)' }} />
          </span>
        </section>

        <section className="hv-card hv-ingr" aria-label="Ingredients">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p className="hv-h" style={{ margin: 0 }}>Ingredients</p>
            <p className="hv-count" style={{ margin: 0 }}>Serves <Mark on={serves2}>{serves2 ? 2 : 4}</Mark></p>
          </div>
          <ul ref={listRef}>
            {ING.map((r, i) => {
              const halved = serves2 && i < rowsDone
              const swapped = i === KENCUR_ROW && kencurSwap
              const gentler = i === SAMBAL_ROW && mild
              const meat = i === PORK_ROW && chicken
              let amt: string = halved ? r[3] : r[2]
              if (gentler) amt = halved ? '¼ tbsp' : '½ tbsp'
              if (swapped) amt = halved ? '1 cm + zest' : '2 cm + zest'
              // Tidy off: Popo's own words for each amount.
              if (!tidy) amt = r[1]
              const changed = tidy && ((halved && r[2] !== r[3]) || swapped || gentler)
              return (
                <li
                  key={r[0]}
                  data-family-amount={r[1]}
                  data-changed={changed || undefined}
                  style={{ '--i': i } as CSSProperties}
                  className={penRow === i ? 'is-voice-target' : undefined}
                  {...(clay ? {
                    role: 'checkbox',
                    tabIndex: 0,
                    'aria-checked': checked.has(i),
                    onClick: () => toggleChecked(i),
                    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggleChecked(i) } },
                  } : {})}
                >
                  <Mark on={swapped || meat}>{swapped ? 'Ginger + lime zest' : meat ? 'Chicken' : r[0]}</Mark>
                  <span className="hv-amt">
                    <span key={`${amt}-${changed}`} className={`hv-blurin${changed ? ' hv-mark' : ''}`}>{amt}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {!clay && penRow !== null && penPos && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hv-pen" src="/assets/mascot-writer-gradient.png" alt="Moldable mascot writing in the ingredient list"
              style={{ left: penPos.left, top: penPos.top }} />
          )}
        </section>
        </div>

        {glanceOpen && <GlanceSheet checked={checked} onToggle={toggleChecked} onClose={() => setGlanceOpen(false)} />}

        {/* The wake word, in the wireframe: an unmarked corner you can tap (or reach with the keyboard). */}
        <button type="button" className="hv-talk" aria-label="Talk to Moldable" onClick={beginAdjust} />

        <SpeakingGlow state={glow} level={() => voiceLevel.current()} onDone={() => setGlow('idle')} />
        {/* The notification stays on "Done" with what changed until the pencil has finished writing it in. */}
        <VoiceNotification
          state={islandState}
          heard={heard}
          result={result}
          teal={blobTeal}
          level={() => voiceLevel.current()}
          ownClay={!clay}
        />
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
