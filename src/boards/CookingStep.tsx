'use client'

import { ClayBlob } from '@/kitchen/ClayMix'
import { useEffect, useRef, useState } from 'react'

const IC = {
  blender: 'M7 3h10l-1.5 11h-7z M8 14h8v6H8z M12 17h.01',
  pan: 'M2 12h13a3 3 0 0 1-3 4H5a3 3 0 0 1-3-4z M15 13h7',
  flame: 'M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-7.5z',
  plus: 'M12 5v14M5 12h14',
  spatula: 'M14 3h5v6h-5z M16.5 9v12',
  lime: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z M12 4v16 M5 8l14 8 M5 16l14-8',
  plate: 'M3 15h18 M5 15a7 7 0 0 1 14 0 M12 6v2',
}

type Art = 'blender' | 'pan' | 'lime' | 'plate'
type Step = { verb: string; icon: string; rest: string; cue: string; art: Art; fill?: string; dot?: string; alt: string; uses: [string, string][] }

const STEPS: Step[] = [
  { verb: 'Blend', icon: IC.blender, rest: 'half the onions, garlic, sambal, kencur, pepper and lime leaves into a fine paste.', cue: 'Blend the aromatics first, little one. Don’t make it watery; you should still see a little texture.', art: 'blender', alt: 'A blender with a coarse orange spice paste',
    uses: [['Onions', '3'], ['Garlic', '2 cloves'], ['Sambal', '1 tbsp'], ['Kencur', '2 cm'], ['Pepper', '½ tsp'], ['Lime leaves', '4']] },
  { verb: 'Toast', icon: IC.pan, rest: 'the coconut in a dry pan until it turns golden.', cue: 'Keep it moving. Take it off the heat the moment it smells nutty.', art: 'pan', fill: '#f2dfb6', dot: '#c98a3c', alt: 'A pan of coconut toasting',
    uses: [['Coconut', '80 g']] },
  { verb: 'Fry', icon: IC.flame, rest: 'the rest of the onions and garlic in a little oil.', cue: 'Low heat. They should go soft and sweet, not brown.', art: 'pan', fill: '#efe2c4', dot: '#b98a4a', alt: 'A pan of onions and garlic frying',
    uses: [['Onions', '3'], ['Garlic', '2 cloves'], ['Oil', '2 tbsp']] },
  { verb: 'Cook', icon: IC.spatula, rest: 'the paste with the onions until it smells sweet.', cue: 'When your eyes stop stinging, it’s ready.', art: 'pan', fill: '#e9a15a', dot: '#b0302a', alt: 'A pan of spice paste cooking',
    uses: [['Spice paste', 'from step 1']] },
  { verb: 'Add', icon: IC.plus, rest: 'the pork and the toasted coconut.', cue: 'Break the meat up with your spatula as it goes in.', art: 'pan', fill: '#c98f7c', dot: '#f2dfb6', alt: 'A pan of minced pork and coconut',
    uses: [['Pork', '500 g'], ['Toasted coconut', '80 g']] },
  { verb: 'Stir', icon: IC.spatula, rest: 'until no pink is left in the meat.', cue: 'Scrape the bottom so nothing catches.', art: 'pan', fill: '#a8714f', dot: '#f2dfb6', alt: 'A pan of cooked lawar',
    uses: [] },
  { verb: 'Squeeze', icon: IC.lime, rest: 'in the lime and fold through the chives.', cue: 'Taste it now. More lime if it feels heavy.', art: 'lime', alt: 'Half a lime',
    uses: [['Lime', '1'], ['Chives', '1 bunch']] },
  { verb: 'Serve', icon: IC.plate, rest: 'on pandan rice while it’s warm.', cue: 'Eat it warm. That’s when the coconut is best.', art: 'plate', alt: 'A plate of lawar on rice',
    uses: [['Rice', '2 cups']] },
]

