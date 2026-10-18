import type { ReactNode } from 'react'
import './moldable-home.css'

type HomeViewFrameProps = {
  children: ReactNode
  label: string
  className?: string
}

export function HomeViewFrame({ children, label, className }: HomeViewFrameProps) {
  const displayClassName = ['moldable-display', className].filter(Boolean).join(' ')

  return (
    <main className="moldable-environment" aria-label={label}>
      <section className={displayClassName} aria-label={`${label} screen`}>
        {children}
      </section>
    </main>
  )
}
