'use client'

import { useEffect, useRef, useState } from 'react'

type Tab = 'transcript' | 'tidy' | 'changes'
type Mark = 'ing' | 'qty'
type Part = [string, Mark?]

type Chunk =
  | { id: string; time: string; parts: Part[] }
  | { id: string; time: string; memory: { label: string; text: string } }

const CHUNKS: Chunk[] = [
  { id: 'c0', time: '0:00', parts: [['Take half an '], ['onion', 'ing'], [', '], ['garlic', 'ing'], [', '], ['chili', 'ing'], [', '], ['kencur', 'ing'], [', '], ['pepper', 'ing'], [', and '], ['lime leaves', 'ing'], ['. Blend until it becomes a fine paste. Don’t make it completely watery. You should still see a little texture. That is what gives the lawar its character.']] },
  { id: 'c1', time: '0:31', parts: [['Now take '], ['one good handful', 'qty'], [' of '], ['ground beef', 'ing'], ['. Weigh this for me, because my handful might be different from yours. Traditionally, some families use pork, but this is how I make it for you.']] },
  { id: 'c2', time: '0:52', memory: { label: 'A memory: Nev, about seven', text: 'I remember making this when Nev was small. He wanted to help cut the onion and nearly shaved the tip of his finger off. I shouted so loudly that everyone came running into the kitchen. He was old enough to argue with me, but not old enough for that knife.' } },
  { id: 'c3', time: '1:24', parts: [['Next, toast the '], ['grated coconut', 'ing'], [' in a dry pan. Keep moving it because coconut burns very quickly. Check it after '], ['two minutes', 'qty'], [', but trust the color more than the clock. At first it smells sweet and soft. Then it becomes nutty, and the color turns golden brown. If it becomes dark brown, you have gone too far.']] },
]

const LIVE = 'Put a little oil into the pan and sauté the remaining onion. Add the garlic and the spice paste. Listen to it. At first, it sounds wet. When the sound becomes sharper and the oil begins to separate, the spices are ready.'.split(' ')
const LIVE_TIME = '2:02'

const TIDY = [
  { title: 'Spice paste', text: 'Blend ½ onion, garlic, chili, kencur, pepper and lime leaves into a fine paste. Keep a little texture; don’t let it go watery.', time: '0:00', at: 'c0' },
  { title: 'Meat', text: 'One good handful of ground beef.', time: '0:31', at: 'c1', note: 'Oma’s handful: weigh it next time' },
  { title: 'Coconut', text: 'Toast grated coconut in a dry pan, stirring the whole time, until nutty and golden brown. Check at 2 minutes; go by colour, not the clock.', time: '1:24', at: 'c3' },
  { title: 'Sauté', text: 'Fry the rest of the onion in a little oil, then the garlic and the paste, until it sounds sharp and the oil separates.', time: LIVE_TIME, at: 'live', note: 'Still listening' },
]

const CHANGES = [
  { k: 'beef', title: 'Beef instead of pork', text: 'She uses ground beef. The saved recipe says pork.', yes: 'Use beef', no: 'Keep pork', done: 'Recipe now uses beef', doneNo: 'Kept pork' },
  { k: 'weigh', title: 'Weigh Oma’s handful', text: 'Her “good handful” has no weight yet. Weigh it next time you cook and we’ll save the grams.', yes: 'Remind me', no: 'Skip', done: 'We’ll ask while you cook', doneNo: 'Skipped' },
]

