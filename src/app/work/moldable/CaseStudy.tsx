'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

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

type HairPoint = { x: number; y: number }

const initialHair: HairPoint[] = [
  { x: 111, y: 283 }, { x: 82, y: 240 }, { x: 75, y: 180 }, { x: 88, y: 126 },
  { x: 123, y: 85 }, { x: 178, y: 63 }, { x: 240, y: 58 }, { x: 302, y: 61 },
  { x: 354, y: 79 }, { x: 392, y: 115 }, { x: 410, y: 168 }, { x: 406, y: 226 },
  { x: 393, y: 281 }, { x: 371, y: 329 }, { x: 341, y: 340 }, { x: 316, y: 301 },
  { x: 301, y: 248 }, { x: 269, y: 226 }, { x: 224, y: 224 }, { x: 181, y: 239 },
  { x: 166, y: 296 }, { x: 141, y: 339 },
]

const initialFringe: HairPoint[] = [
  { x: 111, y: 211 }, { x: 149, y: 188 }, { x: 190, y: 190 }, { x: 220, y: 205 },
  { x: 258, y: 224 }, { x: 303, y: 187 }, { x: 358, y: 205 }, { x: 389, y: 235 },
  { x: 389, y: 265 }, { x: 380, y: 310 }, { x: 344, y: 337 }, { x: 315, y: 330 },
  { x: 304, y: 242 }, { x: 267, y: 253 }, { x: 224, y: 250 }, { x: 187, y: 238 },
  { x: 190, y: 300 }, { x: 153, y: 337 }, { x: 122, y: 330 }, { x: 108, y: 280 },
]

function closedCurve(points: HairPoint[]) {
  const curves = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const after = points[(index + 2) % points.length]
    return `C ${point.x + (next.x - previous.x) / 6} ${point.y + (next.y - previous.y) / 6}, ${next.x - (after.x - point.x) / 6} ${next.y - (after.y - point.y) / 6}, ${next.x} ${next.y}`
  })
  return `M ${points[0].x} ${points[0].y} ${curves.join(' ')} Z`
}

