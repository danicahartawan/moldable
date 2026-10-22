'use client'

import './cooking-step.css'
import Link from 'next/link'
import { pourClose, pourOpen, rectIn, type Rect } from './liquid'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/* One recipe step at a time, as one big sentence. Steps move like song lyrics: the current one sharp in the middle,
   its neighbours blurred and faded above and below. No Next or Back buttons: wheel, swipe, keys or the step bars. */

type Tag = { bg: string; ink: string; icon: string }
type Step = {
  verb: string
  /** The rest of the sentence; **bold** marks an ingredient. */
  text: string
  ingredients: [string, string][]
  /** Oma's own words for this step, behind the orb. */
  quote?: string
}
type Recipe = { cook: string; steps: Step[] }

const SPOON = 'M10 2.5c1.7 0 2.8 1.6 2.8 3.4S11.7 9.5 10 9.5 7.2 7.7 7.2 5.9 8.3 2.5 10 2.5z M10 9.5v8'

// The verb tag's colour and icon (20×20, stroke) for each verb.
const TAGS: Record<string, Tag> = {
  Blend: { bg: '#fde3d8', ink: '#c24a24', icon: 'M6 3h8l-1.2 9H7.2z M6.5 12h7v5h-7z M10 14.5h.01' },
  Toast: { bg: '#fbefb4', ink: '#8a6a0c', icon: 'M2 11h11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z M13 11.5h5' },
  Fry: { bg: '#f8ddd7', ink: '#b2433a', icon: 'M10 17c-2.9 0-5-2-5-4.7 0-2.7 2.1-4 2.6-6.6 1 1.1 1.5 2.1 1.5 3.4C10.3 7.4 11.3 5.2 10.8 3c2.7 1.7 4.2 4.6 4.2 7.4C15 14.6 13 17 10 17z' },
  Cook: { bg: '#fbe1d9', ink: '#bb4a30', icon: SPOON },
  Add: { bg: '#fde3d8', ink: '#c24a24', icon: 'M10 4v12M4 10h12' },
  Stir: { bg: '#dcefd2', ink: '#44703a', icon: SPOON },
  Squeeze: { bg: '#dcefd2', ink: '#44703a', icon: 'M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M10 3v14M3 10h14M5.1 5.1l9.8 9.8M14.9 5.1l-9.8 9.8' },
  Serve: { bg: '#fbefb4', ink: '#8a6a0c', icon: 'M3 14h14 M4.5 14a5.5 5.5 0 0 1 11 0 M10 7v1.5 M2 16.5h16' },
}

// Lawar Bali. Swap in another recipe by passing `recipe`.
export const LELAWAR_BALI: Recipe = {
  cook: 'Oma Lien',
  steps: [
    { verb: 'Blend', text: 'half the **onions, garlic, sambal, kencur, pepper** and **lime leaves** into a fine paste.',
      ingredients: [['Onions', '3'], ['Garlic', '2'], ['Sambal', '1 tbsp'], ['Kencur', '2 cm'], ['Pepper', '½ tsp'], ['Lime leaves', '4']],
      quote: 'Blend the aromatics first, little one. Don’t make it watery; you should still see a little texture.' },
    { verb: 'Toast', text: 'the **coconut** in a dry pan until golden.', ingredients: [['Coconut', '80 g']] },
    { verb: 'Fry', text: 'the rest of the **shallots** and **garlic** in hot oil.', ingredients: [['Shallots', '3'], ['Garlic', '2']] },
    { verb: 'Cook', text: 'the **paste** until it smells sweet.', ingredients: [] },
    { verb: 'Add', text: 'the **pork** and the toasted **coconut**.', ingredients: [['Pork', '500 g']] },
    { verb: 'Stir', text: 'until no pink is left.', ingredients: [] },
    { verb: 'Squeeze', text: 'in the **lime** and add the **chives**.', ingredients: [['Lime', '1'], ['Chives', '1 bunch']] },
    { verb: 'Serve', text: 'on **pandan rice**.', ingredients: [['Rice', '2 cups']] },
  ],
}

const CENTRE_Y = 300
const GAP = 64
const WHEEL_STEP = 40
const WHEEL_IDLE_MS = 200
const WHEEL_LOCK_MS = 650
const SWIPE = 50
// The Ingredients pill and the card it pours into: the blob changes from one look to the other on the way.
const PILL_LOOK = { radius: 22, fill: 'rgb(242, 241, 239)', shadow: '0 0 0 0 rgba(31,28,25,0), 0 0 0 0 rgba(31,28,25,0)' }
const CARD_LOOK = { radius: 32, fill: 'rgba(255, 255, 255, 0.88)', shadow: '0 0 0 1px rgba(31,28,25,.05), 0 24px 60px rgba(31,28,25,.18)' }

