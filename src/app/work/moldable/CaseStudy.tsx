'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { FeatureTour } from './FeatureTour'
import { MoldableBlobHero } from './MoldableBlobHero'

const sections = [
  ['cookbook', 'What is Moldable?'],
  ['writing', 'Writing experience'],
  ['cooking', 'Cooking experience'],
  ['whisper', "Grandma's whisper"],
  ['reflection', 'Reflection'],
] as const

function Section({ id, children }: { id: string; children: ReactNode }) {
  return <section id={id} className="cs-section">{children}</section>
}

function Figure({ src, alt, caption, className = '' }: { src: string; alt: string; caption?: string; className?: string }) {
  return (
    <figure className={`cs-figure ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

export function CaseStudy() {
  const [active, setActive] = useState<string>('cookbook')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: '-20% 0px -70% 0px' },
    )
    sections.forEach(([id]) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="cs">
      <aside className="cs-side">
        <div className="cs-crumb"><a href="/">← Work</a><span>/</span><b>Moldable</b></div>
        <nav aria-label="Case study chapters">
          {sections.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? 'on' : ''}>{label}</a>)}
        </nav>
      </aside>

      <main className="cs-main">
        <div className="ft-top">
          <FeatureTour />
        </div>
        <MoldableBlobHero />
        <p className="cs-eyebrow">Moldable · Family cookbook · 2026</p>
        <h1>Recipes that carry the people who made them</h1>
        <p className="cs-deck">A cookbook that remembers how Grandma explained it—and keeps growing when the next generation cooks.</p>

        <div className="cs-meta">
          <div><p className="cs-label">Team</p><p>Danica · Engineering</p><p>Fred · Design</p><p>Nevan · Business</p></div>
          <div><p className="cs-label">Context</p><p>Family recipes</p><p>Indonesia ↔ abroad</p><p>Voice-first kitchen display</p></div>
        </div>

        <Section id="cookbook">
          <p className="cs-label">01 · Reframing the object</p>
          <h2>What is a Moldable cookbook?</h2>
          <p className="cs-lead">A family cookbook that changes without erasing where it came from.</p>
          <p>Our grandmas cook from experience. “One handful” and “until it smells ready” contain knowledge that disappears in a written recipe. Moldable captures the explanation, the reasoning, and the story—then lets every generation make a version for their own kitchen.</p>
          <div className="cs-principles" aria-label="Moldable cookbook principles">
            <article><span>Preserve</span><p>Keep the original voice, sensory cues, and family stories.</p></article>
            <article><span>Adapt</span><p>Change servings, ingredients, and techniques without overwriting the original.</p></article>
            <article><span>Return</span><p>Bring a family member’s advice back at the moment it helps.</p></article>
          </div>
          <Figure src="/assets/app/app-1-cook-board.jpg" alt="Early Moldable cookbook interface from the design process" caption="Early exploration: turning the recipe into a spatial cooking board." className="cs-figure--process" />
        </Section>

        <Section id="writing">
          <p className="cs-label">02 · Preserve context, then organize</p>
          <h2>A moldable writing experience</h2>
          <p className="cs-lead">Grandma should explain a recipe—not operate recipe software.</p>
          <p>She talks through a dish in her own order. Our character listens for missing measurements, tools, sensory cues, and memories. Tidy then organizes that conversation into ingredients, steps, tips, and stories for her to review before sharing.</p>
          <div className="cs-media-pair">
            <Figure src="/assets/app/app-4-recording.jpg" alt="Early Moldable writing interface from the design process" caption="Figma exploration: capture a recipe card while preserving the spoken explanation." className="cs-figure--process" />
            <Figure src="/assets/case-study/grandma-recording.jpg" alt="Grandma recording a recipe on the Moldable kitchen display" caption="Working prototype: one clear action and a quiet character that stays nearby." />
          </div>
          <div className="cs-flow-line" aria-label="Writing experience flow">
            <span>Talk naturally</span><i aria-hidden="true">→</i><span>Fill the gaps</span><i aria-hidden="true">→</i><span>Organize</span><i aria-hidden="true">→</i><span>Review &amp; share</span>
          </div>
        </Section>

        <Section id="cooking">
          <p className="cs-label">03 · Adapt, then guide</p>
          <h2>A moldable cooking experience</h2>
          <p className="cs-lead">The recipe meets the kitchen that exists today.</p>
          <p>The grandkid can ask for two servings or replace an ingredient they cannot find. The new version stays beside Grandma’s original. While cooking, the small display reduces the recipe to one focused step and supports voice or gestures when hands are busy.</p>
          <Figure src="/assets/case-study/grandkids-recipes.jpg" alt="Grandkids browsing family recipes on the Moldable kitchen display" caption="The recipe overview keeps the person, time, ingredients, and adaptation action in one glance." className="cs-figure--wide" />
          <div className="cs-media-pair cs-media-pair--small">
            <Figure src="/assets/app/app-2-slice-shallots.jpg" alt="Early visual cooking guidance from the design process" caption="Early guidance study: make tacit knowledge visible." className="cs-figure--process" />
            <Figure src="/assets/app/app-3-coconut-milk.jpg" alt="Early ingredient measurement interface from the design process" caption="Early measurement study: tools and amounts belong to the active step." className="cs-figure--process" />
          </div>
        </Section>

        <Section id="whisper">
          <p className="cs-label">04 · Guidance with a source</p>
          <h2>Your grandma&apos;s whisper</h2>
          <p className="cs-lead">Not a generic assistant. A small reminder of how your family taught the dish.</p>
          <p>Our character brings Grandma’s phrasing, photos, and stories into the step where they matter. “Don’t make it watery; you should still see a little texture” appears while blending—not later in a separate archive. The character guides, then fades back.</p>
          <Figure src="/assets/case-study/grandkids-guidance.jpg" alt="Step-by-step family guidance on the Moldable kitchen display" caption="Grandma’s sensory cue appears beside the instruction it clarifies." className="cs-figure--wide" />
          <blockquote>“Trust the color more than the clock.”<cite>Guidance preserved from Grandma’s explanation</cite></blockquote>
        </Section>

        <Section id="reflection">
          <p className="cs-label">Reflection</p>
          <h2>The recipe was never only the recipe.</h2>
          <p>Measurements, substitutions, family habits, and stories all change how a dish survives. The design became stronger when we stopped treating those details as metadata and started placing each one at the moment it becomes useful.</p>
          <p className="cs-next">Next we would test how often our character can ask a question before it interrupts the storyteller, and when cooks want a family story versus the next instruction.</p>
        </Section>
      </main>
    </div>
  )
}
