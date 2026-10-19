'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import type { GrandkidsAnswer } from '@/app/api/grandkids/ask/route'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { useGrandkidsVoiceGuide } from '@/grandkids/useGrandkidsVoiceGuide'

type Mods = { serves2: boolean; mild: boolean; chicken: boolean }

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

export function HomeViewBoard() {
  const [swap, setSwap] = useState(false)
  const [m] = useState<Mods>({ serves2: false, mild: false, chicken: false })
  const [kencurSwap] = useState(false)
  const [view, setView] = useState<'over' | 'steps'>('over')
  const [voiceTarget, setVoiceTarget] = useState<GrandkidsAnswer | null>(null)

  const handleTarget = useCallback((next: GrandkidsAnswer) => {
    setVoiceTarget(next)
    if (next.target === 'step') setView('steps')
    if (next.target === 'overview') setView('over')
    if (next.target === 'tools') setSwap(true)
    if (next.target === 'time') setSwap(false)
  }, [])

  const voiceGuide = useGrandkidsVoiceGuide({
    recipeState: {
      servings: m.serves2 ? 2 : 4,
      activeStep: voiceTarget?.target === 'step' ? voiceTarget.step ?? null : null,
      versionLabel: m.serves2 ? 'Nevan + Fred · 2 servings' : null,
      kencurSubstitution: kencurSwap,
    },
    onTarget: handleTarget,
  })

  useEffect(() => {
    if (voiceTarget?.target !== 'step' || !voiceTarget.step) return
    document.querySelector<HTMLElement>(`[data-recipe-step="${voiceTarget.step}"]`)?.scrollIntoView?.({ block: 'center' })
  }, [voiceTarget])

  useEffect(() => {
    if (voiceGuide.status === 'idle' && voiceGuide.answer) setVoiceTarget(null)
  }, [voiceGuide.answer, voiceGuide.status])

  const activeVoice = ['requesting', 'listening', 'thinking', 'speaking'].includes(voiceGuide.status)
  const beginVoiceQuestion = () => {
    setVoiceTarget(null)
    if (activeVoice) voiceGuide.cancel()
    void voiceGuide.start()
  }
  const adjustLabel = voiceGuide.status === 'listening'
    ? 'Listening…'
    : voiceGuide.status === 'thinking' || voiceGuide.status === 'requesting'
      ? 'Thinking…'
      : voiceGuide.status === 'speaking'
        ? 'Speaking…'
        : 'Adjust'

  const mins = 40 - (m.serves2 ? 10 : 0) - (m.chicken ? 5 : 0)
  const roll = (shown: boolean, from: number): CSSProperties => ({
    transform: `translateY(${shown ? 0 : from}px)`, filter: `blur(${shown ? 0 : 8}px)`, opacity: shown ? 1 : 0,
  })

  const steps: [string, boolean][][] = [
    [['Toast the coconut in a dry pan until golden', false]],
    [['Grind half the shallots and garlic with ', false], [m.mild ? 'a little sambal' : 'the sambal', m.mild], [kencurSwap ? ', ginger, lime zest, pepper and lime leaves' : ', kencur, pepper and lime leaves', kencurSwap]],
    [['Heat the oil and fry the rest of the shallots and garlic', false]],
    [['Add the paste and cook until it smells sweet', false]],
    [['Add the ', false], [m.chicken ? 'chicken' : 'pork', m.chicken], [' and the toasted coconut', false]],
    [['Keep stirring until no pink is left', false]],
    [['Squeeze in the lime and add the chives', false]],
    [['Serve on pandan rice', false]],
  ]

  return (
    <div className="hv-stage">
      <div className="hv-screen" data-testid="grandkids-square">
        <button type="button" className={`hv-tap hv-adjust is-${voiceGuide.status}`} aria-label="Adjust recipe by voice" aria-pressed={activeVoice} aria-busy={activeVoice} onClick={beginVoiceQuestion}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h9M15 6h2M3 14h3M9 14h8" /><circle cx="13.5" cy="6" r="1.8" /><circle cx="7.5" cy="14" r="1.8" />
          </svg>
          {adjustLabel}
        </button>

        <section className="hv-card hv-recipe" aria-label="Recipe overview">
          <div className="hv-recipe__inner">
            <div className="hv-recipe__head">
              <div style={{ minWidth: 0 }}>
                <h1 className="hv-title">Lelawar Bali</h1>
                <p className="hv-sub">{m.serves2 ? 'Nevan + Fred · 2 servings' : 'Oma Lien’s recipe'}</p>
              </div>
              <button type="button" className="hv-tap hv-round" aria-pressed={view === 'steps'} aria-label={view === 'over' ? 'Show the steps' : 'Show the overview'}
                onClick={() => setView((v) => (v === 'over' ? 'steps' : 'over'))}>
                <Icon size={20} d={view === 'over' ? 'M7 5h10M7 10h10M7 15h10M3 5h.1M3 10h.1M3 15h.1' : 'M3 4h14v12H3z M3 12l4-3 3 2 4-4 3 3'} />
              </button>
            </div>

            {view === 'over' ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="hv-photo hv-blurin" src="/assets/lelawar-photo.png" alt="Lelawar in a dark bowl on a banana leaf, topped with fried shallots" />
                <p className="hv-overview hv-blurin">
                  Balinese minced <Mark on={m.chicken}>{m.chicken ? 'chicken' : 'pork'}</Mark> with toasted coconut, fried in a{' '}
                  <Mark on={m.mild}>{m.mild ? 'gentle spice paste' : 'fresh spice paste'}</Mark> and served on pandan rice.
                </p>
                <dl className="hv-stats hv-blurin">
                  <div><dt>Steps</dt><dd>8</dd></div>
                  <div><dt>Serves</dt><dd><Mark on={m.serves2}>{m.serves2 ? 2 : 4}</Mark></dd></div>
                  <div><dt>Spice</dt><dd><Mark on={m.mild}>{m.mild ? 'Mild' : 'Hot'}</Mark></dd></div>
                </dl>
              </>
            ) : (
              <div className="hv-steps">
                <ol>
                  {steps.map((parts, i) => (
                    <li key={i} data-recipe-step={i + 1} className={`hv-blurin${voiceTarget?.target === 'step' && voiceTarget.step === i + 1 ? ' is-voice-target' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                      <span className="hv-steps__n">{i + 1}</span>
                      <span>{parts.map(([t, on], j) => <Mark key={j} on={on}>{t}</Mark>)}</span>
                    </li>
                  ))}
                </ol>
                <div aria-hidden="true" className="hv-steps__veil" />
              </div>
            )}
          </div>
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
            <p className="hv-count" style={{ margin: 0 }}>{ING.length}</p>
          </div>
          <ul>
            {ING.map((r, i) => {
              const meat = i === 0 && m.chicken
              const spicy = i === 4 && m.mild
              const halved = m.serves2
              let amt: string = halved ? r[3] : r[2]
              if (spicy) amt = halved ? '¼ tbsp' : '½ tbsp'
              if (i === 5 && kencurSwap) amt = halved ? '1 cm + zest' : '2 cm + zest'
              const changed = (halved && r[2] !== r[3]) || spicy || (i === 5 && kencurSwap)
              return (
                <li key={r[0]} data-family-amount={r[1]} className={voiceTarget?.target === 'ingredients' && voiceTarget.ingredient === GRANDKIDS_RECIPE_CONTEXT.ingredients[i].key ? 'is-voice-target' : undefined}>
                  <Mark on={meat || (i === 5 && kencurSwap)}>{meat ? 'Chicken' : i === 5 && kencurSwap ? 'Ginger + lime zest' : r[0]}</Mark>
                  <span className="hv-amt">
                    <span key={`${amt}-${changed}`} className={`hv-blurin${changed ? ' hv-mark' : ''}`}>{amt}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {voiceTarget?.target === 'ingredients' && voiceTarget.ingredient && (() => {
            const targetIndex = GRANDKIDS_RECIPE_CONTEXT.ingredients.findIndex((ingredient) => ingredient.key === voiceTarget.ingredient)
            if (targetIndex < 0) return null
            const targetName = GRANDKIDS_RECIPE_CONTEXT.ingredients[targetIndex].name
            return (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hv-pencil-mascot is-voice-target" src="/assets/grandma-writer.png" alt={`Moldable mascot showing ${targetName}`}
              style={{ '--rewrite-row': Math.floor(targetIndex / 2), '--rewrite-col': targetIndex % 2 } as CSSProperties} />
            )
          })()}
        </section>

        <p className="hv-sr-only" role="status" aria-live="polite">
          {voiceGuide.answer && voiceGuide.target
            ? `${voiceGuide.answer} ${voiceGuide.target.target === 'ingredients' && voiceGuide.target.ingredient
              ? `Ingredients: ${GRANDKIDS_RECIPE_CONTEXT.ingredients.find((ingredient) => ingredient.key === voiceGuide.target?.ingredient)?.name ?? voiceGuide.target.ingredient}.`
              : voiceGuide.target.target === 'step' ? `Step ${voiceGuide.target.step}.` : `${voiceGuide.target.target}.`}`
            : adjustLabel === 'Adjust' ? '' : adjustLabel}
        </p>
        {voiceGuide.errorMessage && <p className="hv-voice-error">{voiceGuide.errorMessage}</p>}

        <p className="hv-wave">Wave to start</p>

      </div>
      <p className="hv-caption">Grandkid home view, 640 × 640 for the 5.73 in display.</p>
    </div>
  )
}
