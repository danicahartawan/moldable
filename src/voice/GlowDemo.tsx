'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SpeakingGlow, createSimulatedLevel, type GlowState } from './SpeakingGlow'
import { VoiceNotification } from './VoiceNotification'
import './glow-demo.css'

const STATES: GlowState[] = ['idle', 'listening', 'hearing', 'thinking', 'done']
// The same timing as the home view's Adjust flow.
const FLOW: [GlowState, number][] = [['listening', 0], ['hearing', 1400], ['thinking', 5000], ['done', 5800]]
const HEARD = 'Actually, I just want two servings.'
const RESULT = 'Halved everything for 2 servings.'

/** A 640 × 640 screen with the speaking glow and notification, and controls to step through every state. */
export function GlowDemo() {
  const [state, setState] = useState<GlowState>('idle')
  const [simulate, setSimulate] = useState(true)
  const [manual, setManual] = useState(0.5)
  const manualRef = useRef(manual)
  manualRef.current = manual
  const simulated = useMemo(() => (typeof window === 'undefined' ? () => 0 : createSimulatedLevel()), [])
  const timers = useRef<number[]>([])
  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = [] }
  useEffect(() => clear, [])

  const pick = (next: GlowState) => { clear(); setState(next) }
  const play = () => {
    clear()
    FLOW.forEach(([s, at]) => timers.current.push(window.setTimeout(() => setState(s), at)))
  }

  const heard = state === 'hearing' || state === 'thinking' || state === 'done' ? HEARD : ''

  return (
    <div className="gd">
      <div className="gd__screen" data-voice={state === 'idle' || state === 'done' ? undefined : 'on'}>
        <div className="gd__content">
          <section className="gd__card gd__recipe">
            <h1>Lawar Bali</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/lelawar-oma.png" alt="Oma Lien holding a plate of lawar" />
            <p>Balinese minced pork with toasted coconut, fried in a fresh spice paste and served on pandan rice.</p>
          </section>
          <section className="gd__card gd__time">
            <p className="gd__h">Cooking time</p>
            <p className="gd__mins"><span>40</span> mins</p>
          </section>
          <section className="gd__card gd__ingr">
            <p className="gd__h">Ingredients</p>
            <ul>
              {[['Pork', '500 g'], ['Coconut', '80 g'], ['Shallots', '6'], ['Garlic', '4'], ['Sambal', '1 tbsp'], ['Kencur', '2 cm'], ['Pepper', '½ tsp'], ['Lime', '1']].map(([n, a]) => (
                <li key={n}><span>{n}</span><span>{a}</span></li>
              ))}
            </ul>
          </section>
        </div>
        <SpeakingGlow
          state={state}
          level={() => (simulate ? simulated() : manualRef.current)}
          onDone={() => setState('idle')}
        />
        <VoiceNotification state={state} heard={heard} result={RESULT} teal={state === 'done'} level={() => (simulate ? simulated() : manualRef.current)} />
      </div>

      <div className="gd__controls">
        <div className="gd__row" role="group" aria-label="Glow state">
          {STATES.map((s) => (
            <button key={s} type="button" aria-pressed={state === s} onClick={() => pick(s)}>{s}</button>
          ))}
          <button type="button" className="gd__play" onClick={play}>Play flow</button>
        </div>
        <div className="gd__row">
          <label><input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} /> Simulated voice</label>
          <label className={simulate ? 'is-off' : undefined}>
            Level
            <input type="range" min={0} max={1} step={0.01} value={manual} disabled={simulate} onChange={(e) => setManual(Number(e.target.value))} />
            <output>{manual.toFixed(2)}</output>
          </label>
        </div>
        <p className="gd__note">The level only drives the glow in <b>hearing</b>. Play flow uses the home view’s timing: listening 1.4 s, hearing 3.6 s, thinking 0.8 s, then done.</p>
      </div>
    </div>
  )
}
