import Link from 'next/link'
import { AmbienceToggle } from '@/ambience/AmbienceToggle'

const SCREENS = [
  { href: '/boards/fridge', label: 'Fridge cookbooks' },
  { href: '/boards/home', label: '07 Home view' },
  { href: '/boards/cooking', label: '09 Cooking step' },
  { href: '/boards/story', label: '10 Oma’s story' },
  { href: '/boards/glow', label: 'Speaking glow' },
  { href: '/boards/clay', label: 'Clay' },
  { href: '/boards/goo', label: 'Goo tooltip' },
  { href: '/kitchen', label: 'Kitchen mockup' },
] as const

export function ScreenNav({ current }: { current: (typeof SCREENS)[number]['href'] }) {
  return (
    <nav className="boards-nav" aria-label="Screens">
      {SCREENS.map((s) => (
        <Link key={s.href} href={s.href} aria-current={s.href === current ? 'page' : undefined}>{s.label}</Link>
      ))}
      <AmbienceToggle className="boards-nav__sound" />
    </nav>
  )
}
