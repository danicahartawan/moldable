'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

type ModKey = 'serves2' | 'mild' | 'chicken'
type Mods = Record<ModKey, boolean>

const CHIPS: { k: ModKey; label: string; hint: string }[] = [
  { k: 'serves2', label: 'Serves 2', hint: 'half of everything' },
  { k: 'mild', label: 'Less spicy', hint: 'half the sambal' },
  { k: 'chicken', label: 'Chicken', hint: 'instead of pork' },
]
const SAY: Record<ModKey, string> = { serves2: 'Make it for two people', mild: 'Make it less spicy for Oma', chicken: 'Use chicken instead of pork' }
const DONE: Record<ModKey, string> = { serves2: 'Now serves 2. Everything is halved.', mild: 'Sambal is down to half a spoon.', chicken: 'Swapped the pork for chicken.' }

// [name, Oma's words, tidy amount, tidy amount for 2]
const ING = [
  ['Pork', '½ kilo', '500 g', '250 g'], ['Coconut', 'segenggam', '80 g', '40 g'], ['Shallots', '6 butir', '6', '3'], ['Garlic', '4 siung', '4', '2'],
  ['Sambal', '1 sendok', '1 tbsp', '½ tbsp'], ['Kencur', '2 ruas', '2 cm', '1 cm'], ['Pepper', 'sejumput', '½ tsp', '¼ tsp'], ['Lime leaves', '4 lembar', '4', '2'],
  ['Lime', '1 buah', '1', '1'], ['Chives', '1 ikat', '1 bunch', '½ bunch'], ['Rice', '2 gelas', '2 cups', '1 cup'],
]

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
  const [m, setM] = useState<Mods>({ serves2: false, mild: false, chicken: false })
  const [chipsOpen, setChipsOpen] = useState(false)
  const [tidy, setTidy] = useState(true)
  const [voice, setVoice] = useState(0)
  const [said, setSaid] = useState<ModKey>('mild')
  const [view, setView] = useState<'over' | 'steps'>('over')

  const busy = useRef({ voice: 0, chips: false })
  busy.current = { voice, chips: chipsOpen }
  const mods = useRef(m)
  mods.current = m
  const timers = useRef<number[]>([])

  const toggleMod = useCallback((k: ModKey) => {
    setM((cur) => ({ ...cur, [k]: !cur[k] }))
    setTidy(true)
  }, [])

  const talk = useCallback(() => {
    if (busy.current.voice) return
    const next = (['mild', 'serves2', 'chicken'] as ModKey[]).find((k) => !mods.current[k]) ?? 'mild'
    setVoice(1)
    setSaid(next)
    setChipsOpen(false)
    timers.current.push(
      window.setTimeout(() => setVoice(2), 1400),
      window.setTimeout(() => { toggleMod(next); setVoice(3) }, 2900),
      window.setTimeout(() => setVoice(0), 4300),
    )
  }, [toggleMod])

  useEffect(() => {
    const intro = window.setTimeout(talk, 3000)
    const auto = window.setInterval(() => {
      if (!busy.current.voice && !busy.current.chips) setSwap((s) => !s)
    }, 4200)
    const pending = timers.current
    return () => {
      clearTimeout(intro)
      clearInterval(auto)
      pending.forEach(clearTimeout)
    }
  }, [talk])

  const mins = 40 - (m.serves2 ? 10 : 0) - (m.chicken ? 5 : 0)
  const roll = (shown: boolean, from: number): CSSProperties => ({
    transform: `translateY(${shown ? 0 : from}px)`, filter: `blur(${shown ? 0 : 8}px)`, opacity: shown ? 1 : 0,
  })

  const steps: [string, boolean][][] = [
    [['Toast the coconut in a dry pan until golden', false]],
    [['Grind half the shallots and garlic with ', false], [m.mild ? 'a little sambal' : 'the sambal', m.mild], [', kencur, pepper and lime leaves', false]],
    [['Heat the oil and fry the rest of the shallots and garlic', false]],
    [['Add the paste and cook until it smells sweet', false]],
    [['Add the ', false], [m.chicken ? 'chicken' : 'pork', m.chicken], [' and the toasted coconut', false]],
    [['Keep stirring until no pink is left', false]],
    [['Squeeze in the lime and add the chives', false]],
    [['Serve on pandan rice', false]],
  ]

  const voiceLine =
    voice === 1 ? { big: 'Listening…', small: 'Say what you’d like to change' }
    : voice === 2 ? { big: `“${SAY[said]}”`, small: 'Changing the recipe' }
    : { big: DONE[said], small: 'Underlined on the home view' }

  return (
    <div className="hv-stage">
      <div className="hv-screen">
        <button type="button" className="hv-replay" onClick={talk} aria-label="Wireframe only: play the speaking view. On the device it starts when you talk." />

        {chipsOpen && (
          <div className="hv-chips hv-blurin" role="group" aria-label="Adjust the recipe">
            <p className="hv-chips__title">Modify</p>
            {CHIPS.map((c) => (
              <button key={c.k} type="button" className={`hv-tap hv-chip${m[c.k] ? ' is-on' : ''}`} aria-pressed={m[c.k]}
                onClick={() => { toggleMod(c.k); setChipsOpen(false) }}>
                {c.label}<span className="hv-chip__hint">{c.hint}</span>
              </button>
            ))}
            <span aria-hidden="true" className="hv-chips__rule" />
            <button type="button" className={`hv-tap hv-chip${tidy ? ' is-on' : ''}`} aria-pressed={tidy} onClick={() => setTidy((t) => !t)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon d="M10 2.5l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z M15.5 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />Tidy amounts
              </span>
              <span className="hv-chip__hint">{tidy ? 'On' : 'Oma’s words'}</span>
            </button>
          </div>
        )}
        <button type="button" className={`hv-tap hv-adjust${chipsOpen ? ' is-on' : ''}`} aria-expanded={chipsOpen} onClick={() => setChipsOpen((o) => !o)}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h9M15 6h2M3 14h3M9 14h8" /><circle cx="13.5" cy="6" r="1.8" /><circle cx="7.5" cy="14" r="1.8" />
          </svg>
          Adjust
        </button>

        <section className="hv-card hv-recipe" aria-label="Recipe overview">
          <div className="hv-recipe__inner">
            <div className="hv-recipe__head">
              <div style={{ minWidth: 0 }}>
                <h1 className="hv-title">Lelawar Bali</h1>
                <p className="hv-sub">Oma Lien’s recipe</p>
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
                    <li key={i} className="hv-blurin" style={{ animationDelay: `${i * 0.05}s` }}>
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
              let amt = m.serves2 ? r[3] : r[2]
              if (spicy) amt = m.serves2 ? '¼ tbsp' : '½ tbsp'
              const changed = (m.serves2 && r[2] !== r[3]) || spicy
              return (
                <li key={r[0]}>
                  <Mark on={meat}>{meat ? 'Chicken' : r[0]}</Mark>
                  <span className="hv-amt">
                    {tidy ? (
                      <span key={`${amt}-${changed}`} className={`hv-blurin${changed ? ' hv-mark' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>{amt}</span>
                    ) : (
                      <span key="raw" className="hv-blurin">{r[1]}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <p className="hv-wave">Wave to start</p>

        {voice > 0 && (
          <div className="hv-veil" role="status" aria-live="polite">
            <span className={`hv-orb${voice === 3 ? '' : ' hv-orb--talk'}`} aria-hidden="true" />
            <div key={voice} className="hv-blurin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <p className="hv-voice__big">{voiceLine.big}</p>
              <p className="hv-voice__small">{voiceLine.small}</p>
            </div>
          </div>
        )}
      </div>
      <p className="hv-caption">Grandkid home view, 640 × 640 for the 5.73 in display. Tap the top-left corner to replay the voice change.</p>
    </div>
  )
}