const svgProps = { fill: 'none', stroke: 'var(--ink)', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

function Illustration({ step }: { step: Step }) {
  if (step.art === 'blender') {
    return (
      <svg viewBox="0 0 200 230" className="ck-art" style={{ maxHeight: 208 }} {...svgProps}>
        <rect x="86" y="6" width="28" height="14" rx="5" fill="var(--basil-soft)" />
        <rect x="54" y="18" width="92" height="18" rx="7" fill="var(--enamel-soft)" />
        <path d="M58 36h84l-12 128H70z" fill="#ffffff" />
        <path d="M63 100c14-6 26 4 37-1s23-4 36 1l-6 64H70z" fill="#f4c590" stroke="none" />
        <path d="M63 100c14-6 26 4 37-1s23-4 36 1" strokeWidth="2" />
        {[[82, 122, 2.4], [104, 114, 2], [118, 132, 2.6], [92, 142, 2], [112, 150, 2.2]].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#c4682a" stroke="none" />
        ))}
        <path d="M58 36h84l-12 128H70z" />
        <path d="M76 46l-6 70" stroke="#ffffff" strokeWidth="5" opacity=".7" />
        <circle cx="100" cy="150" r="7" fill="#ffffff" />
        <rect x="60" y="164" width="80" height="44" rx="12" fill="var(--flour-sunken)" />
        <circle cx="100" cy="186" r="7" fill="#ffffff" />
        <rect x="70" y="208" width="60" height="10" rx="5" fill="var(--ink-faint)" />
      </svg>
    )
  }
  if (step.art === 'pan') {
    const dot = step.dot ?? '#c98a3c'
    return (
      <svg viewBox="0 0 300 200" className="ck-art" style={{ maxHeight: 192 }} {...svgProps}>
        <path d="M104 52c-8-10 8-18 0-28M140 46c-8-10 8-18 0-28M176 52c-8-10 8-18 0-28" stroke="var(--ink-faint)" />
        <rect x="232" y="104" width="62" height="16" rx="8" fill="#8a5a36" />
        <path d="M30 108c0 44 26 66 76 66h68c50 0 76-22 76-66z" fill="#3b3733" />
        <ellipse cx="140" cy="108" rx="110" ry="22" fill="#5a544e" />
        <ellipse cx="140" cy="108" rx="92" ry="14" fill={step.fill ?? '#f2dfb6'} stroke="none" style={{ transition: 'fill 420ms ease' }} />
        {[[104, 106, 3], [132, 112, 3.4], [160, 104, 2.8], [182, 111, 3], [118, 101, 2.4]].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={dot} stroke="none" />
        ))}
      </svg>
    )
  }
  if (step.art === 'lime') {
    return (
      <svg viewBox="0 0 220 200" className="ck-art" style={{ maxHeight: 192 }} {...svgProps}>
        <circle cx="100" cy="104" r="76" fill="#9cc04a" />
        <circle cx="100" cy="104" r="64" fill="#e6f1c8" />
        <path d="M100 44v120M48 74l104 60M48 134l104-60" stroke="#9cc04a" strokeWidth="3" />
        <circle cx="100" cy="104" r="6" fill="#ffffff" />
        <path d="M188 40c6 10 10 16 10 21a10 10 0 0 1-20 0c0-5 4-11 10-21z" fill="var(--basil-soft)" />
        <path d="M200 96c4 7 7 11 7 15a7 7 0 0 1-14 0c0-4 3-8 7-15z" fill="var(--basil-soft)" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 300 200" className="ck-art" style={{ maxHeight: 192 }} {...svgProps}>
      <ellipse cx="150" cy="140" rx="136" ry="40" fill="#ffffff" />
      <ellipse cx="150" cy="136" rx="100" ry="26" fill="var(--flour-sunken)" stroke="var(--line)" />
      <path d="M70 134c4-40 36-64 80-64s76 24 80 64c-20 10-140 10-160 0z" fill="var(--basil-soft)" />
      <path d="M96 128c2-26 24-42 54-42s52 16 54 42c-16 8-92 8-108 0z" fill="#c98a3c" />
      {[[122, 110, 3, '#7a3e1c'], [150, 100, 3.4, '#2c6a39'], [172, 114, 3, '#7a3e1c'], [140, 118, 2.6, '#f5d653'], [162, 96, 2.4, '#2c6a39']].map(([cx, cy, r, f]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={f as string} stroke="none" />
      ))}
    </svg>
  )
}

function Mascot() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="ck-mascot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--thermal-flare)" />
          <stop offset=".38" stopColor="var(--thermal-ember)" />
          <stop offset=".7" stopColor="var(--thermal-magenta)" />
          <stop offset="1" stopColor="var(--thermal-violet)" />
        </linearGradient>
      </defs>
      <path d="M24 4c7 0 9 5 14 7s7 7 5 13-1 10-6 14-12 6-18 4-11-6-13-12 0-11 3-15 8-11 15-11z" fill="url(#ck-mascot)" />
      <circle cx="19" cy="23" r="2.2" fill="var(--ink)" />
      <circle cx="28" cy="23" r="2.2" fill="var(--ink)" />
    </svg>
  )
}

