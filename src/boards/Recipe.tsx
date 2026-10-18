'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BoardIcon } from './BoardIcon'
import { BoardHeader } from './BoardShell'

const TABS = ['Klepon', 'Soto ayam', 'Rendang padang', 'Kue lapis']

const STEPS = [
  { t: 'Rinse the chicken. Simmer it in 2 litres of salted water for 30 minutes.', g: ['chicken', 'pot'] },
  { t: 'Pound shallots, garlic, candlenuts and turmeric into a smooth paste.', g: ['shallot', 'garlic', 'nut', 'turmeric'] },
  { t: 'Fry the paste with lemongrass, galangal and lime leaves until fragrant.', g: ['grass', 'galangal', 'leaf'] },
  { t: 'Stir the paste into the broth. Simmer 20 minutes more.', g: ['pot'] },
  { t: 'Lift out the chicken and shred it into thin strips.', g: ['chicken'] },
  { t: 'Soak the glass noodles. Blanch the bean sprouts.', g: ['noodle', 'sprout'] },
  { t: 'Boil the eggs for 9 minutes, then halve them.', g: ['egg'] },
  { t: 'Build each bowl, pour the hot broth over, then top with celery, fried shallots, koya and lime.', g: ['pot', 'garnish', 'noodle', 'egg'] },
]

const PHASES = [
  { name: 'The broth', steps: [0, 3] },
  { name: 'The spice paste', steps: [1, 2] },
  { name: 'Chicken and toppings', steps: [4, 5, 6] },
  { name: 'Build the bowl', steps: [7] },
]

const TRACE_W = 122
const TRACE_H = 50

type Rec = 'idle' | 'starting' | 'on'

function TabIcon({ index }: { index: number }) {
  const common = { fill: 'none', stroke: 'currentColor', 'aria-hidden': true } as const
  if (index === 0) return <svg width="34" height="24" viewBox="0 0 34 24" strokeWidth="1.3" {...common}><circle cx="9" cy="14" r="7" /><circle cx="25" cy="14" r="7" /><circle cx="17" cy="9" r="7" /></svg>
  if (index === 1) return <svg width="34" height="26" viewBox="0 0 34 26" strokeWidth="1.4" {...common}><path d="M3 11h28a14 12 0 0 1-28 0z" /><path d="M12 7c1-2 3-1 4-4M19 7c1-2 3-1 4-4" /></svg>
  if (index === 2) return <svg width="34" height="24" viewBox="0 0 34 24" strokeWidth="1.3" {...common}><path d="M4 10h26M6 10v9a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-9" /><path d="M12 6l1-3M21 6l1-3" /></svg>
  return <svg width="34" height="24" viewBox="0 0 34 24" strokeWidth="1.3" {...common}><rect x="6" y="4" width="22" height="16" rx="2" /><path d="M6 8h22M6 12h22M6 16h22" /></svg>
}

