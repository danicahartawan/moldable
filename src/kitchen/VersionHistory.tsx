'use client'

import { useEffect, useRef } from 'react'
import './version-history.css'

const GLIDE_MS = 1800
const WHEEL_PACE = 0.3

export type VersionEntry = { id: string; version: number; time: string; who: string; what: string; tone: 'orange' | 'teal' }

const stamp = (date: Date) => date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// What the recipe already went through before the grandkids opened it.
export function initialVersions(): VersionEntry[] {
  const base = new Date()
  const earlier = (minutes: number) => stamp(new Date(base.getTime() - minutes * 60_000))
  return [
    { id: 'tidy', version: 1, time: earlier(4), who: 'Popo', what: 'Tidied into clean steps', tone: 'orange' },
    { id: 'beef', version: 1, time: earlier(9), who: 'Popo', what: 'Pork changed to beef', tone: 'orange' },
    { id: 'coconut', version: 1, time: earlier(14), who: 'Popo', what: 'Added the toasted coconut', tone: 'orange' },
    { id: 'story', version: 1, time: earlier(21), who: 'Popo', what: 'Told the story by voice', tone: 'orange' },
  ]
}

export function newVersion(version: number, what: string): VersionEntry {
  return { id: `v${version}-${what}`, version, time: stamp(new Date()), who: 'Grandkid', what, tone: 'teal' }
}

// A version history: a faded, scrollable timeline of what changed and who changed it.
export function VersionHistory({ entries }: { entries: VersionEntry[] }) {
  const list = useRef<HTMLOListElement>(null)
  const current = entries[0]?.version ?? 1

  // A new version arrives at the top, so glide back up to it, slowly.
  useEffect(() => {
    const box = list.current
    if (!box || box.scrollTop === 0) return
    const from = box.scrollTop
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GLIDE_MS)
      box.scrollTop = from * (1 - (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [entries.length])

  // The wheel moves the list at a gentle pace instead of jumping whole rows.
  useEffect(() => {
    const box = list.current
    if (!box) return
    const slow = (event: WheelEvent) => {
      event.preventDefault()
      box.scrollTop += event.deltaY * WHEEL_PACE
    }
    box.addEventListener('wheel', slow, { passive: false })
    return () => box.removeEventListener('wheel', slow)
  }, [])

  return (
    <section className="vh" aria-label="Version history">
      <header className="vh__head">
        <span>Version history</span>
        <span className={`vh__current${current > 1 ? ' vh__current--teal' : ''}`}>v{current}</span>
      </header>
      <ol ref={list} className="vh__list">
        {entries.map((entry) => (
          <li key={entry.id} className="vh__item">
            <span className={`vh__dot vh__dot--${entry.tone}`} aria-hidden="true" />
            <span className="vh__time">{entry.time}</span>
            <span className="vh__what">
              <strong>{entry.who}</strong> {entry.what}
            </span>
            <span className="vh__tag">v{entry.version}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
