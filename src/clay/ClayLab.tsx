'use client'

import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { ClayBody, type ClayHandle } from './ClayBody'
import { DEFAULT_TUNING, type ClayTuning, type Vec } from './ClaySim'
import { HomeViewBoard, type HomeViewHandle } from '@/boards/HomeView'
import '@/kitchen/fridge.css'
import '@/kitchen/type-scale.css'
import './clay-lab.css'

// One scene, drawn twice: a listening island at the top and three ingredient rows below.
const W = 320
const H = 340
const R = 18
const ISLAND_HOME: Vec = { x: 50, y: 54 }
const OUTSIDE: Vec = { x: 268, y: 312 }
const ROWS = [
  { name: 'Pork', amount: '500 g', y: 168 },
  { name: 'Coconut', amount: '80 g', y: 226 },
  { name: 'Shallots', amount: '6', y: 284 },
]
// Sitting on a row: just above its rule, left of the amount.
const rowSpot = (i: number): Vec => ({ x: 216, y: ROWS[i].y + 14 - R })

function Scene({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="lab__scene">
      <figcaption>{title}</figcaption>
      <div className="lab__stage" style={{ width: W, height: H }}>
        <div className="lab__island"><span>Listening…</span><b>“Actually, two servings.”</b></div>
        {ROWS.map((r) => (
          <div key={r.name} className="lab__row" style={{ top: r.y }}><span>{r.name}</span><span>{r.amount}</span></div>
        ))}
        {children}
      </div>
    </figure>
  )
}

/** Today's lump: a CSS shape scaled from its centre, moved with an ease transition. */
function OldBlob({ at, stretched, level }: { at: Vec; stretched: boolean; level: number }) {
  const sx = stretched ? 1.6 : 1 + 0.32 * level
  const sy = stretched ? 1 : 1 - 0.18 * level
  const style: CSSProperties = { left: at.x - R, top: at.y - R, width: R * 2, height: R * 2 }
  return (
    <span className="lab-old" style={style}>
      <span className="lab-old__voice" style={{ transform: `scale(${sx}, ${sy})` }}>
        <span className="lab-old__lump" />
      </span>
    </span>
  )
}

const SLIDERS: { key: string; label: string; min: number; max: number; step: number; get: (t: ClayTuning) => number; set: (t: ClayTuning, v: number) => ClayTuning }[] = [
  { key: 'hk', label: 'Front stiffness', min: 80, max: 400, step: 5, get: (t) => t.head.k, set: (t, v) => ({ ...t, head: { ...t.head, k: v } }) },
  { key: 'hc', label: 'Front damping', min: 4, max: 40, step: 0.5, get: (t) => t.head.c, set: (t, v) => ({ ...t, head: { ...t.head, c: v } }) },
  { key: 'tk', label: 'Back stiffness', min: 60, max: 400, step: 5, get: (t) => t.tail.k, set: (t, v) => ({ ...t, tail: { ...t.tail, k: v } }) },
  { key: 'tc', label: 'Back damping', min: 4, max: 40, step: 0.5, get: (t) => t.tail.c, set: (t, v) => ({ ...t, tail: { ...t.tail, c: v } }) },
  { key: 'sk', label: 'Snap-back stiffness', min: 80, max: 500, step: 5, get: (t) => t.snap.k, set: (t, v) => ({ ...t, snap: { ...t.snap, k: v } }) },
  { key: 'sc', label: 'Snap-back damping', min: 4, max: 40, step: 0.5, get: (t) => t.snap.c, set: (t, v) => ({ ...t, snap: { ...t.snap, c: v } }) },
  { key: 'qk', label: 'Squash stiffness', min: 80, max: 500, step: 5, get: (t) => t.squash.k, set: (t, v) => ({ ...t, squash: { ...t.squash, k: v } }) },
  { key: 'qc', label: 'Squash damping', min: 4, max: 40, step: 0.5, get: (t) => t.squash.c, set: (t, v) => ({ ...t, squash: { ...t.squash, c: v } }) },
  { key: 'vol', label: 'Volume kept', min: 0.5, max: 1, step: 0.01, get: (t) => t.volume, set: (t, v) => ({ ...t, volume: v }) },
  { key: 'neck', label: 'Neck', min: 0, max: 0.4, step: 0.01, get: (t) => t.neck, set: (t, v) => ({ ...t, neck: v }) },
  { key: 'lead', label: 'Front heavier', min: 0, max: 0.4, step: 0.01, get: (t) => t.lead, set: (t, v) => ({ ...t, lead: v }) },
  { key: 'max', label: 'Max stretch (radii)', min: 0.6, max: 3, step: 0.1, get: (t) => t.maxStretch, set: (t, v) => ({ ...t, maxStretch: v }) },
  { key: 'wob', label: 'Surface ripple (px)', min: 0, max: 3, step: 0.1, get: (t) => t.wobble, set: (t, v) => ({ ...t, wobble: v }) },
]