function Drawing({ hl }: { hl: (g: string) => CSSProperties }) {
  const x = (n: number, count: number, from: number, gap: number) => Array.from({ length: count }, (_, i) => from + i * gap + n)
  return (
    <svg
      className="b-drawing"
      viewBox="0 0 1308 710"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Line drawing of every soto ayam ingredient laid out across the board, around the serving bowl"
    >
      <g className="g1" style={hl('pot')}>
        <circle pathLength="1" cx="640" cy="410" r="118" />
        <circle pathLength="1" cx="640" cy="410" r="100" />
        <circle className="b-fade" cx="640" cy="410" r="82" strokeDasharray="2 6" />
        <path pathLength="1" d="M760 410h46M778 398v24" />
      </g>
      <g className="g1" style={hl('chicken')}>
        <path pathLength="1" d="M120 250c0-40 36-66 72-56 30 8 48 40 38 70-6 18-22 30-40 34l-38 60c-4 8-14 10-20 4-6-6-4-16 4-20l14-10c-20-18-30-44-30-82z" />
        <path pathLength="1" d="M250 300c10-38 50-54 82-38 28 14 36 50 20 76-10 16-28 24-46 22l-52 48c-6 6-16 6-20-2-4-6 0-16 8-18l16-6c-12-24-14-52-8-82z" />
      </g>
      <g className="g2" style={hl('shallot')}>
        {x(0, 8, 110, 36).map((cx) => (
          <g key={cx} transform={`translate(${cx} 470)`}><ellipse pathLength="1" rx="11" ry="15" /><path pathLength="1" d="M0 -15v-7" /></g>
        ))}
      </g>
      <g className="g2" style={hl('garlic')}>
        {x(0, 5, 110, 50).map((dx) => (
          <path key={dx} pathLength="1" transform={`translate(${dx - 110} 0)`} d="M110 560c0-16 10-26 18-30 8 4 18 14 18 30 0 10-8 16-18 16s-18-6-18-16z" />
        ))}
      </g>
      <g className="g3" style={hl('nut')}>
        <circle pathLength="1" cx="124" cy="640" r="14" /><circle pathLength="1" cx="162" cy="640" r="14" /><circle pathLength="1" cx="200" cy="640" r="14" />
      </g>
      <g className="g3" style={hl('turmeric')}>
        <path pathLength="1" d="M260 650c10-14 40-14 60-6 14-10 34-8 40 4 6 12-4 24-20 22-14 10-44 10-62 2-14 2-24-10-18-22z" />
        <path pathLength="1" d="M300 646l-6-14M330 652l6-12" />
      </g>
      <g className="g4" style={hl('noodle')}>
        <path pathLength="1" d="M440 620c30-30 60 30 90 0s60 30 90 0 60 30 90 0" />
        <path pathLength="1" d="M440 640c30-30 60 30 90 0s60 30 90 0 60 30 90 0" />
        <path pathLength="1" d="M440 660c30-30 60 30 90 0s60 30 90 0 60 30 90 0" />
      </g>
      <g className="g4" style={hl('sprout')}>
        <path pathLength="1" d="M790 630c10 20 30 30 50 26" /><circle pathLength="1" cx="786" cy="624" r="6" />
        <path pathLength="1" d="M830 620c14 18 34 24 54 18" /><circle pathLength="1" cx="826" cy="614" r="6" />
        <path pathLength="1" d="M800 664c14 14 36 18 54 10" /><circle pathLength="1" cx="796" cy="658" r="6" />
        <path pathLength="1" d="M870 650c12 16 30 22 48 16" /><circle pathLength="1" cx="866" cy="644" r="6" />
      </g>
      <g className="g5" style={hl('egg')}>
        {[1010, 1090, 1170].map((cx) => (
          <g key={cx} transform={`translate(${cx} 500)`}><ellipse pathLength="1" rx="30" ry="40" /><circle pathLength="1" cy="6" r="15" /></g>
        ))}
      </g>
      <g className="g5" style={hl('grass')}>
        <path pathLength="1" d="M940 640l300-50M944 656l300-50" />
        <path pathLength="1" d="M1000 630l2 12M1080 616l2 12M1160 602l2 12" />
      </g>
      <g className="g5" style={hl('galangal')}>
        <path pathLength="1" d="M960 670c14-12 46-10 64-2 18-8 40-4 46 8 4 12-8 20-24 18-18 8-52 8-70 0-14 2-24-12-16-24z" />
        <path pathLength="1" d="M1000 668v-8M1040 670v-8" />
      </g>
      <g className="g5" style={hl('leaf')}>
        <path pathLength="1" d="M1150 650c20-24 54-24 70 0-20 22-52 22-70 0z" /><path pathLength="1" d="M1150 650h70" />
        <path pathLength="1" d="M1200 676c20-24 54-24 70 0-20 22-52 22-70 0z" /><path pathLength="1" d="M1200 676h70" />
      </g>
      <g className="g4" style={hl('garnish')}>
        <path pathLength="1" d="M470 190c20-30 54-30 74 0-20 30-54 30-74 0z" /><path pathLength="1" d="M470 190h74" />
        <path pathLength="1" d="M600 180l40 40M620 170l-10 20M630 196l-14 6" />
        <path pathLength="1" d="M680 160c26 0 48 22 48 48h-48z" />
        <circle pathLength="1" cx="790" cy="190" r="4" /><circle pathLength="1" cx="806" cy="204" r="3" /><circle pathLength="1" cx="778" cy="210" r="3" /><circle pathLength="1" cx="800" cy="178" r="3" />
      </g>
      <g stroke="none" fill="var(--ink)" fontFamily="var(--font-sans)" fontSize="13" letterSpacing="0">
        <text className="b-fade" x="640" y="406" textAnchor="middle" fontWeight="600" opacity={hl('pot').opacity}>2 litres</text>
        <text className="b-fade" x="640" y="421" textAnchor="middle" opacity={hl('pot').opacity}>chicken broth</text>
        <text className="b-fade" x="140" y="190" opacity={hl('chicken').opacity}>1 chicken, about 1.2 kg</text>
        <text className="b-fade" x="110" y="507" opacity={hl('shallot').opacity}>8 shallots</text>
        <text className="b-fade" x="110" y="596" opacity={hl('garlic').opacity}>5 cloves garlic</text>
        <text className="b-fade" x="104" y="676" opacity={hl('nut').opacity}>3 candlenuts</text>
        <text className="b-fade" x="262" y="690" opacity={hl('turmeric').opacity}>4 cm turmeric</text>
        <text className="b-fade" x="530" y="696" textAnchor="middle" opacity={hl('noodle').opacity}>100 g glass noodles</text>
        <text className="b-fade" x="790" y="696" opacity={hl('sprout').opacity}>150 g bean sprouts</text>
        <text className="b-fade" x="1090" y="566" textAnchor="middle" opacity={hl('egg').opacity}>3 eggs, boiled and halved</text>
        <text className="b-fade" x="1250" y="582" textAnchor="end" opacity={hl('grass').opacity}>2 stalks lemongrass</text>
        <text className="b-fade" x="960" y="704" opacity={hl('galangal').opacity}>3 cm galangal</text>
        <text className="b-fade" x="1290" y="704" textAnchor="end" opacity={hl('leaf').opacity}>4 lime leaves</text>
        <text className="b-fade" x="470" y="240" opacity={hl('garnish').opacity}>Celery, fried shallots, koya and lime to finish</text>
      </g>
    </svg>
  )
}

