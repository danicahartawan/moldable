import './moldable-home.css'
import { ToolRail } from './ToolRail'

export function MoldableHome() {
  return (
    <main className="moldable-environment" aria-label="Moldable HomeView">
      <section className="moldable-display" aria-label="Moldable screen">
        <ToolRail />
        <img
          className="moldable-mascot"
          src="/assets/grandma-character.png"
          alt="Moldable companion"
          draggable={false}
        />
      </section>
    </main>
  )
}
