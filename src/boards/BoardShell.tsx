import Link from 'next/link'
import type { ReactNode } from 'react'
import { BOARDS, type BoardSlug } from './boards'

type Props = {
  current: BoardSlug
  children: ReactNode
}

export function BoardShell({ current, children }: Props) {
  return (
    <div className="boards">
      <nav className="b-nav" aria-label="Boards">
        {BOARDS.map((b) => (
          <Link key={b.slug} href={`/boards/${b.slug}`} aria-current={b.slug === current ? 'page' : undefined}>
            {b.number} {b.title}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}

export function BoardHeader({ children }: { children: ReactNode }) {
  return (
    <header className="b-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="b-header__logo" src="/assets/moldable-logo.png" alt="Moldable" />
      {children}
    </header>
  )
}