function ClayCharacter() {
  const [hair, setHair] = useState(initialHair)
  const drag = useRef<{ index: number; x: number; y: number; points: HairPoint[] } | null>(null)
  const hairPath = useMemo(() => closedCurve(hair), [hair])
  const fringePath = useMemo(() => closedCurve(initialFringe.map((point) => {
    const movement = hair.reduce<{ x: number; y: number; weight: number }>((total, hairPoint, index) => {
      const distance = Math.hypot(point.x - initialHair[index].x, point.y - initialHair[index].y)
      const influence = Math.exp(-(distance * distance) / 18000)
      return {
        x: total.x + (hairPoint.x - initialHair[index].x) * influence,
        y: total.y + (hairPoint.y - initialHair[index].y) * influence,
        weight: total.weight + influence,
      }
    }, { x: 0, y: 0, weight: 0 })
    return {
      x: point.x + movement.x / movement.weight * .32,
      y: point.y + movement.y / movement.weight * .32,
    }
  })), [hair])

  const toSvgPoint = (event: PointerEvent<SVGPathElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    return {
      x: bounds?.width ? (event.clientX - bounds.left) * 500 / bounds.width : event.clientX,
      y: bounds?.height ? (event.clientY - bounds.top) * 430 / bounds.height : event.clientY,
    }
  }

  const startMolding = (event: PointerEvent<SVGPathElement>) => {
    const point = toSvgPoint(event)
    const index = hair.reduce((nearest, candidate, candidateIndex) => {
      const oldDistance = Math.hypot(hair[nearest].x - point.x, hair[nearest].y - point.y)
      const newDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y)
      return newDistance < oldDistance ? candidateIndex : nearest
    }, 0)
    drag.current = { index, x: point.x, y: point.y, points: hair.map((item) => ({ ...item })) }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moldHair = (event: PointerEvent<SVGPathElement>) => {
    if (!drag.current) return
    const point = toSvgPoint(event)
    const rawDeltaX = point.x - drag.current.x
    const rawDeltaY = point.y - drag.current.y
    const distanceDragged = Math.hypot(rawDeltaX, rawDeltaY)
    const dragScale = distanceDragged > 84 ? 84 / distanceDragged : 1
    const deltaX = rawDeltaX * dragScale
    const deltaY = rawDeltaY * dragScale
    setHair(drag.current.points.map((item, index) => {
      const directDistance = Math.abs(index - drag.current!.index)
      const distance = Math.min(directDistance, initialHair.length - directDistance)
      const influence = Math.exp(-(distance * distance) / 12)
      return {
        x: Math.max(38, Math.min(462, item.x + deltaX * influence)),
        y: Math.max(28, Math.min(388, item.y + deltaY * influence)),
      }
    }))
  }

  const nudgeHair = (event: KeyboardEvent<SVGPathElement>) => {
    const movement: Record<string, HairPoint> = {
      ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: -8 }, ArrowDown: { x: 0, y: 8 },
    }
    if (event.key === 'Escape') {
      setHair(initialHair)
      return
    }
    const move = movement[event.key]
    if (!move) return
    event.preventDefault()
    setHair((current) => current.map((point, index) => index === 6 ? { x: point.x + move.x, y: point.y + move.y } : point))
  }

  return (
    <div className="cs-clay-stage">
      <p className="cs-clay-hint">Pull the hair to mold it</p>
      <svg className="cs-clay-character" role="img" aria-label="Moldable clay character" viewBox="0 0 500 430">
        <defs>
          <linearGradient id="hair-clay" gradientUnits="userSpaceOnUse" x1="70" y1="50" x2="410" y2="340"><stop stopColor="#ff7448" /><stop offset="1" stopColor="#ef4f2f" /></linearGradient>
          <linearGradient id="face-clay" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f2d2bd" /><stop offset="1" stopColor="#d9a989" /></linearGradient>
          <filter id="clay-texture"><feTurbulence baseFrequency=".62" numOctaves="2" seed="8" type="fractalNoise" result="noise" /><feComponentTransfer in="noise" result="softNoise"><feFuncR type="linear" slope=".12" intercept=".88" /><feFuncG type="linear" slope=".12" intercept=".88" /><feFuncB type="linear" slope=".12" intercept=".88" /></feComponentTransfer><feComposite in="softNoise" in2="SourceGraphic" operator="in" result="texture" /><feBlend in="SourceGraphic" in2="texture" mode="multiply" /></filter>
          <filter id="clay-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="11" floodColor="#685b52" floodOpacity=".22" /></filter>
        </defs>
        <ellipse className="cs-clay-floor" cx="250" cy="374" rx="168" ry="24" />
        <g filter="url(#clay-shadow)">
          <path className="cs-clay-hair" role="button" aria-label="Mold the clay hair" tabIndex={0} d={hairPath} onPointerDown={startMolding} onPointerMove={moldHair} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onKeyDown={nudgeHair} />
          <rect className="cs-clay-face" x="137" y="245" width="226" height="151" rx="76" />
          <path className="cs-clay-fringe" data-testid="clay-hair-fringe" d={fringePath} />
          <circle className="cs-clay-eye-white" cx="218" cy="284" r="12" /><circle className="cs-clay-eye" cx="215" cy="284" r="8" />
          <circle className="cs-clay-eye-white" cx="291" cy="284" r="12" /><circle className="cs-clay-eye" cx="288" cy="284" r="8" />
          <ellipse className="cs-clay-mouth" cx="254" cy="329" rx="9" ry="6" />
          {[176, 188, 199, 312, 323, 334].map((x, index) => <circle key={x} className="cs-clay-freckle" cx={x} cy={318 + (index % 3) * 5} r="1.25" />)}
          <g className="cs-clay-stars" aria-hidden="true">
            <path transform="translate(102 145) scale(.62)" d="M0-24 8-9 24 0 9 8 0 25-8 9-24 0-9-8Z" />
            <path transform="translate(354 116) scale(.48)" d="M0-24 8-9 24 0 9 8 0 25-8 9-24 0-9-8Z" />
            <path transform="translate(392 220) scale(.36)" d="M0-24 8-9 24 0 9 8 0 25-8 9-24 0-9-8Z" />
          </g>
        </g>
      </svg>
    </div>
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
        <ClayCharacter />
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
