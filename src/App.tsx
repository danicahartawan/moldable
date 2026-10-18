import { ProjectPill } from './ProjectPill'

export function App() {
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
