import Link from 'next/link'

const SCREENS = [
  { href: '/boards/home', label: '07 Home view' },
  { href: '/boards/explore', label: '08 Explore recipes' },
] as const

export function ScreenNav({ current }: { current: (typeof SCREENS)[number]['href'] }) {
  return (
    <nav className="boards-nav" aria-label="Screens">
      {SCREENS.map((s) => (
        <Link key={s.href} href={s.href} aria-current={s.href === current ? 'page' : undefined}>{s.label}</Link>
      ))}
    </nav>
  )
}
