'use client'

import './home-view.css'
import { ClayBody } from '@/clay/ClayBody'
import { VoiceClay, type ClayPlace } from '@/clay/VoiceClay'
import type { Vec } from '@/clay/ClaySim'
import { SpeakingGlow, createSimulatedLevel, type GlowState } from '@/voice/SpeakingGlow'
import { VoiceNotification } from '@/voice/VoiceNotification'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import Link from 'next/link'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/* 07b Recipe home view: the title, one sentence about the dish, a row of tags, and the photo with Adjust, Ingredients
   and Start cooking floating on it. Steps, Adjust, Ingredients and the photo open as centred cards over a frosted screen. */

type AdjustPhase = 'idle' | 'listening' | 'thinking' | 'writing'
type ModKey = 'serves2' | 'mild' | 'chicken'
type Mods = Record<ModKey, boolean>
type Popup = '' | 'steps' | 'adj' | 'ingr' | 'photo'

const PHOTO = '/assets/lelawar-photo.png'
const PHOTO_ALT = 'Lelawar in a dark bowl on a banana leaf, topped with fried shallots'

const MODS: { k: ModKey; label: string; hint: string }[] = [
  { k: 'serves2', label: 'Serves 2', hint: 'Half of everything' },
  { k: 'mild', label: 'Less spicy', hint: 'Half the sambal' },
  { k: 'chicken', label: 'Chicken', hint: 'Instead of pork' },
]

// The voice view that plays once when the screen opens: what's said, and what changed.
const SAY: Record<ModKey, string> = { serves2: 'Make it for two people', mild: 'Make it less spicy for Oma', chicken: 'Use chicken instead of pork' }
const DONE: Record<ModKey, string> = { serves2: 'Now serves 2. Everything is halved.', mild: 'Sambal is down to half a spoon.', chicken: 'Swapped the pork for chicken.' }
const INTRO_MS = 3000

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
  adjust: 'M3 6h9M15 6h2M3 14h3M9 14h8',
  check: 'M5 10.5l3.2 3.2L15 6.8',
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
  /** The voice view plays once, 3 s after the screen opens. */
  autoVoice?: boolean
  /** Start cooking: leads to the cooking-step screen. Without it, Start cooking links to the cooking board. */
  onStartCooking?: () => void
}

