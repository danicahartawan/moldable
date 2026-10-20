'use client'

import { ClayBlob, ClayMix } from '@/kitchen/ClayMix'
import { VersionHistory, initialVersions, newVersion, type VersionEntry } from '@/kitchen/VersionHistory'
import { Eye } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'

type AdjustPhase = 'idle' | 'listening' | 'thinking' | 'writing'

const KENCUR_ROW = GRANDKIDS_RECIPE_CONTEXT.ingredients.findIndex((ingredient) => ingredient.key === 'kencur')

// Scripted two-stage Adjust demo: what the grandkid says, then the pencil pass that follows.
const ADJUST_SCRIPT = [
  'Actually, I just want two servings.',
  'What can I use instead of kencur?',
] as const

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

// `clay` swaps the mascot for orange clay: a blob inside the Adjust chip, and teal mixed into the clay while the screen is fogged.
// How long the clay takes to turn fully teal, after the drop falls and is smeared through.
const CLAY_MIX_MS = 5300

export function HomeViewBoard({ embedded = false, overlay = null, clay = false }: { embedded?: boolean; overlay?: ReactNode; clay?: boolean } = {}) {
  const embedRef = useRef<HTMLDivElement>(null)
  const [embedScale, setEmbedScale] = useState(1)

  // Embedded, the 640px board scales to whatever square its host gives it.
  useLayoutEffect(() => {
    const host = embedRef.current
    if (!embedded || !host) return
    const fit = () => setEmbedScale(host.clientWidth / 640 || 1)
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(host)
    return () => observer?.disconnect()
  }, [embedded])

  const [swap, setSwap] = useState(false)
  const [serves2, setServes2] = useState(false)
  const [rowsDone, setRowsDone] = useState(0)
  const [kencurSwap, setKencurSwap] = useState(false)
  const [phase, setPhase] = useState<AdjustPhase>('idle')
  const [heard, setHeard] = useState('')
  // With the clay look, the Adjust chip's blob turns teal once the teal has been mixed all the way through.
  const [blobTeal, setBlobTeal] = useState(false)
  // With the clay look, ingredients can be checked off.
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set())
  const toggleChecked = (row: number) => setChecked((current) => {
    const next = new Set(current)
    if (!next.delete(row)) next.add(row)
    return next
  })
  // With the clay look, there's a version history under the recipe; each adjustment adds a version to it.
  const [versions, setVersions] = useState<VersionEntry[]>(initialVersions)
  const [penRow, setPenRow] = useState<number | null>(null)
  const [penPos, setPenPos] = useState<{ left: number; top: number } | null>(null)
  const stage = useRef(0)
  const timers = useRef<number[]>([])
  const listRef = useRef<HTMLUListElement>(null)
  const m = { serves2, mild: false, chicken: false }

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = [] }
  useEffect(() => clearTimers, [])

  useLayoutEffect(() => {
    if (penRow === null) return
    const row = listRef.current?.children[penRow] as HTMLElement | undefined
    const amount = row?.querySelector<HTMLElement>('.hv-amt')
    if (!row || !amount) return
    // The pencil tip sits at ~92% across and ~81% down the 96 x 82 mascot image.
    setPenPos({ left: amount.offsetLeft - 88, top: row.offsetTop + row.offsetHeight / 2 - 60 })
  }, [penRow])

  const runPencilPass = (onRow: (row: number) => void, rowMs: number) => {
    let at = 0
    ING.forEach((_, row) => {
      later(at, () => { setPenRow(row); onRow(row) })
      at += row === KENCUR_ROW && stage.current === 2 ? 900 : rowMs
    })
    later(at + 250, () => { setPenRow(null); setHeard(''); setPhase('idle') })
  }

  const beginAdjust = () => {
    if (phase !== 'idle') return
    clearTimers()
    if (stage.current >= ADJUST_SCRIPT.length) {
      setServes2(false)
      setRowsDone(0)
      setKencurSwap(false)
      setVersions(initialVersions())
      stage.current = 0
    }
    const next = stage.current + 1
    setPhase('listening')
    setHeard('')
    setBlobTeal(false)
    later(CLAY_MIX_MS, () => setBlobTeal(true))
    later(1400, () => setHeard(ADJUST_SCRIPT[next - 1]))
    later(5000, () => setPhase('thinking'))
    later(5800, () => {
      stage.current = next
      setPhase('writing')
      if (clay) setVersions((current) => [newVersion((current[0]?.version ?? 1) + 1, next === 1 ? 'Servings 4 → 2' : 'Kencur swapped out'), ...current])
      if (next === 1) {
        setServes2(true)
        runPencilPass((row) => setRowsDone(row + 1), 450)
      } else {
        runPencilPass((row) => { if (row === KENCUR_ROW) setKencurSwap(true) }, 300)
      }
    })
  }

  const adjustLabel = phase === 'listening'
    ? 'Listening…'
    : phase === 'thinking'
      ? 'Thinking…'
      : phase === 'writing'
        ? 'Writing…'
        : 'Adjust'

  const mins = 40 - (m.serves2 ? 10 : 0) - (m.chicken ? 5 : 0)
  const roll = (shown: boolean, from: number): CSSProperties => ({
    transform: `translateY(${shown ? 0 : from}px)`, filter: `blur(${shown ? 0 : 8}px)`, opacity: shown ? 1 : 0,
  })

  return (
    <div className={embedded ? 'hv-embed' : 'hv-stage'} ref={embedRef}>
      <div className={`hv-screen${embedded ? ' hv-screen--embedded' : ''}`} data-testid="grandkids-square" style={embedded ? { transform: `scale(${embedScale})` } : undefined}>

        <section className="hv-card hv-recipe" aria-label="Recipe overview">
          <div className="hv-recipe__inner">
            <div className="hv-recipe__head">
              <div style={{ minWidth: 0 }}>
                <h1 className="hv-title">Lelawar Bali</h1>
              </div>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hv-photo hv-blurin" src="/assets/lelawar-oma.png" alt="Oma Lien holding a plate of lelawar" />
            <p className="hv-overview hv-blurin">
              Balinese minced <Mark on={m.chicken}>{m.chicken ? 'chicken' : 'pork'}</Mark> with toasted coconut, fried in a{' '}
              <Mark on={m.mild}>{m.mild ? 'gentle spice paste' : 'fresh spice paste'}</Mark> and served on pandan rice.
            </p>
            {clay && <VersionHistory entries={versions} />}
          </div>
            {clay ? (
              <span className="hv-actions">
                <button type="button" className="hv-tap hv-glance" aria-label="Glance at the recipe">
                  <Eye size={22} aria-hidden="true" />
                  Glance
                </button>
              </span>
            ) : (
              <button type="button" className={`hv-tap hv-adjust is-${phase}`} aria-label="Adjust recipe by voice" aria-busy={phase !== 'idle'} onClick={beginAdjust}>
                {adjustLabel}
              </button>
            )}
        </section>

        <section className="hv-card hv-swap" aria-label={swap ? 'Tools: bowl, dry pan, blender, spatula and rice pot. Tap for cooking time' : `Cooking time ${mins} minutes. Tap for tools`}>
          <button type="button" className="hv-tap hv-swap__btn" onClick={() => setSwap((s) => !s)}>
            <span className="hv-roll" style={roll(!swap, -50)}>
              <span className="hv-h">Cooking time</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="hv-mins"><Mark on={mins !== 40}>{mins}</Mark></span>
                <span style={{ fontSize: 22 }}>mins</span>
              </span>
              <span className="hv-wave">Wave to start</span>
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
            <p className="hv-count" style={{ margin: 0 }}>Serves <Mark on={serves2}>{serves2 ? 2 : 4}</Mark></p>
          </div>
          <ul ref={listRef}>
            {ING.map((r, i) => {
              const halved = serves2 && i < rowsDone
              const swapped = i === KENCUR_ROW && kencurSwap
              let amt: string = halved ? r[3] : r[2]
              if (swapped) amt = halved ? '1 cm + zest' : '2 cm + zest'
              const changed = (halved && r[2] !== r[3]) || swapped
              return (
                <li
                  key={r[0]}
                  data-family-amount={r[1]}
                  data-changed={changed || undefined}
                  style={{ '--i': i } as CSSProperties}
                  className={penRow === i ? 'is-voice-target' : undefined}
                  {...(clay ? {
                    role: 'checkbox',
                    tabIndex: 0,
                    'aria-checked': checked.has(i),
                    onClick: () => toggleChecked(i),
                    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggleChecked(i) } },
                  } : {})}
                >
                  <Mark on={swapped}>{swapped ? 'Ginger + lime zest' : r[0]}</Mark>
                  <span className="hv-amt">
                    <span key={`${amt}-${changed}`} className={`hv-blurin${changed ? ' hv-mark' : ''}`}>{amt}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {penRow !== null && penPos && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hv-pen" src="/assets/mascot-writer-gradient.png" alt="Moldable mascot writing in the ingredient list"
              style={{ left: penPos.left, top: penPos.top }} />
          )}
        </section>

        {clay && (
          <button type="button" className={`hv-tap hv-clay-orb is-${phase}`} aria-label="Adjust recipe by voice" aria-busy={phase !== 'idle'} onClick={beginAdjust}>
            <ClayBlob teal={blobTeal} />
          </button>
        )}

        <div className={`hv-fog${phase === 'listening' || phase === 'thinking' ? ' is-on' : ''}`} aria-hidden="true">
          {clay ? (
            phase !== 'idle' && <ClayMix />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hv-fog__mascot" src="/assets/mascot-gradient.png" alt="" draggable={false} />
          )}
          <p className="hv-fog__heard" key={heard}>{heard ? `“${heard}”` : ''}</p>
        </div>

        <p className="hv-sr-only" role="status" aria-live="polite">{phase === 'idle' ? '' : adjustLabel}</p>

      </div>
      {embedded ? overlay : <p className="hv-caption">Grandkid home view, 640 × 640 for the 5.73 in display.</p>}
    </div>
  )
}
