import './moldable-home.css'

export function MoldableHome() {
  return (
    <main className="moldable-environment" aria-label="Moldable HomeView">
      <section className="moldable-display" aria-label="Moldable screen">
        <div className="moldable-toolbar-slot" aria-hidden="true" />
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