function Sentence({ text }: { text: string }) {
  return <>{text.split('**').map((part, j) => (j % 2 ? <strong key={j}>{part}</strong> : part))}</>
}

// Each verb's icon acts out the verb on the current step: the pan tosses the coconut, the flame flickers, the spoon stirs.
function VerbIcon({ verb, icon }: { verb: string; icon: string }) {
  if (verb === 'Toast') {
    return (
      <>
        <path className="vi-pan" d={icon} />
        <circle className="vi-flake" cx="6" cy="9.4" r=".9" fill="currentColor" stroke="none" />
        <circle className="vi-flake vi-flake--late" cx="9.2" cy="9" r=".8" fill="currentColor" stroke="none" />
      </>
    )
  }
  if (verb === 'Serve') {
    return (
      <>
        <path className="vi-lid" d="M4.5 14a5.5 5.5 0 0 1 11 0 M10 7v1.5" />
        <path d="M3 14h14 M2 16.5h16" />
      </>
    )
  }
  return <path className={`vi-${verb.toLowerCase()}`} d={icon} />
}

function VerbTag({ verb }: { verb: string }) {
  const tag = TAGS[verb] ?? TAGS.Add
  return (
    <span className="cs-tag" data-verb={verb} style={{ background: tag.bg, color: tag.ink }}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <VerbIcon verb={verb} icon={tag.icon} />
      </svg>
      <span>{verb}</span>
    </span>
  )
}

type CookingStepProps = {
  /** Sits inside the kitchen display's 640px screen, with no stage chrome or caption. */
  embedded?: boolean
  /** Which step to show (0-based) when a host drives it; omit to let the screen keep its own. */
  step?: number
  /** Called whenever the screen moves to another step. */
  onStepChange?: (step: number) => void
  recipe?: Recipe
  /** Sentence alignment: centred (default) or left. */
  align?: 'center' | 'left'
  /** Rises in like the first lyric line when it appears. Off for a copy that's on its way out. */
  enter?: boolean
  /** Done, on the last step: back to the fridge. Without it, Done links to the fridge board. */
  onDone?: () => void
}