export function RecipeBoard() {
  const [tab, setTab] = useState(1)
  const [cook, setCook] = useState({ step: 0, prog: 0 })
  const [hover, setHover] = useState(false)
  const [mode, setMode] = useState<'one' | 'all'>('one')
  const [openPh, setOpenPh] = useState<number | null>(null)
  const [rec, setRec] = useState<Rec>('idle')
  const [recSec, setRecSec] = useState(0)
  const [trace, setTrace] = useState(0)
  const [tracing, setTracing] = useState(false)
  const timers = useRef<{ start?: number; end?: number; raf?: number }>({})

  const all = mode === 'all'
  const paused = hover || all

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setCook((c) => (c.prog + 0.016 >= 1 ? { step: (c.step + 1) % STEPS.length, prog: 0 } : { ...c, prog: c.prog + 0.016 }))
    }, 60)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    if (rec !== 'on') return
    const id = setInterval(() => setRecSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [rec])

  useEffect(() => {
    const t = timers.current
    return () => {
      clearTimeout(t.start)
      clearTimeout(t.end)
      if (t.raf) cancelAnimationFrame(t.raf)
    }
  }, [])

  const { step, prog } = cook
  const goTo = (i: number) => setCook({ step: (i + STEPS.length) % STEPS.length, prog: 0 })
  const active = STEPS[step].g
  const hl = (g: string): CSSProperties => {
    const on = active.includes(g)
    return { stroke: on ? 'var(--ember-ink)' : 'var(--ink)', strokeWidth: on ? 2.2 : 1.3, opacity: on ? 1 : 0.2 }
  }

  const toggleRec = () => {
    if (rec === 'idle') {
      setRec('starting')
      setRecSec(0)
      timers.current.start = window.setTimeout(() => setRec('on'), 900)
    } else if (rec === 'on') setRec('idle')
  }

  const startCooking = () => {
    if (tracing) return
    const t0 = performance.now()
    setTracing(true)
    setTrace(0)
    setCook({ step: 0, prog: 0 })
    setMode('one')
    setHover(false)
    const f = (now: number) => {
      const x = Math.min(1, (now - t0) / 2600)
      setTrace(x)
      if (x < 1) timers.current.raf = requestAnimationFrame(f)
      else
        timers.current.end = window.setTimeout(() => {
          setTracing(false)
          setTrace(0)
        }, 2200)
    }
    timers.current.raf = requestAnimationFrame(f)
  }

  const done = trace >= 1
  const mm = Math.floor(recSec / 60)
  const ss = recSec % 60
  const peekLabel = all ? 'Back to one step' : 'Show all steps'

  const rowStyle = (i: number): CSSProperties => {
    const d = i - step
    let y: number, op: number, blur: number, size: number, lh: number
    if (all) {
      y = i * 37; op = d === 0 ? 1 : 0.7; blur = 0; size = 14; lh = 18
    } else {
      y = d < 0 ? -60 : d === 0 ? 0 : 96 + (d - 1) * 64
      op = d < 0 ? 0 : d === 0 ? 1 : d === 1 ? 0.5 : d === 2 ? 0.22 : 0
      blur = d <= 0 ? (d < 0 ? 6 : 0) : d === 1 ? 1.6 : 3.5
      size = d === 0 ? 22 : 17; lh = d === 0 ? 30 : 24
    }
    return {
      transform: `translateY(${y}px)`, opacity: op, filter: `blur(${blur}px)`, fontSize: size, lineHeight: `${lh}px`,
      fontWeight: d === 0 ? 600 : 400, pointerEvents: op > 0.1 ? 'auto' : 'none',
    }
  }

  return (
    <div className="b-frame">
      <BoardHeader>
        <nav aria-label="Recipes" className="b-header__mid" style={{ gap: 14 }}>
          {TABS.map((name, i) => {
            const on = i === tab
            return (
              <button
                key={name}
                type="button"
                className="b-tab"
                aria-pressed={on}
                aria-label={name}
                onClick={() => setTab(i)}
                style={{
                  height: on ? 56 : 52, padding: on ? '0 18px 0 12px' : '0 15px',
                  background: on ? 'var(--flour-raised)' : 'var(--flour-sunken)', boxShadow: on ? 'var(--shadow-1)' : 'none',
                }}
              >
                <TabIcon index={i} />
                {on && <span className="b-blurin" style={{ whiteSpace: 'nowrap' }}>{name}</span>}
              </button>
            )
          })}
          <button type="button" className="b-tab b-tab--add" aria-label="Add a recipe"><BoardIcon name="plus" /></button>
        </nav>
        <button type="button" className="b-icon-btn b-press" aria-label="Scan a recipe card"><BoardIcon name="scan" size={22} /></button>
        <button type="button" className="b-icon-btn b-press" aria-label="Ask about this recipe"><BoardIcon name="chat" size={22} /></button>
        <button type="button" className="b-btn b-press" onClick={toggleRec} aria-pressed={rec === 'on'} style={{ minWidth: 176, fontSize: 18 }}>
          {rec === 'idle' && <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><BoardIcon name="mic" />Record</span>}
          {rec === 'starting' && (
            <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <svg className="b-dots" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                {[4, 10, 16].flatMap((cy, r) => [4, 10, 16].map((cx, c) => (
                  <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="1.4" style={{ animationDelay: `${(r + c) * 0.09}s` }} />
                )))}
              </svg>
              Starting
            </span>
          )}
          {rec === 'on' && (
            <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="b-recdot" />
              <span className="b-tabular">{mm}:{ss < 10 ? '0' : ''}{ss}</span>
            </span>
          )}
        </button>
      </BoardHeader>

      <main className="b-recipe">
        <Drawing hl={hl} />

        <div className="b-title-block">
          <p className="b-flare b-muted" style={{ fontSize: 24, lineHeight: '28px' }}>Cook this board</p>
          <p className="b-flare" style={{ marginTop: 2, fontSize: 40, lineHeight: '44px' }}>Soto ayam</p>
          <p className="b-muted" style={{ marginTop: 10, fontSize: 14, lineHeight: '20px' }}>Oma Lien’s recipe, Surabaya style, serves 6</p>
        </div>

        <section className="b-stepzone" aria-label="Steps" onMouseLeave={() => setHover(false)}>
          <div className="b-stepzone__bar">
            <button type="button" className="b-peek b-press" aria-pressed={all} aria-label={peekLabel} title={peekLabel}
              onClick={() => { setMode(all ? 'one' : 'all'); setCook((c) => ({ ...c, prog: 0 })); setOpenPh(null) }}>
              <BoardIcon key={mode} name={all ? 'chevUp' : 'list'} size={18} className="b-blurin" />
              <span className="b-peek__label">{all ? 'One step' : 'All steps'}</span>
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="b-icon-btn b-icon-btn--sm b-press" aria-label="Previous step" onClick={() => goTo(step - 1)}><BoardIcon name="up" size={18} /></button>
              <button type="button" className="b-icon-btn b-icon-btn--sm b-press" aria-label="Next step" onClick={() => goTo(step + 1)}><BoardIcon name="down" size={18} /></button>
              <div style={{ position: 'relative', padding: 5, margin: '-5px -5px -5px 0' }}>
                <svg width={TRACE_W} height={TRACE_H} viewBox={`0 0 ${TRACE_W} ${TRACE_H}`} fill="none" aria-hidden="true"
                  style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
                  <rect x="1.25" y="1.25" width={TRACE_W - 2.5} height={TRACE_H - 2.5} rx="10"
                    stroke={tracing ? (done ? 'var(--basil)' : 'var(--thermal-ember)') : 'transparent'} strokeWidth="2.5" strokeLinecap="round" pathLength="100"
                    strokeDasharray={`${(trace * 100).toFixed(2)} ${(100.001 - trace * 100).toFixed(2)}`}
                    style={{ filter: done ? 'none' : 'drop-shadow(0 0 4px var(--thermal-ember)) drop-shadow(0 0 8px var(--thermal-ember))' }} />
                </svg>
                <button type="button" className="b-go b-press" onClick={startCooking} aria-live="polite" style={{ background: done ? 'var(--basil)' : 'var(--ink)' }}>
                  {!tracing && <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BoardIcon name="flame" size={18} />Start</span>}
                  {tracing && !done && <span className="b-blurin b-tabular">{Math.round(trace * 100)}%</span>}
                  {done && <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BoardIcon name="check" size={18} stroke={2} />Cooking</span>}
                </button>
              </div>
            </div>
          </div>

          {!all && (
            <ol className="b-steps">
              {STEPS.map((s, i) => {
                const cur = i === step
                return (
                  <li key={i} className="b-step-row" aria-current={cur ? 'step' : undefined} style={rowStyle(i)}
                    onMouseEnter={() => { setCook({ step: i, prog: 0 }); setHover(true) }}
                    onClick={() => { setCook({ step: i, prog: 0 }); setHover(true) }}>
                    <span className="b-step-num" style={{ border: '1.3px solid var(--ink)', background: cur ? 'var(--ink)' : 'transparent', color: cur ? 'var(--flour)' : 'var(--ink)' }}>{i + 1}</span>
                    <span className="b-step-text">
                      {s.t}
                      <span aria-hidden="true" className="b-step-bar" style={{ width: `${cur ? Math.round((hover ? 1 : prog) * 100) : 0}%` }} />
                    </span>
                  </li>
                )
              })}
            </ol>
          )}

          {all && (
            <div className="b-phases b-blurin">
              {PHASES.map((ph, pi) => {
                const holds = ph.steps.includes(step)
                const open = openPh == null ? holds : openPh === pi
                return (
                  <div key={ph.name} className="b-phase">
                    <span aria-hidden="true" className="b-phase__mark" style={{ background: holds ? 'var(--ink)' : 'transparent' }} />
                    <button type="button" className="b-phase__name" aria-expanded={open}
                      style={{ fontWeight: holds ? 500 : 400, color: holds || open ? 'var(--ink)' : 'var(--line-strong)' }}
                      onClick={() => setOpenPh(open && openPh === pi ? -1 : pi)}>{ph.name}</button>
                    {open && (
                      <ul className="b-blurin">
                        {ph.steps.map((si, k) => {
                          const cur = si === step
                          const last = k === ph.steps.length - 1
                          return (
                            <li key={si} onClick={() => setCook({ step: si, prog: 0 })} onMouseEnter={() => setCook({ step: si, prog: 0 })}>
                              <span aria-hidden="true" className="b-phase__rail" style={{ height: last ? '50%' : '100%' }} />
                              <span aria-hidden="true" className="b-phase__elbow" style={{ borderColor: cur ? 'var(--ink)' : 'var(--line)' }} />
                              <span className="b-phase__item" style={{ color: cur ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: cur ? 500 : 400 }}>
                                <span className="b-phase__n" style={{ borderColor: cur ? 'var(--ink)' : 'var(--ink-faint)', background: cur ? 'var(--ink)' : 'transparent', color: cur ? 'var(--flour)' : 'var(--ink-muted)' }}>{si + 1}</span>
                                <span>{STEPS[si].t}</span>
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
