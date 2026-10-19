'use client'

import { useEffect, useState } from 'react'
import { BoardIcon } from './BoardIcon'
import { BoardHeader } from './BoardShell'
import { HoldToAsk } from './RecordButton'

const PER_CUP = 240
const FRACTIONS: [number, string][] = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']]

function cupsOf(g: number) {
  const n = g / PER_CUP
  let whole = Math.floor(n)
  const rem = n - whole
  let best = FRACTIONS[0]
  for (const f of FRACTIONS) if (Math.abs(f[0] - rem) < Math.abs(best[0] - rem)) best = f
  if (best[0] === 1) {
    whole += 1
    best = FRACTIONS[0]
  }
  return (whole ? String(whole) : '') + best[1] || '0'
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

const ICON: Record<string, string> = {
  drop: 'M10 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z',
  leg: 'M7 4a4 4 0 0 1 6 5l-5 6a1.6 1.6 0 1 1-2-2l-1 1a1.4 1.4 0 1 1-1-2.4L6 9A4 4 0 0 1 7 4z',
  bulb: 'M10 4c3 2 5 5 5 8a5 4 0 0 1-10 0c0-3 2-6 5-8zM10 4V2',
  clove: 'M10 4c2 3 4 6 4 9a4 3 0 0 1-8 0c0-3 2-6 4-9z',
  nut: 'M10 4a6 6 0 1 1 0 12a6 6 0 1 1 0-12zM8 9h.01M12 11h.01',
  root: 'M3 12c2-3 7-3 9-1 2-2 5-1 5 1s-3 3-5 2c-3 2-7 2-9-2z',
  noodle: 'M3 7c2-3 4 3 7 0s5 3 7 0M3 11c2-3 4 3 7 0s5 3 7 0M3 15c2-3 4 3 7 0s5 3 7 0',
}

const ITEMS = [
  { name: 'Chicken', short: 'Chkn', target: 1200, icon: 'leg', note: 'Whole, rinsed' },
  { name: 'Water', short: 'Water', target: 2000, icon: 'drop', note: 'For the broth, 2 litres' },
  { name: 'Shallots', short: 'Shal', target: 120, icon: 'bulb', note: '8 shallots, peeled' },
  { name: 'Garlic', short: 'Garl', target: 30, icon: 'clove', note: '5 cloves' },
  { name: 'Candlenuts', short: 'Nuts', target: 24, icon: 'nut', note: '3 candlenuts, toasted' },
  { name: 'Turmeric', short: 'Turm', target: 20, icon: 'root', note: '4 cm piece' },
  { name: 'Glass noodles', short: 'Ndl', target: 100, icon: 'noodle', note: 'Soak after weighing' },
]

const MENU = [
  { label: 'Zero the scale', hint: 'Tare', act: 'zero' },
  { label: 'Pour again', hint: 'Reset', act: 'again' },
  { label: 'Pause weighing', hint: 'Hold', act: 'pause' },
]

const RING = ['var(--thermal-violet)', 'var(--thermal-magenta)', 'var(--thermal-ember)', '#e8c23a']
const GLOW = ['var(--thermal-violet)', 'var(--thermal-magenta)', 'var(--thermal-ember)', 'var(--thermal-flare)']

type ItemState = 'done' | 'live' | 'next'

export function WeighBoard() {
  const [live, setLive] = useState(1)
  const [sel, setSel] = useState(1)
  const [g, setG] = useState(0)
  const [unit, setUnit] = useState<'g' | 'cups'>('g')
  const [pause, setPause] = useState(900)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const [held, setHeld] = useState(false)

  const item = ITEMS[live]
  const target = item.target

  useEffect(() => {
    if (held) return
    const id = setInterval(() => {
      if (pause > 0) {
        setPause((p) => p - 80)
        return
      }
      setG((cur) => (cur >= target ? cur : Math.min(target, cur + Math.max(4, (target - cur) * 0.04) + Math.random() * 8)))
    }, 80)
    return () => clearInterval(id)
  }, [held, pause, target])

  const grams = Math.round(g)
  const done = grams >= target
  const frac = Math.min(1, g / target)
  const band = Math.min(3, Math.floor(frac * 4))
  const stateOf = (i: number): ItemState => (i < live || (i === live && done) ? 'done' : i === live ? 'live' : 'next')
  const doneCount = ITEMS.filter((_, i) => stateOf(i) === 'done').length
  const hint = done ? 'Stop pouring. Pick the next ingredient below.' : held ? 'Weighing paused.' : pause > 0 ? 'Bowl found. Start pouring.' : `Pour slowly. The ring closes at ${fmt(target)} g.`
  const dash = `${(frac * 100).toFixed(2)} 100`

  const startItem = (i: number) => { setSel(i); setLive(i); setG(0); setPause(900) }
  const selected = ITEMS[sel]
  const selState = stateOf(sel)
  const tone = {
    done: { tile: 'var(--basil-soft)', fg: 'var(--basil)', text: 'var(--basil)', label: 'Weighed' },
    live: { tile: 'var(--yolk-soft)', fg: 'var(--yolk-ink)', text: 'var(--yolk-ink)', label: 'On the scale now' },
    next: { tile: 'var(--violet-soft)', fg: 'var(--thermal-violet)', text: 'var(--ink-muted)', label: 'Up next' },
  }[selState]

  return (
    <div className="b-frame">
      <BoardHeader>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <p className="b-muted" style={{ margin: 0, fontSize: 14, lineHeight: '18px' }}>Step 1 of 8, soto ayam</p>
          <p style={{ margin: 0, fontSize: 24, lineHeight: '28px', fontWeight: 300, letterSpacing: '-0.01em' }}>
            {done ? `${item.name} weighed` : `Pour in the ${item.name.toLowerCase()}`}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" className="b-icon-btn b-press" aria-haspopup="menu" aria-expanded={menuOpen}
            onClick={() => { setMenuOpen((o) => !o); setHi(-1) }}
            style={{ width: 'auto', height: 52, gap: 8, padding: '0 16px 0 18px', fontSize: 16, fontWeight: 300, background: menuOpen ? 'var(--line)' : 'var(--flour-sunken)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <BoardIcon name="scale" />Scale
              <BoardIcon name="chevDown" size={16} stroke={1.8} style={{ transform: `rotate(${menuOpen ? 180 : 0}deg)`, transition: 'transform 240ms cubic-bezier(0.3, 1.4, 0.5, 1)' }} />
            </span>
          </button>
          {menuOpen && (
            <div className="b-menu" role="menu" onMouseLeave={() => setHi(-1)}>
              <span aria-hidden="true" className="b-menu__hi" style={{ transform: `translateY(${Math.max(0, hi) * 44}px)`, opacity: hi < 0 ? 0 : 1 }} />
              {MENU.map((m, i) => (
                <button key={m.act} type="button" role="menuitem" style={{ fontWeight: i === hi ? 500 : 400 }}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => {
                    if (m.act === 'pause') setHeld((h) => !h)
                    else { setG(0); setPause(900); setHeld(false) }
                    setMenuOpen(false)
                  }}>
                  <span style={{ flex: 1 }}>{held && m.act === 'pause' ? 'Resume weighing' : m.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--line-strong)' }}>{m.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <HoldToAsk />
      </BoardHeader>

      <main className="b-main b-weigh-layout">
        <section aria-label="Scale" style={{ position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <p className="b-muted" style={{ margin: 0, fontSize: 15, lineHeight: '20px' }}>{hint}</p>
          <div style={{ position: 'relative', width: 'min(560px, 100%)', aspectRatio: '1' }}>
            <div style={{ position: 'absolute', inset: '7.14%', borderRadius: '50%', background: 'var(--flour-sunken)' }} />
            <svg viewBox="0 0 560 560" fill="none" role="img" aria-label={`${grams} of ${target} grams of ${item.name.toLowerCase()}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <circle cx="280" cy="280" r="262" stroke="var(--line)" strokeWidth="8" />
              <circle className="b-ring" cx="280" cy="280" r="262" stroke={done ? 'var(--basil)' : GLOW[band]} strokeWidth="18" opacity=".22" pathLength="100" strokeDasharray={dash} transform="rotate(-90 280 280)" strokeLinecap="round" />
              <circle className="b-ring" cx="280" cy="280" r="262" stroke={done ? 'var(--basil)' : RING[band]} strokeWidth="8" pathLength="100" strokeDasharray={dash} transform="rotate(-90 280 280)" strokeLinecap="round" />
              <path d="M280 10v14" stroke="var(--ink)" strokeWidth="2" />
              <circle cx="280" cy="280" r="170" stroke="var(--ink)" strokeWidth="1.3" strokeDasharray="3 6" />
              <circle cx="280" cy="280" r="132" stroke="var(--ink)" strokeWidth="1.3" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <p className="b-muted" style={{ margin: 0, fontSize: 15, lineHeight: '20px' }}>{item.name}</p>
              {unit === 'g' && (
                <p className="b-blurin b-tabular" aria-hidden="true" style={{ margin: 0, fontSize: 'clamp(64px, 11vw, 104px)', lineHeight: 1, fontWeight: 300, letterSpacing: '-0.045em', display: 'flex', alignItems: 'baseline' }}>
                  {fmt(grams).split('').map((c, i) =>
                    c === ',' ? (
                      <span key={i} style={{ color: 'var(--ink-faint)' }}>,</span>
                    ) : (
                      <span key={i} className="b-rcol">
                        <span className="b-rstrip" style={{ transform: `translateY(${-(+c) * 10}%)`, transitionDelay: `${i * 40}ms` }}>
                          {Array.from({ length: 10 }, (_, d) => <span key={d}>{d}</span>)}
                        </span>
                      </span>
                    ),
                  )}
                  <span className="b-muted" style={{ fontSize: 36, fontWeight: 300, letterSpacing: 0, marginLeft: 10 }}>g</span>
                </p>
              )}
              {unit === 'cups' && (
                <p className="b-blurin" style={{ margin: 0, fontSize: 'clamp(64px, 11vw, 104px)', lineHeight: 1, fontWeight: 300, letterSpacing: '-0.045em' }}>
                  {cupsOf(g)}<span className="b-muted" style={{ fontSize: 36, fontWeight: 300, letterSpacing: 0, marginLeft: 10 }}>cups</span>
                </p>
              )}
              {!done && (
                <p className="b-muted" style={{ margin: 0, fontSize: 18, lineHeight: '24px' }}>
                  {unit === 'g' ? `of ${fmt(target)} g` : `of ${cupsOf(target)} cups`}, <b style={{ color: 'var(--yolk-ink)', fontWeight: 300 }}>{fmt(target - grams)} g to go</b>
                </p>
              )}
              {done && (
                <p className="b-pop" style={{ margin: 0, height: 36, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px 0 12px', borderRadius: 'var(--radius-sm)', background: 'var(--basil-soft)', color: 'var(--basil)', fontSize: 17, fontWeight: 300 }}>
                  <BoardIcon name="check" className="b-drawcheck" stroke={2} />Right on target
                </p>
              )}
            </div>
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div className="b-seg" role="group" aria-label="Units">
            <span aria-hidden="true" className="b-seg__pill" style={{ transform: `translateX(${unit === 'g' ? 0 : 140}px)` }} />
            <button type="button" aria-pressed={unit === 'g'} onClick={() => setUnit('g')} style={{ color: unit === 'g' ? 'var(--ink)' : 'var(--ink-muted)' }}>
              <BoardIcon name="scale" size={18} style={{ color: unit === 'g' ? 'var(--thermal-violet)' : undefined }} />Grams
            </button>
            <button type="button" aria-pressed={unit === 'cups'} onClick={() => setUnit('cups')} style={{ color: unit === 'cups' ? 'var(--ink)' : 'var(--ink-muted)' }}>
              <BoardIcon name="cup" size={18} style={{ color: unit === 'cups' ? 'var(--thermal-violet)' : undefined }} />Her cups
            </button>
          </div>

          <div className="b-card" style={{ padding: '18px 16px 16px' }}>
            <p className="b-muted" style={{ margin: '0 4px 12px', fontSize: 15, lineHeight: '20px' }}>
              You’ve weighed <b style={{ color: 'var(--ink)', fontWeight: 300 }}>{doneCount} of {ITEMS.length}</b> for this soto
            </p>
            <div className="b-days" role="radiogroup" aria-label="Ingredients to weigh">
              {ITEMS.map((x, i) => {
                const k = stateOf(i)
                const on = i === sel
                const color = k === 'done' ? 'var(--basil)' : k === 'live' ? 'var(--thermal-ember)' : on ? 'var(--line-strong)' : 'var(--ink-faint)'
                return (
                  <button key={x.name} type="button" className="b-day" role="radio" aria-checked={on} aria-label={x.name}
                    style={{ background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--flour)' : 'var(--ink)' }}
                    onClick={() => (done && i === live + 1 ? startItem(i) : setSel(i))}>
                    <span>{x.short}</span>
                    <span className="b-dot" style={{ background: k === 'done' ? 'var(--basil)' : k === 'live' ? 'var(--thermal-ember)' : 'transparent', borderColor: color }}>
                      {k === 'done' && <BoardIcon name="check" size={10} stroke={3} style={{ color: '#fff' }} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div key={sel} className="b-card b-cardin">
            <span style={{ display: 'grid', width: 44, height: 44, flex: 'none', placeItems: 'center', borderRadius: 'var(--radius-sm)', background: tone.tile, color: tone.fg }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[selected.icon]} /></svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, lineHeight: '22px', fontWeight: 300 }}>{selected.name}</p>
              <p className="b-muted" style={{ margin: '2px 0 0', fontSize: 13, lineHeight: '18px' }}>{selected.note}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="b-tabular" style={{ margin: 0, fontSize: 17, lineHeight: '22px', fontWeight: 300 }}>
                {selState === 'live' ? `${fmt(grams)} / ${fmt(selected.target)} g` : `${fmt(selected.target)} g`}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: '18px', color: tone.text }}>{tone.label}</p>
            </div>
          </div>

          <button type="button" className="b-btn b-press" disabled={!done || live >= ITEMS.length - 1}
            onClick={() => startItem(live + 1)}
            style={{ marginTop: 'auto', background: done ? 'var(--thermal-violet)' : '#a993c7', color: '#fff', boxShadow: '0 1px 2px rgba(31, 28, 25, 0.18)', transition: 'background-color 300ms ease', cursor: done ? 'pointer' : 'default' }}>
            Done, next step<BoardIcon name="next" />
          </button>
        </aside>
      </main>
    </div>
  )
}
