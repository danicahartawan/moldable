'use client'

import { useEffect, useState } from 'react'
import { BoardIcon } from './BoardIcon'
import { BoardHeader } from './BoardShell'

const HEARD = [
  { title: 'Step 3: Pound the spice paste', quote: '“Cabe, bawang, bawang putih, tumbuk kasar aja, jangan halus.”', plain: 'Chillies, shallots, garlic. Pound coarse, not smooth.', ask: '' },
  { title: 'Step 4: Fry until fragrant', quote: '“Kalau sudah wangi, baru masuk daging.”', plain: 'Once it smells fragrant, then add the meat.', ask: 'how long?' },
  { title: 'Step 5: Seal the beef', quote: '“Dagingnya dibolak-balik sampai nggak merah lagi.”', plain: 'Turn the beef until no red is left.', ask: '' },
]

export function RecordBoard() {
  const [live, setLive] = useState(true)
  const [think, setThink] = useState(true)
  const [tenth, setTenth] = useState(8)
  const [sec, setSec] = useState(134)
  const [shown, setShown] = useState(1)
  const [typing, setTyping] = useState(10)
  const [bars, setBars] = useState([10, 22, 32, 18, 26, 12, 30, 16, 8, 20, 14, 24])

  useEffect(() => {
    if (!live) return
    const wave = setInterval(() => {
      setTenth((t) => (t >= 49 ? 3 : t + 1))
      setBars((b) => b.map(() => 6 + Math.round(Math.random() * 30)))
      setTyping((t) => Math.min(90, t + 6))
    }, 140)
    const clock = setInterval(() => {
      setSec((s) => s + 1)
      setTyping((t) => {
        if (t < 90) return t
        setShown((n) => (n >= HEARD.length ? 1 : n + 1))
        return 10
      })
    }, 1000)
    return () => { clearInterval(wave); clearInterval(clock) }
  }, [live])

  const mm = Math.floor(sec / 60)
  const ss = sec % 60

  return (
    <div className="b-frame">
      <BoardHeader>
        <div className="b-header__mid" style={{ gap: 18 }}>
          <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(78,11,145,.22), rgba(78,11,145,0))' }}>
            {live ? (
              <svg width="56" height="56" viewBox="-30 -30 60 60" fill="none" stroke="var(--thermal-violet)" strokeWidth="4.5" strokeLinecap="round" aria-hidden="true">
                <g className="b-orbit"><path d="M-6 -21Q4 -22 12 -17" /></g>
                <g className="b-orbit b"><path d="M21 4Q19 13 12 18" /></g>
                <g className="b-orbit c"><path d="M-15 15Q-20 8 -21 0" /></g>
              </svg>
            ) : (
              <svg className="b-blurin" width="56" height="56" viewBox="-30 -30 60 60" fill="none" stroke="var(--thermal-violet)" strokeLinecap="round" aria-hidden="true">
                <path d="M-7 -6v-1" strokeWidth="5" /><path d="M7 -6v-1" strokeWidth="5" /><path d="M-7 8h14" strokeWidth="5" />
              </svg>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="b-muted" style={{ margin: 0, fontSize: 11, lineHeight: '14px', fontWeight: 500 }}>{live ? 'New recipe, listening' : 'New recipe, paused'}</p>
            <p style={{ margin: 0, fontSize: 24, lineHeight: '28px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              {live ? 'Oma Lien is talking' : 'Saved as a draft'}{' '}
              <span className="b-muted b-tabular" style={{ fontWeight: 400 }}>{mm}:{ss < 10 ? '0' : ''}{ss}</span>
            </p>
          </div>
          <div role="img" aria-label="Voice level" style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40, width: 70 }}>
            {bars.map((h, i) => (
              <span key={i} className="b-bar" style={{ height: live ? h : 4, background: live && i < 9 ? 'var(--thermal-violet)' : 'var(--ink-faint)' }} />
            ))}
          </div>
        </div>
        <button type="button" className="b-btn b-press" onClick={() => setLive((l) => !l)} style={{ minWidth: 150, fontSize: 18 }}>
          {live ? (
            <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--chili)' }} />Stop</span>
          ) : (
            <span className="b-blurin" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><BoardIcon name="mic" />Keep going</span>
          )}
        </button>
      </BoardHeader>

      <main className="b-main b-record-layout">
        <section aria-label="Scan area" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <p className="b-eyebrow">Lay her card here to scan it</p>
          <div style={{ position: 'relative', height: 300, display: 'grid', placeItems: 'center', overflow: 'hidden', borderRadius: 'var(--radius-md)', background: 'var(--flour-sunken)' }}>
            <svg width="280" height="280" viewBox="0 0 420 420" fill="none" strokeLinecap="round" role="img" aria-label="Recipe card inside the scan corners">
              <g className="b-corner" stroke="var(--ember-ink)" strokeWidth="4"><path d="M10 60V10h50M360 10h50v50M410 360v50h-50M60 410H10v-50" /></g>
              <g transform="translate(210 210) rotate(-4) translate(-160 -110)">
                <rect width="320" height="220" fill="var(--flour-raised)" stroke="var(--ink)" strokeWidth="1.3" />
                <path d="M0 40h320" stroke="var(--card-margin)" strokeWidth="2" />
                <path d="M0 68h320M0 92h320M0 116h320M0 140h320M0 164h320M0 188h320" stroke="var(--card-rule)" strokeWidth="1" />
                <path d="M18 28c20-8 40 4 60-2s30-6 50 0" stroke="var(--magenta-ink)" strokeWidth="2" />
                <path d="M18 62c30-4 70 2 110-1M18 86c40-3 90 3 150 0M18 110c30-2 60 3 90 0M18 134c50-3 110 2 170-1M18 158c30-2 50 2 80 0" stroke="var(--ink)" strokeWidth="1.2" />
              </g>
              {live && (
                <g className="b-scanline"><path d="M20 20h380" stroke="var(--thermal-ember)" strokeWidth="10" opacity=".25" /><path d="M20 20h380" stroke="var(--ember-ink)" strokeWidth="2" /></g>
              )}
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="b-press" aria-expanded={think} onClick={() => setThink((t) => !t)}
              style={{ alignSelf: 'flex-start', height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--magenta-soft)', color: 'var(--magenta-ink)', fontSize: 14, fontWeight: 500 }}>
              Understanding
              <BoardIcon name="chevUp" size={14} stroke={2} style={{ transform: `rotate(${think ? 0 : 180}deg)`, transition: 'transform 240ms cubic-bezier(0.3, 1.4, 0.5, 1)' }} />
            </button>
            {think && (
              <div className="b-think b-card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 12px', borderBottom: '1px dashed var(--line)' }}>
                  <span className="b-chip">Her voice <span className="b-tag" style={{ color: 'var(--thermal-violet)', background: 'var(--violet-soft)' }}>Bahasa</span></span>
                  <span className="b-chip">Her card <span className="b-tag" style={{ color: 'var(--yolk-ink)', background: 'var(--yolk-soft)' }}>Handwriting</span></span>
                </div>
                <dl style={{ margin: 0, padding: '8px 16px 10px', display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 8, columnGap: 16, fontSize: 14, lineHeight: '20px' }}>
                  <dt className="b-muted">Card read</dt><dd style={{ margin: 0, textAlign: 'right' }}>14 lines, 2 crossed out</dd>
                  <dt className="b-muted">Steps found</dt><dd className="b-tabular" style={{ margin: 0, textAlign: 'right' }}>{shown + 2} so far</dd>
                  <dt className="b-muted">Matched to card</dt><dd style={{ margin: 0, textAlign: 'right' }}>{shown + 1} of {shown + 2}</dd>
                  <dt className="b-muted">Units</dt><dd style={{ margin: 0, textAlign: 'right' }}>Cups and pieces, weighed on the board</dd>
                  <dt className="b-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BoardIcon name="arc" size={14} stroke={2.2} className={live ? 'b-spin' : undefined} />{live ? 'Listening' : 'Paused'}
                  </dt>
                  <dd className="b-tabular" style={{ margin: 0, textAlign: 'right' }}>{(tenth / 10).toFixed(1)}s</dd>
                </dl>
              </div>
            )}
            <div className="b-muted" style={{ display: 'flex', gap: 14, paddingLeft: 4, fontSize: 13 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BoardIcon name="folder" size={14} />Saved on the board</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--thermal-violet)' }}><BoardIcon name="family" size={14} />Family only</span>
            </div>
          </div>
        </section>

        <section aria-label="What we heard" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <p className="b-eyebrow">What we heard, turned into steps</p>
          {HEARD.slice(0, shown).map((c) => (
            <article key={c.title} className="b-blurin b-card" style={{ background: 'var(--flour)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>{c.title}</p>
                {c.ask ? (
                  <span className="b-blurin b-pillbadge" style={{ background: 'var(--yolk-soft)', color: 'var(--yolk-ink)' }}>Needs a look: {c.ask}</span>
                ) : (
                  <span className="b-blurin b-pillbadge" style={{ gap: 6, padding: '0 12px 0 9px', background: 'var(--basil-soft)', color: 'var(--basil)' }}>
                    <BoardIcon name="check" size={16} stroke={2} className="b-drawcheck" />Matched the card
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: 16, lineHeight: '24px', color: 'var(--magenta-ink)' }}>{c.quote}</p>
              <p className="b-muted" style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>{c.plain}</p>
            </article>
          ))}
          {live && (
            <article className="b-dashed" style={{ border: '1.5px dashed var(--ink-faint)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="b-muted" style={{ margin: 0, fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>Step {shown + 3}, listening…</p>
              <div style={{ height: 10, width: `${typing}%`, borderRadius: 4, background: 'var(--line)', transition: 'width 300ms ease' }} />
            </article>
          )}
          <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="b-btn b-press" style={{ padding: '0 24px' }}><BoardIcon name="chat" />Ask her a question</button>
            <button type="button" className="b-btn b-btn--primary b-press" style={{ padding: '0 26px' }}><BoardIcon name="book" />Save to family book</button>
          </div>
        </section>
      </main>
    </div>
  )
}
