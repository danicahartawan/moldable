'use client'

import { useCallback, useEffect, useState } from 'react'
import { BoardIcon } from './BoardIcon'
import { BoardHeader } from './BoardShell'
import { HoldToAsk } from './RecordButton'

// [x, y1, y2] for each 3 mm cut line on the shallot.
const LINES = [[208, 150, 510], [236, 132, 528], [264, 122, 538], [292, 116, 544], [320, 112, 548], [348, 110, 550], [376, 108, 552], [404, 108, 552], [432, 108, 552], [460, 108, 552], [488, 108, 552], [516, 108, 552], [544, 108, 552], [572, 110, 550], [600, 112, 548], [628, 116, 544], [656, 122, 538], [684, 132, 528]]
const FIRST = LINES[0][0]
const TOTAL_SHALLOTS = 12

type State = { next: number; shallots: number; fresh: number; flash: number; idle: number }

export function StepBoard() {
  const [s, setS] = useState<State>({ next: 3, shallots: 6, fresh: -1, flash: 0, idle: 0 })

  const advance = useCallback((st: State): State => {
    const n = st.next + 1
    if (n >= LINES.length) {
      const sh = st.shallots >= TOTAL_SHALLOTS ? 6 : st.shallots + 1
      return { ...st, next: 0, shallots: sh, fresh: sh - 1, flash: st.flash + 1 }
    }
    return { ...st, next: n, fresh: -1, flash: st.flash + 1 }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setS((st) => (st.idle + 1 >= 3 ? { ...advance(st), idle: 0 } : { ...st, idle: st.idle + 1 }))
    }, 600)
    return () => clearInterval(id)
  }, [advance])

  const L = LINES[s.next]
  const doneN = s.next
  const stepPct = Math.round(((s.shallots - 1) + s.next / LINES.length) / TOTAL_SHALLOTS * 100)
  const nextD = `M0 ${L[1]}V${L[2]}`
  const progress = Array.from({ length: 8 }, (_, i) => i)

  return (
    <div className="b-frame">
      <BoardHeader>
        <div className="b-header__mid">
          <button type="button" className="b-icon-btn b-press" aria-label="Previous step"><BoardIcon name="left" /></button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 'min(420px, 100%)' }}>
            <p className="b-muted" style={{ margin: 0, fontSize: 11, lineHeight: '14px', fontWeight: 300 }}>Step 2 of 8, rendang padang</p>
            <p style={{ margin: 0, fontSize: 24, lineHeight: '28px', fontWeight: 300, letterSpacing: '-0.01em' }}>Slice the shallots thin</p>
            <div className="b-progress" role="img" aria-label="Progress: step 2 of 8">
              {progress.map((i) => (
                <span key={i} className={i === 0 ? 'is-done' : undefined}>
                  {i === 1 && <i style={{ width: `${stepPct}%` }} />}
                </span>
              ))}
            </div>
          </div>
          <button type="button" className="b-icon-btn b-press" aria-label="Next step"><BoardIcon name="right" /></button>
        </div>
        <HoldToAsk />
      </BoardHeader>

      <main className="b-main b-step-layout">
        <section aria-label="Cutting guide" style={{ position: 'relative', minWidth: 0 }}>
          <svg viewBox="0 0 880 700" fill="none" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" role="img"
            aria-label={`Cut ${s.next + 1} of ${LINES.length} on this shallot. The next line is lit.`} style={{ width: '100%', maxWidth: 880, height: 'auto', overflow: 'visible' }}>
            <path d="M260 120c120-40 260-40 380 0 70 30 110 120 110 210s-40 180-110 210c-120 40-260 40-380 0-70-30-110-120-110-210s40-180 110-210z" />
            <path d="M300 170c100-30 200-30 300 0 50 22 80 90 80 160s-30 138-80 160c-100 30-200 30-300 0-50-22-80-90-80-160s30-138 80-160z" strokeDasharray="2 6" />
            <path d="M360 230c60-16 120-16 180 0 30 14 46 54 46 100s-16 86-46 100c-60 16-120 16-180 0-30-14-46-54-46-100s16-86 46-100z" strokeDasharray="2 6" />
            {LINES.map((l, i) => {
              const done = i < s.next
              const isNext = i === s.next
              return (
                <path key={i} className="b-cutline" d={`M${l[0]} ${l[1]}V${l[2]}`}
                  stroke={done ? 'var(--basil)' : isNext ? 'transparent' : 'var(--line-strong)'} strokeWidth={done ? 1.6 : 1.3} strokeDasharray={done ? 'none' : '4 7'} />
              )
            })}
            <g style={{ transform: `translateX(${L[0]}px)`, transition: 'transform 520ms cubic-bezier(0.3, 1.4, 0.5, 1)' }}>
              <path className="b-beam" d={nextD} stroke="var(--thermal-ember)" strokeWidth="12" />
              {s.flash > 0 && s.idle <= 0 && <path key={s.flash} className="b-flash" d={nextD} stroke="var(--thermal-ember)" />}
              <path d={nextD} stroke="var(--ember-ink)" strokeWidth="2.4" />
              <path d="M0 72v30M-10 92l10 12 10-12" />
              <text x="0" y="62" textAnchor="middle" stroke="none" fill="var(--ink)" fontFamily="var(--font-sans)" fontSize="13" fontWeight="300">Cut here next</text>
            </g>
            <path d="M716 80v500" stroke="var(--chili)" strokeDasharray="10 8" />
            <path d="M716 80c40 10 60 40 60 70M716 580c40-10 60-40 60-70" stroke="var(--chili)" />
            <path d="M120 640h640" />
            <path d="M120 640v-16M148 640v-8M176 640v-8M204 640v-8M232 640v-8M260 640v-16M288 640v-8M316 640v-8M344 640v-8M372 640v-8M400 640v-16M428 640v-8M456 640v-8M484 640v-8M512 640v-8M540 640v-16M568 640v-8M596 640v-8M624 640v-8M652 640v-8M680 640v-16M708 640v-8M736 640v-8M760 640v-16" />
            <g stroke="none" fill="var(--ink)" fontFamily="var(--font-sans)" fontSize="13">
              <text x={doneN ? (FIRST + LINES[doneN - 1][0]) / 2 : FIRST} y="578" textAnchor="middle" fill="var(--basil)" style={{ transition: 'all 420ms ease' }}>{doneN ? `${doneN} done` : ''}</text>
              <text x="728" y="72" fill="var(--chili)">Keep fingers behind this line</text>
              <text x="120" y="664" textAnchor="middle">0</text><text x="260" y="664" textAnchor="middle">15</text><text x="400" y="664" textAnchor="middle">30</text><text x="540" y="664" textAnchor="middle">45</text><text x="680" y="664" textAnchor="middle">60 mm</text>
              <text x="440" y="690" textAnchor="middle" fill="var(--ink-muted)">Each line is 3 mm apart, drawn at real size on the board</text>
            </g>
          </svg>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div className="b-dashed" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="b-eyebrow" style={{ fontSize: 11, lineHeight: '14px' }}>Sliced shallots go here</p>
            <div className="b-dotgrid" role="img" aria-label={`${s.shallots} of ${TOTAL_SHALLOTS} shallots sliced`}>
              {Array.from({ length: TOTAL_SHALLOTS }, (_, i) => (
                <span key={i} className={i === s.fresh ? 'b-pop' : undefined}
                  style={i < s.shallots ? { background: 'var(--ink)' } : { border: '1.3px solid var(--ink)' }} />
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: '20px' }}>
              <b style={{ fontWeight: 300 }}>{s.shallots} of {TOTAL_SHALLOTS}</b> shallots, <span className="b-tabular">{Math.round(s.shallots * 15.3)}</span> g weighed
            </p>
          </div>
          <div className="b-well" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p className="b-muted" style={{ margin: 0, fontSize: 11, lineHeight: '14px', fontWeight: 300 }}>How you know it’s right</p>
            <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>About 3 mm. You should almost see through them.</p>
          </div>
          <blockquote style={{ margin: 0, padding: 18, borderRadius: 'var(--radius-md)', background: 'var(--magenta-soft)', color: 'var(--magenta-ink)' }}>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: 20, lineHeight: '28px' }}>“Tipis-tipis, biar garing.”</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: '16px' }}>Oma Lien, voice note from 2019. Thin, so they go crisp.</p>
          </blockquote>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
            <button type="button" className="b-btn b-btn--grow b-press" onClick={() => setS((st) => ({ ...st, flash: st.flash + 1, idle: -2 }))}>
              <BoardIcon name="eye" />Show the line
            </button>
            <button type="button" className="b-btn b-btn--primary b-press" style={{ flex: 1.4 }} onClick={() => setS((st) => ({ ...advance(st), idle: 0 }))}>
              <BoardIcon name="knife" />I made this cut
            </button>
          </div>
        </aside>
      </main>
    </div>
  )
}