const TABS: [Tab, string][] = [['transcript', 'Transcript'], ['tidy', 'Tidy'], ['changes', 'Changes']]

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`

export function StoryBoard() {
  const [tab, setTab] = useState<Tab>('transcript')
  const [words, setWords] = useState(0)
  const [clock, setClock] = useState(122)
  const [paused, setPaused] = useState(false)
  const [flash, setFlash] = useState('')
  const [picks, setPicks] = useState<Record<string, 'yes' | 'no'>>({})
  const flashTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (paused) return
    const word = window.setInterval(() => setWords((n) => Math.min(LIVE.length, n + 1)), 260)
    const tick = window.setInterval(() => setClock((t) => t + 1), 1000)
    return () => { clearInterval(word); clearInterval(tick) }
  }, [paused])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const cite = (id: string) => {
    setTab('transcript')
    setFlash(id)
    clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(''), 1700)
  }

  const pending = CHANGES.length - Object.keys(picks).length
  const pick = (k: string, v: 'yes' | 'no' | null) =>
    setPicks((p) => {
      const next = { ...p }
      if (v == null) delete next[k]
      else next[k] = v
      return next
    })

  return (
    <div className="hv-stage">
      <div className="st-screen">
        <header className="st-header">
          <div style={{ minWidth: 0 }}>
            <h1 className="st-title">Oma’s story</h1>
            <p className="st-sub">Lawar Bali, told by Oma Lien</p>
          </div>
          <div className="st-tabs" role="tablist" aria-label="Story views">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" className="st-tap st-tab" aria-selected={tab === key} onClick={() => setTab(key)}>
                {label}
                {key === 'changes' && pending > 0 && <span className="st-count">{pending}</span>}
              </button>
            ))}
          </div>
        </header>

        {tab === 'transcript' && (
          <div className="st-scroll st-scroll--transcript st-rise">
            <ol className="st-transcript">
              {CHUNKS.map((c) => (
                <li key={c.id} className={`st-chunk${flash === c.id ? ' st-flash' : ''}`}>
                  <span className="st-time">{c.time}</span>
                  {'memory' in c ? (
                    <figure className="st-memory">
                      <figcaption>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
                        {c.memory.label}
                      </figcaption>
                      <blockquote>{c.memory.text}</blockquote>
                    </figure>
                  ) : (
                    <p className="st-text">
                      {c.parts.map(([t, mark], i) => <span key={i} className={mark ? `st-${mark}` : undefined}>{t}</span>)}
                    </p>
                  )}
                </li>
              ))}
              <li className="st-chunk">
                <span className="st-time st-time--live">{LIVE_TIME}</span>
                <p className="st-text" aria-live="polite">
                  {LIVE.slice(0, words).map((w, j) => <span key={j} className="st-word">{j < words - 1 ? `${w} ` : w}</span>)}
                  <span className="st-caret" aria-hidden="true" />
                </p>
              </li>
            </ol>
          </div>
        )}

        {tab === 'tidy' && (
          <div className="st-scroll st-rise">
            <div className="st-tidy">
              {TIDY.map((d) => (
                <section key={d.title}>
                  <h2 className="st-h2">{d.title}</h2>
                  <p className="st-text">
                    {d.text}{' '}
                    <button type="button" className="st-tap st-cite" aria-label={`Hear it at ${d.time} in the transcript`} onClick={() => cite(d.at)}>{d.time}</button>
                  </p>
                  {d.note && (
                    <p className="st-note">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.01M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                      {d.note}
                    </p>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}

        {tab === 'changes' && (
          <div className="st-changes st-rise">
            <p className="st-sub">Oma told it differently from the saved recipe. Choose what to keep.</p>
            {CHANGES.map((c) => {
              const chosen = picks[c.k]
              return (
                <article key={c.k} className="st-change">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <h2 className="st-h2">{c.title}</h2>
                    <p className="st-text" style={{ color: 'var(--ink)' }}>{c.text}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {chosen ? (
                      <>
                        <span className="st-done st-rise">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                          {chosen === 'yes' ? c.done : c.doneNo}
                        </span>
                        <button type="button" className="st-tap st-undo" onClick={() => pick(c.k, null)}>Undo</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="st-tap st-btn st-btn--primary" onClick={() => pick(c.k, 'yes')}>{c.yes}</button>
                        <button type="button" className="st-tap st-btn" onClick={() => pick(c.k, 'no')}>{c.no}</button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <footer className="st-footer">
          <div role="status" className={`st-rec${paused ? ' is-paused' : ''}`}>
            <span aria-hidden="true" className="st-bars">
              {[0, 1, 2, 3].map((k) => <span key={k} className="st-bar" style={{ animationDelay: `${k * 0.15}s` }} />)}
            </span>
            <span className="st-rec__label">{paused ? 'Paused' : 'Listening'}</span>
            <span className="st-rec__clock">{mmss(clock)}</span>
          </div>
          <button type="button" className="st-tap st-pause" aria-label={paused ? 'Keep listening' : 'Pause listening'} onClick={() => setPaused((p) => !p)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={paused ? 'M8 5.5v13l11-6.5z' : 'M7 5h3.5v14H7z M13.5 5H17v14h-3.5z'} />
            </svg>
          </button>
        </footer>
      </div>
      <p className="hv-caption">Oma’s story, live transcript. Tap a time in Tidy to jump back to where she said it.</p>
    </div>
  )
}