export const HomeViewBoard = forwardRef<HomeViewHandle, HomeViewProps>(function HomeViewBoard(
  { embedded = false, overlay = null, clay = false, noSpeech = false, autoVoice = true, onStartCooking },
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
  const toggleMod = (k: ModKey) => setM((cur) => ({ ...cur, [k]: !cur[k] }))

  // The voice view: 1 listening, 2 the request, 3 done.
  const [voice, setVoice] = useState(0)
  const [said, setSaid] = useState<ModKey>('mild')
  const introTimers = useRef<number[]>([])
  const introLevel = useRef<() => number>(() => 0)

  // The talk corner: the speaking glow, the notification island and the clay follow it.
  const [phase, setPhase] = useState<AdjustPhase>('idle')
  const [heard, setHeard] = useState('')
  const [glow, setGlow] = useState<GlowState>('idle')
  const [result, setResult] = useState('')
  const [blobTeal, setBlobTeal] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [islandSpot, setIslandSpot] = useState<Vec>(ISLAND_SPOT)
  const voiceLevel = useRef<() => number>(() => 0)
  const screenRef = useRef<HTMLDivElement>(null)
  const stage = useRef(0)
  const timers = useRef<number[]>([])

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }

  // Plays the voice view: listening, then the request (the change lands here), then what changed.
  const talk = () => {
    if (voice || phase !== 'idle') return
    const next = (['mild', 'serves2', 'chicken'] as const).find((k) => !m[k]) ?? 'mild'
    introTimers.current.forEach((t) => window.clearTimeout(t))
    introLevel.current = createSimulatedLevel()
    setSaid(next)
    setOpen('')
    setVoice(1)
    introTimers.current = [
      window.setTimeout(() => setVoice(2), 1400),
      window.setTimeout(() => { toggleMod(next); setVoice(3) }, 2900),
      window.setTimeout(() => setVoice(0), 4300),
    ]
  }
  const talkRef = useRef(talk)
  talkRef.current = talk
  useEffect(() => {
    const intro = autoVoice ? window.setTimeout(() => talkRef.current(), INTRO_MS) : undefined
    return () => {
      window.clearTimeout(intro)
      introTimers.current.forEach((t) => window.clearTimeout(t))
      clearTimers()
    }
  }, [autoVoice])

  // Where the clay sits in the island: the centre of the notification's clay box, in screen px.
  useLayoutEffect(() => {
    if (!clay || phase !== 'listening') return
    const box = screenRef.current?.querySelector<HTMLElement>('.vn__clay')
    const card = box?.offsetParent as HTMLElement | null
    if (!box || !card) return
    setIslandSpot({ x: card.offsetLeft + box.offsetLeft + box.offsetWidth / 2, y: card.offsetTop + box.offsetTop + box.offsetHeight / 2 })
  }, [phase, clay])

  const beginAdjust = () => {
    if (phase !== 'idle' || voice) return
    clearTimers()
    if (stage.current >= ADJUST_SCRIPT.length) {
      setM((cur) => ({ ...cur, serves2: false }))
      setKencur(false)
      stage.current = 0
    }
    const next = stage.current + 1
    setOpen('')
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
      // "Done" shows for a moment in the island, then the island closes and the clay leaves.
      later(DONE_HOLD_MS, () => { setHeard(''); setPhase('idle') })
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

  const clayPlace: ClayPlace = useMemo(
    () => (!clay || phase === 'idle' ? null : { kind: 'island', at: islandSpot }),
    [clay, phase, islandSpot],
  )
  const islandState: GlowState = phase === 'idle' ? 'idle' : phase === 'writing' ? 'done' : glow

  // Escape closes whichever card is open.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen('') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const look: Look = { ...m, kencur }
  const mins = 40 - (m.serves2 ? 10 : 0) - (m.chicken ? 5 : 0)
  const sentenceKey = `${m.serves2}${m.mild}${m.chicken}`
  const tags = [
    { key: 'time', icon: ICON.clock, label: `${mins} min`, ...(mins !== 40 ? TINT.time : PLAIN) },
    { key: 'serves', icon: ICON.serves, label: `Serves ${m.serves2 ? 2 : 4}`, ...(m.serves2 ? TINT.serves : PLAIN) },
    { key: 'spice', icon: ICON.flame, label: m.mild ? 'Mild' : 'Hot', ...(m.mild ? TINT.spice : PLAIN) },
  ]
  const close = () => setOpen('')

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
        <div className="hv-content" inert={!!open || voice > 0}>
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
            </div>
          </section>

          <button type="button" className="hm-tap hm-photo" aria-label="See the whole photo" onClick={() => setOpen('photo')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PHOTO} alt={PHOTO_ALT} />
          </button>

          <div className="hm-float">
            <button type="button" className="hm-tap hm-pill" aria-haspopup="dialog" onClick={() => setOpen('adj')}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <path d={ICON.adjust} /><circle cx="13.5" cy="6" r="1.8" /><circle cx="7.5" cy="14" r="1.8" />
              </svg>
              Adjust
            </button>
            <button type="button" className="hm-tap hm-pill" aria-haspopup="dialog" onClick={() => setOpen('ingr')}>
              <Icon d={ICON.steps} width={1.7} />Ingredients
            </button>
            {startCooking('hm-tap hm-go', 18)}
          </div>
        </div>

        {open && <button type="button" className="hm-frost" aria-label="Close" onClick={close} />}

        {open === 'steps' && (
          <div className="hm-center">
            <div className="hm-card hm-card--steps" role="dialog" aria-label="Steps">
              <p className="hm-card__title">8 steps · about {mins} min</p>
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
              <div className="hm-card__foot">
                <button type="button" className="hm-tap hm-done" onClick={close}>Done</button>
                {startCooking('hm-tap hm-go hm-go--small', 16)}
              </div>
            </div>
          </div>
        )}

        {open === 'photo' && (
          <div className="hm-center">
            <button type="button" className="hm-card hm-card--photo" aria-label="Close photo" onClick={close}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PHOTO} alt={PHOTO_ALT} />
            </button>
          </div>
        )}

        {open === 'adj' && (
          <div className="hm-center">
            <div className="hm-card hm-card--adj" role="dialog" aria-label="Adjust the recipe">
              <p className="hm-card__title">Adjust for this cook</p>
              {MODS.map((c) => {
                const on = m[c.k]
                return (
                  <button key={c.k} type="button" className={`hm-tap hm-mod${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleMod(c.k)}>
                    <span className="hm-mod__text">
                      <span className="hm-mod__label">{c.label}</span>
                      <span className="hm-mod__hint">{c.hint}</span>
                    </span>
                    <span className="hm-mod__dot" aria-hidden="true">{on && <Icon d={ICON.check} size={15} width={2.2} />}</span>
                  </button>
                )
              })}
              <button type="button" className="hm-tap hm-done hm-done--centre" onClick={close}>Done</button>
            </div>
          </div>
        )}

        {open === 'ingr' && (
          <div className="hm-center">
            <div className="hm-card hm-card--ingr" role="dialog" aria-label="Ingredients">
              <div className="hm-ingr__head">
                <p className="hm-card__title">Ingredients · serves {m.serves2 ? 2 : 4}</p>
                <div className="hm-seg" role="group" aria-label="How amounts are written">
                  <button type="button" className="hm-tap" aria-pressed={tidy} onClick={() => setTidy(true)}>Tidy</button>
                  <button type="button" className="hm-tap" aria-pressed={!tidy} onClick={() => setTidy(false)}>Oma’s words</button>
                </div>
              </div>
              <ul className="hm-ingr">
                {ING.map((r, i) => {
                  const meat = i === PORK_ROW && m.chicken
                  const swapped = i === KENCUR_ROW && kencur
                  const spicy = i === SAMBAL_ROW && m.mild
                  let amt: string = m.serves2 ? r[3] : r[2]
                  if (spicy) amt = m.serves2 ? '¼ tbsp' : '½ tbsp'
                  if (swapped) amt = `${amt} + zest`
                  const changed = (m.serves2 && r[2] !== r[3]) || spicy || swapped
                  return (
                    <li key={r[0]} className="hm-blurin" data-family-amount={r[1]}>
                      <span className={meat || swapped ? 'hm-mark' : undefined}>{meat ? 'Chicken' : swapped ? 'Ginger + lime zest' : r[0]}</span>
                      <span className={`hm-ingr__amt${tidy ? '' : ' is-raw'}${tidy && changed ? ' hm-mark' : ''}`}>{tidy ? amt : r[1]}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="hm-ingr__tools">You’ll need a bowl, dry pan, blender, spatula and rice pot.</p>
              <button type="button" className="hm-tap hm-done hm-done--centre" onClick={close}>Done</button>
            </div>
          </div>
        )}

        {/* The voice view: plays once when the screen opens, with the clay listening in the middle. */}
        {voice > 0 && (
          <div className="hm-voice" role="status" aria-live="polite">
            <span className="hm-voice__clay" aria-hidden="true">
              <ClayBody width={88} height={88} home={{ x: 44, y: 44 }} radius={28} level={voice < 3 ? () => introLevel.current() : undefined} />
            </span>
            <div key={voice} className="hm-voice__lines hm-blurin">
              <p className="hm-voice__big">{voice === 1 ? 'Listening…' : voice === 2 ? `“${SAY[said]}”` : DONE[said]}</p>
              <p className="hm-voice__small">{voice === 1 ? 'Say what you’d like to change' : voice === 2 ? 'Changing the recipe' : 'Changes are underlined'}</p>
            </div>
          </div>
        )}

        {/* Wireframe only: replays the voice view. On the device it starts when you talk. */}
        <button type="button" className="hm-replay" aria-label="Wireframe only: replay the speaking view. On the device it starts when you talk." onClick={talk} />

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