export function CookingStepBoard({ embedded = false, step: hostStep, onStepChange, recipe = LELAWAR_BALI, align = 'center', enter = true, onDone }: CookingStepProps = {}) {
  const { steps } = recipe
  const [own, setOwn] = useState(0)
  const i = Math.min(Math.max(hostStep ?? own, 0), steps.length - 1)
  const step = steps[i]
  const [quoteOpen, setQuoteOpen] = useState(false)
  // The ingredients pop-up: open, or pouring back into its pill before it's removed.
  const [pop, setPop] = useState<'closed' | 'open' | 'closing'>('closed')
  const ingOpen = pop === 'open'
  const closeIng = useCallback(() => setPop((p) => (p === 'open' ? 'closing' : p)), [])

  // Real heights of each step block (sentence + quote) and of its sentence alone, measured after fonts load.
  const blocks = useRef<(HTMLDivElement | null)[]>([])
  const sentences = useRef<(HTMLParagraphElement | null)[]>([])
  const [sizes, setSizes] = useState<{ block: number[]; sentence: number[] } | null>(null)
  const measure = useCallback(() => {
    const block = steps.map((_, k) => blocks.current[k]?.offsetHeight ?? 124)
    const sentence = steps.map((_, k) => sentences.current[k]?.offsetHeight ?? 124)
    setSizes((prev) => (prev && prev.block.join() === block.join() && prev.sentence.join() === sentence.join() ? prev : { block, sentence }))
  }, [steps])

  // Until the steps have their real heights (fonts loaded), they're placed without animating, so nothing glides into place.
  const [settled, setSettled] = useState(false)
  useLayoutEffect(() => {
    measure()
    let gone = false
    let frame = 0
    Promise.resolve(document.fonts?.ready).then(() => {
      if (gone) return
      measure()
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setSettled(true)) })
    })
    if (typeof ResizeObserver === 'undefined') return () => { gone = true; cancelAnimationFrame(frame) }
    const ro = new ResizeObserver(measure)
    blocks.current.forEach((el) => el && ro.observe(el))
    return () => { gone = true; cancelAnimationFrame(frame); ro.disconnect() }
  }, [measure])

  // Lay the steps out around the current one: centred on y = 300, the rest 64px apart above and below.
  const tops: number[] = []
  const block = (k: number) => sizes?.block[k] ?? 124
  tops[i] = CENTRE_Y - (sizes?.sentence[i] ?? 124) / 2
  for (let k = i + 1; k < steps.length; k += 1) tops[k] = tops[k - 1] + block(k - 1) + GAP
  for (let k = i - 1; k >= 0; k -= 1) tops[k] = tops[k + 1] - GAP - block(k)

  const go = useCallback((next: number) => {
    const n = Math.min(Math.max(next, 0), steps.length - 1)
    setQuoteOpen(false)
    closeIng()
    if (n === i) return
    if (hostStep === undefined) setOwn(n)
    onStepChange?.(n)
  }, [closeIng, hostStep, i, onStepChange, steps.length])

  // Latest state for the native wheel listener.
  const live = useRef({ i, go, ingOpen })
  useEffect(() => { live.current = { i, go, ingOpen } })

  // Wheel / trackpad: add up deltaY; past 40 move one step, then hold still for 650 ms so one flick is one step.
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    let sum = 0
    let idle: number | undefined
    let lockedUntil = 0
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (live.current.ingOpen) return
      clearTimeout(idle)
      idle = window.setTimeout(() => { sum = 0 }, WHEEL_IDLE_MS)
      if (performance.now() < lockedUntil) return
      sum += event.deltaY
      if (Math.abs(sum) < WHEEL_STEP) return
      live.current.go(live.current.i + (sum > 0 ? 1 : -1))
      sum = 0
      lockedUntil = performance.now() + WHEEL_LOCK_MS
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(idle) }
  }, [])

  // Swipe: up for the next step, down for the previous.
  const press = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (event: React.PointerEvent) => { press.current = { x: event.clientX, y: event.clientY } }
  const onPointerUp = (event: React.PointerEvent) => {
    const start = press.current
    press.current = null
    if (!start || ingOpen) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dy) > SWIPE && Math.abs(dy) > Math.abs(dx)) go(i + (dy < 0 ? 1 : -1))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (ingOpen || quoteOpen) { closeIng(); setQuoteOpen(false); event.preventDefault() }
      return
    }
    if (ingOpen) return
    const onButton = (event.target as HTMLElement).closest('button')
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !onButton)) { event.preventDefault(); go(i + 1) }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); go(i - 1) }
  }

  // The pop-up takes the focus while it's open and gives it back to the screen after.
  const done = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (ingOpen) done.current?.focus()
    else if (wasOpen.current) root.current?.focus()
    wasOpen.current = ingOpen
  }, [ingOpen])

  // Opening, the pill stretches up and pours into the card; closing, the card pours back into the pill.
  const pill = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLElement>(null)
  const blob = useRef<HTMLDivElement>(null)
  const cardRect = useRef<Rect | null>(null)
  useLayoutEffect(() => {
    const r = root.current
    const b = blob.current
    if (pop === 'open' && r && b && card.current) {
      const to = rectIn(card.current, r)
      cardRect.current = to
      pourOpen(b, pill.current ? rectIn(pill.current, r) : to, to, PILL_LOOK, CARD_LOOK)
    }
    if (pop !== 'closing') return
    const from = cardRect.current
    const poured = r && b && from && pill.current ? pourClose(b, from, rectIn(pill.current, r), CARD_LOOK, PILL_LOOK) : null
    const gone = window.setTimeout(() => setPop('closed'), poured ? 540 : 180)
    return () => window.clearTimeout(gone)
  }, [pop])

  const hasIng = step.ingredients.length > 0
  const isLast = i === steps.length - 1

  return (
    <div className={embedded ? 'hv-embed' : 'hv-stage'}>
      <div
        ref={root}
        className={`st-screen cs${embedded ? ' st-screen--embedded' : ''}${enter ? ' is-entering' : ''}`}
        data-settled={settled || undefined}
        data-align={align}
        tabIndex={0}
        aria-label={`${recipe.cook}’s recipe, step ${i + 1} of ${steps.length}`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { press.current = null }}
      >
        <div className="cs-track" inert={ingOpen}>
          {steps.map((s, k) => {
            const away = Math.abs(k - i)
            const state = away === 0 ? 'current' : away === 1 ? 'near' : 'far'
            return (
              <div
                key={k}
                ref={(el) => { blocks.current[k] = el }}
                className="cs-step"
                data-state={state}
                style={{ transform: `translateY(${tops[k]}px)` }}
              >
                <div className="cs-label" aria-hidden={away > 0}>
                  <span>Step {k + 1}</span>
                  {s.quote && away === 0 && (
                    <button type="button" className={`cs-orb${quoteOpen ? ' is-open' : ''}`} aria-expanded={quoteOpen}
                      aria-label={quoteOpen ? `Hide ${recipe.cook}’s words` : `Show ${recipe.cook}’s words`}
                      onClick={() => setQuoteOpen((o) => !o)}>
                      <span aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p ref={(el) => { sentences.current[k] = el }} className="cs-sentence" aria-hidden={away > 0}>
                  <VerbTag verb={s.verb} /> <Sentence text={s.text} />
                </p>
                {away === 0 && quoteOpen && s.quote && (
                  <figure className="cs-quote">
                    <blockquote>{s.quote}</blockquote>
                    <figcaption>{recipe.cook}</figcaption>
                  </figure>
                )}
                {away === 1 && (
                  <button type="button" className="cs-jump" aria-label={`Go to step ${k + 1}`} onClick={() => go(k)} />
                )}
              </div>
            )
          })}
        </div>

        <div className="cs-fade cs-fade--top" aria-hidden="true" />
        <div className="cs-fade cs-fade--bottom" aria-hidden="true" />

        <nav className="cs-bars" aria-label="Steps" inert={ingOpen}>
          {steps.map((_, k) => (
            <button key={k} type="button" className="cs-bar" aria-label={`Step ${k + 1}`} aria-current={k === i ? 'step' : undefined} onClick={() => go(k)}>
              <span aria-hidden="true" />
            </button>
          ))}
        </nav>

        {/* The foot: Ingredients, and Done on the last step. Each sits in a slot that opens and folds smoothly,
            so when one comes or goes the other glides over instead of jumping. */}
        <div className={`cs-foot${hasIng ? ' has-ing' : ''}`} inert={ingOpen}>
          <span className={`cs-slot${hasIng ? ' is-shown' : ''}`} aria-hidden={!hasIng} inert={!hasIng}>
            <span className="cs-slot__inner">
              <button ref={pill} type="button" className={`cs-ing-btn${pop === 'closed' ? '' : ' is-poured'}`} aria-haspopup="dialog" aria-expanded={ingOpen}
                onClick={() => { if (pop !== 'closed' || !hasIng) return; setQuoteOpen(false); setPop('open') }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01" />
                </svg>
                Ingredients
              </button>
            </span>
          </span>
          {/* The last step ends the recipe: Done goes back to the fridge. */}
          <span className={`cs-slot cs-slot--done${isLast ? ' is-shown' : ''}`} aria-hidden={!isLast} inert={!isLast}>
            <span className="cs-slot__inner">
              {(() => {
                return onDone
                  ? <button type="button" className="cs-done" onClick={onDone}>Done</button>
                  : <Link href="/boards/fridge" className="cs-done">Done</Link>
              })()}
            </span>
          </span>
        </div>

        {pop !== 'closed' && (
          <div className={`cs-pop${pop === 'closing' ? ' is-closing' : ''}`}>
            <button type="button" className="cs-pop__backdrop" aria-label="Close ingredients" onClick={closeIng} tabIndex={ingOpen ? 0 : -1} />
            <div ref={blob} className="cs-pop__blob" aria-hidden="true" />
            <section ref={card} className="cs-pop__card" {...(ingOpen ? { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'cs-pop-title' } : { 'aria-hidden': true })}>
              <p id="cs-pop-title" className="cs-pop__title cs-pop__item" style={{ '--i': 0 } as React.CSSProperties}><b>Ingredients</b> Step {i + 1}</p>
              <ul>
                {step.ingredients.map(([name, amount], k) => (
                  <li key={name} className="cs-pop__item" style={{ '--i': k + 1 } as React.CSSProperties}><span>{name}</span><span className="cs-pop__amt">{amount}</span></li>
                ))}
              </ul>
              <button ref={done} type="button" className="cs-pop__done cs-pop__item" style={{ '--i': step.ingredients.length + 1 } as React.CSSProperties} onClick={closeIng}>Done</button>
            </section>
          </div>
        )}
      </div>
      {!embedded && <p className="hv-caption">Cooking step on the 5.73 in display. Scroll, swipe or use the arrow keys to move between steps; tap the orb for Oma’s words.</p>}
    </div>
  )
}