export const COOKING_STEP_COUNT = STEPS.length

type CookingStepProps = {
  /** Sits inside the kitchen display's 640px screen, with no stage chrome or caption. */
  embedded?: boolean
  /** Which step to show (0-based) when a host drives the carousel; omit to let the board keep its own. */
  step?: number
  /** Called when the step number is tapped, in place of the board advancing itself. */
  onStepTap?: () => void
  /** Swaps the mascot for the orange clay ball. */
  clay?: boolean
}

export function CookingStepBoard({ embedded = false, step: hostStep, onStepTap, clay = false }: CookingStepProps = {}) {
  const [own, setI] = useState(0)
  const i = hostStep ?? own
  const [ing, setIng] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const step = STEPS[i]
  const open = ing && !closing
  const uses: [string, string][] = step.uses.length ? step.uses : [['Nothing new', 'keep stirring']]
  const frozen = { filter: open ? 'blur(5px)' : 'none', opacity: open ? 0.45 : 1 }

  const toggleIng = () => {
    if (closing) return
    if (!ing) {
      setIng(true)
      return
    }
    setClosing(true)
    clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => { setIng(false); setClosing(false) }, 260)
  }

  return (
    <div className={embedded ? 'hv-embed' : 'hv-stage'}>
      <div className={`st-screen${embedded ? ' st-screen--embedded' : ''}`}>
        <div className="ck-body">
          <header className="ck-freeze" style={frozen}>
            <h1 className="st-title">
              <button type="button" className="ck-step" aria-label={`Step ${i + 1}. Tap for the next step`}
                onClick={() => (onStepTap ? onStepTap() : setI((n) => (n === STEPS.length - 1 ? 0 : n + 1)))}>
                Step {i + 1}
              </button>
            </h1>
          </header>

          {/* Keyed by step so each new step rises in and its cue is spoken afresh */}
          <div key={i} className="ck-view st-rise">
            <div className="ck-cue ck-freeze" style={frozen}>
              <span className="ck-mascot">{clay ? <ClayBlob /> : <Mascot />}</span>
              <p className="ck-bubble" aria-label={step.cue}>
                {step.cue.split(' ').map((t, j, a) => (
                  <span key={j} className="st-word" aria-hidden="true" style={{ animationDelay: `${(0.3 + j * 0.06).toFixed(2)}s` }}>
                    {j < a.length - 1 ? `${t} ` : t}
                  </span>
                ))}
              </p>
            </div>

            <p className="ck-instruction ck-freeze" style={frozen}>
              <span className="ck-verb" data-verb={step.verb}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={step.icon} /></svg>
                {step.verb}
              </span>
              {step.rest}
            </p>

            {ing ? (
              <section className={`ck-ingredients ck-bloom${closing ? ' is-out' : ''}`} aria-label="Ingredients for this step">
                <p className="st-h2 ck-pop" style={{ animationDelay: '.08s' }}>For this step</p>
                <ul>
                  {uses.map(([name, amt], j) => (
                    <li key={name} className="ck-pop" style={{ animationDelay: `${(0.12 + j * 0.04).toFixed(2)}s` }}>
                      <span>{name}</span>
                      <span className="ck-amt">{amt}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <div className="ck-picture" role="img" aria-label={step.alt}>
                <Illustration step={step} />
              </div>
            )}
          </div>
        </div>

        <button type="button" className={`st-tap ck-ing-btn${open ? ' is-open' : ''}`} aria-expanded={open} onClick={toggleIng}>
          <span aria-hidden="true" className="ck-ico-wrap">
            <svg className="ck-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? 'rotate(90deg) scale(.4)' : 'none', opacity: open ? 0 : 1 }}>
              <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
            <svg className="ck-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? 'none' : 'rotate(-90deg) scale(.4)', opacity: open ? 1 : 0 }}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
          Ingredients
        </button>
      </div>
      {!embedded && <p className="hv-caption">Cooking step on the 5.73 in display. Tap the step number for the next step, and Ingredients for what this step uses.</p>}
    </div>
  )
}