/** Debug page: today's blob and the new clay side by side, with a voice slider, actions and spring tuning. */
export function ClayLab() {
  const clay = useRef<ClayHandle>(null)
  const [level, setLevel] = useState(0)
  const levelRef = useRef(0)
  levelRef.current = level
  const [tuning, setTuning] = useState<ClayTuning>(DEFAULT_TUNING)
  const [stretched, setStretched] = useState(false)
  const [oldAt, setOldAt] = useState<Vec>(ISLAND_HOME)
  const row = useRef(-1)
  const readLevel = useMemo(() => () => levelRef.current, [])
  const home = useRef<HomeViewHandle>(null)
  const [noSpeech, setNoSpeech] = useState(false)

  const jumpIn = () => {
    setStretched(false)
    setOldAt(OUTSIDE)
    clay.current?.place(OUTSIDE)
    window.setTimeout(() => { setOldAt(ISLAND_HOME); clay.current?.jump(ISLAND_HOME) }, 250)
    row.current = -1
  }
  const crawl = () => {
    setStretched(false)
    row.current = (row.current + 1) % ROWS.length
    const to = rowSpot(row.current)
    setOldAt(to)
    clay.current?.crawl(to, { x: 0, y: 1 })
  }
  const stretch = () => { setStretched(true); clay.current?.stretch({ x: 1, y: 0 }, 1.2) }
  const release = () => { setStretched(false); clay.current?.release() }
  const touch = () => clay.current?.touch({ x: 0, y: 1 }, 1)

  return (
    <div className="lab">
      <header className="lab__head">
        <h1>Clay</h1>
        <p>Same scene, same buttons. Left is today’s blob, right is the new spring clay.</p>
      </header>

      <div className="lab__scenes">
        <Scene title="Current: CSS shape scaled from the centre">
          <OldBlob at={oldAt} stretched={stretched} level={level} />
        </Scene>
        <Scene title="New: spring outline, volume kept">
          <ClayBody ref={clay} className="lab__clay" width={W} height={H} home={ISLAND_HOME} radius={R} level={readLevel} tuning={tuning} />
        </Scene>
      </div>

      <div className="lab__controls">
        <div className="lab__row-buttons">
          <button type="button" onClick={jumpIn}>Jump into the island</button>
          <button type="button" onClick={stretch} aria-pressed={stretched}>Stretch</button>
          <button type="button" onClick={release}>Release</button>
          <button type="button" onClick={crawl}>Crawl onto a row</button>
          <button type="button" onClick={touch}>Touch</button>
        </div>
        <label className="lab__voice">
          Voice level
          <input type="range" min={0} max={1} step={0.01} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <output>{level.toFixed(2)}</output>
        </label>

        <details className="lab__tuning">
          <summary>Spring tuning</summary>
          <div className="lab__grid">
            {SLIDERS.map((s) => (
              <label key={s.key}>
                <span>{s.label}</span>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.get(tuning)} onChange={(e) => setTuning((t) => s.set(t, Number(e.target.value)))} />
                <output>{s.get(tuning)}</output>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setTuning(DEFAULT_TUNING)}>Reset</button>
          <pre>{JSON.stringify(tuning)}</pre>
        </details>
      </div>

      <section className="lab__inplace">
        <h2>In place: the recipe screen</h2>
        <p>No clay until voice starts. Start it (or tap the screen’s top-left corner): the clay pops into the island, is pulled by the voice, kneaded while thinking, shows “Done”, then hops onto the ingredient rows and fades where it ends. Tap the screen outside the island to cancel.</p>
        <div className="lab__row-buttons">
          <button type="button" onClick={() => home.current?.startVoice()}>Talk to Moldable</button>
          <button type="button" onClick={() => home.current?.cancelVoice()}>Cancel</button>
          <label className="lab__check"><input type="checkbox" checked={noSpeech} onChange={(e) => setNoSpeech(e.target.checked)} /> No speech (gives up after 6 s)</label>
        </div>
        <div className="gm-kitchen"><HomeViewBoard ref={home} clay noSpeech={noSpeech} /></div>
      </section>
    </div>
  )
}
