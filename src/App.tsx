'use client'

import { ProjectPill } from './ProjectPill'
import { RecipeBook } from './RecipeBook'
import { useEffect, useState } from 'react'

export function App() {
  const [pathname, setPathname] = useState<string | null>(null)

  useEffect(() => setPathname(window.location.pathname), [])

  if (pathname === '/grandma/story') return <RecipeBook />

  return (
    <main className="page-shell">
      <ProjectPill />
      <section className="ginger-stage" aria-label="Ginger artwork">
        <img
          className="ginger-stage__image"
          src="/assets/ginger-root.png"
          alt="Ginger root"
          width="1024"
          height="1024"
        />
      </section>
    </main>
  )
}
