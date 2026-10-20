import Link from 'next/link'

const SCREENS = [
  { href: '/boards/home', label: '07 Home view' },
  { href: '/boards/explore', label: '08 Explore recipes' },
  { href: '/boards/cooking', label: '09 Cooking step' },
  { href: '/boards/story', label: '10 Oma’s story' },
  { href: '/boards/glow', label: 'Speaking glow' },
  { href: '/boards/clay', label: 'Clay' },
  { href: '/kitchen', label: 'Kitchen mockup' },
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
