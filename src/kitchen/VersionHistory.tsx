'use client'

import './version-history.css'

export type VersionEntry = { id: string; version: number; time: string; who: string; what: string }

// How many changes the card shows; older ones are still kept, just not shown.
const SHOWN = 3

const stamp = (date: Date) => date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// What the recipe already went through before the grandkids opened it.
export function initialVersions(): VersionEntry[] {
  const base = new Date()
  const earlier = (minutes: number) => stamp(new Date(base.getTime() - minutes * 60_000))
  return [
    { id: 'tidy', version: 3, time: earlier(4), who: 'Popo', what: 'Tidied into clean steps' },
    { id: 'beef', version: 2, time: earlier(9), who: 'Popo', what: 'Pork changed to beef' },
    { id: 'coconut', version: 1, time: earlier(14), who: 'Popo', what: 'Added the toasted coconut' },
    { id: 'story', version: 1, time: earlier(21), who: 'Popo', what: 'Told the story by voice' },
  ]
}

/** A change made from the home view (Adjust or voice): one version up, on top of the list. */
export function newVersion(entries: VersionEntry[], what: string, who = 'Grandkid'): VersionEntry[] {
  const version = (entries[0]?.version ?? 0) + 1
  return [{ id: `v${version}-${what}`, version, time: stamp(new Date()), who, what }, ...entries]
}

/**
 * The latest few changes as a compact timeline: the newest with a teal dot, older ones ember and fading.
 * It always holds the same number of rows, so a new version never shifts anything around it.
 */
export function VersionHistory({ entries }: { entries: VersionEntry[] }) {
  const current = entries[0]?.version ?? 1
  const shown = entries.slice(0, SHOWN)

  return (
    <section className="vh" aria-label="Version history">
      <header className="vh__head">
        <span>Version history</span>
        <span className="vh__current" aria-label={`Current version ${current}`}>v{current}</span>
      </header>
      <ol className="vh__list">
        {shown.map((entry, i) => (
          <li key={entry.id} className={`vh__item${i === 0 ? ' is-newest' : ''}`} style={{ opacity: 1 - i * 0.22 }}>
            <span className="vh__dot" aria-hidden="true" />
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
