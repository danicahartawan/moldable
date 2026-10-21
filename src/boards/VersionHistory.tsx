'use client'

export type VersionEntry = { id: string; version: number; time: string; who: string; what: string }

const stamp = (date: Date) => date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// What the recipe already went through before the grandkids opened it.
export function initialVersions(): VersionEntry[] {
  const base = new Date()
  const earlier = (minutes: number) => stamp(new Date(base.getTime() - minutes * 60_000))
  return [
    { id: 'v3', version: 3, time: earlier(4), who: 'Oma Lien', what: 'Tidied into clean steps' },
    { id: 'v2', version: 2, time: earlier(14), who: 'Oma Lien', what: 'Added the toasted coconut' },
    { id: 'v1', version: 1, time: earlier(21), who: 'Oma Lien', what: 'Told the recipe by voice' },
  ]
}

/** A change made from the home view (Adjust or voice): one version up, on top of the list. */
export function newVersion(entries: VersionEntry[], what: string, who = 'Grandkid'): VersionEntry[] {
  const version = (entries[0]?.version ?? 0) + 1
  return [{ id: `v${version}`, version, time: stamp(new Date()), who, what }, ...entries]
}

/** Every version of the recipe, newest on top: a teal dot for the current one, ember for the ones before. */
export function VersionList({ entries }: { entries: VersionEntry[] }) {
  return (
    <ol className="hm-versions">
      {entries.map((entry, i) => (
        <li key={entry.id} className={`hm-blurin${i === 0 ? ' is-current' : ''}`} style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}>
          <span className="hm-versions__dot" aria-hidden="true" />
          <span className="hm-versions__what"><strong>{entry.who}</strong> {entry.what}</span>
          <span className="hm-versions__time">{entry.time}</span>
          <span className="hm-versions__tag">v{entry.version}</span>
        </li>
      ))}
    </ol>
  )
}
