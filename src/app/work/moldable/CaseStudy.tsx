'use client'
import { useEffect, useState, type ReactNode } from 'react'

const sections = [
  ['overview', 'Overview'],
  ['preservation', 'Storytelling as Preservation'],
  ['features', 'Preservation Features'],
  ['moldable', 'Moldable Cooking'],
  ['companion', 'Companionship & Voice'],
  ['demo', 'Short Demo'],
  ['reflection', 'Reflection'],
] as const

function Img({ label, wide }: { label?: string; wide?: boolean }) {
  return <div className={`cs-img${wide ? ' cs-img-wide' : ''}`} role="img" aria-label={label ?? 'Image placeholder'} />
}

function Cols({ items }: { items: [string, string][] }) {
  return (
    <div className="cs-cols">
      {items.map(([t, d]) => (
        <div key={t}>
          <h4>{t}</h4>
          <p>{d}</p>
        </div>
      ))}
    </div>
  )
}

function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="cs-section">
      {children}
    </section>
  )
}

const HERO_W = 2000
const HERO_H = 1006
const heroStates = [
  { title: 'listening', copy: 'Grandma talks and the display listens, with a live timer and waveform. Pause or stop whenever she needs a moment.', x: 54, y: 27, zoom: 2.4 },
  { title: 'her words, kept', copy: 'The recipe stays in her voice. Ingredients and steps are highlighted inside her own sentences, not rewritten.', x: 50, y: 59, zoom: 2.6 },
  { title: 'three views', copy: 'Grandma, Grandkids and Explore: tell it, cook it, find it. One tap moves between the stories and the kitchen.', x: 50, y: 95, zoom: 2.2 },
] as const

function Hero() {
  const [sel, setSel] = useState<number | null>(null)
  const st = sel === null ? null : heroStates[sel]
  const zoom = st ? st.zoom : 1
  const ox = st ? st.x : 50
  const oy = st ? st.y : 50
  // a point's on-screen position once the image is scaled around (ox, oy)
  const at = (x: number, y: number) => [ox + zoom * (x - ox), oy + zoom * (y - oy)]
  return (
    <div className="cs-hero">
      <div className="cs-hero-stage" style={{ aspectRatio: `${HERO_W} / ${HERO_H}` }}>
        <img
          className="cs-hero-img"
          src="/assets/kitchen-hero.jpg"
          alt="The Moldable kitchen display on a wooden table"
          style={{ transformOrigin: `${ox}% ${oy}%`, transform: `scale(${zoom})` }}
        />
        {heroStates.map((h, i) => {
          const [mx, my] = at(h.x, h.y)
          return (
            <button
              key={h.title}
              type="button"
              className={`cs-hero-marker${sel === i ? ' is-selected' : ''}`}
              style={{ left: `${mx}%`, top: `${my}%` }}
              aria-label={`Show ${h.title} details`}
              aria-pressed={sel === i}
              onClick={() => setSel(sel === i ? null : i)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="cs-hero-copy" aria-live="polite">
        {st ? (
          <>
            <h3>{st.title}</h3>
            <p>{st.copy}</p>
          </>
        ) : (
          <p className="cs-hero-hint">Tap a marker to look closer.</p>
        )}
      </div>
    </div>
  )
}

export function CaseStudy() {
  const [active, setActive] = useState<string>('overview')

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-20% 0px -70% 0px' },
    )
    sections.forEach(([id]) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  return (
    <div className="cs">
      <aside className="cs-side">
        <div className="cs-crumb">
          <a href="/">← Work</a>
          <span>/</span>
          <b>Moldable</b>
        </div>
        <nav>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={active === id ? 'on' : ''}>
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="cs-main">
        <Hero />
        <h1>Recipes that carry the people who made them</h1>

        <div className="cs-meta">
          <div>
            <p className="cs-label">Collaborators</p>
            <p>Danica</p>
            <p>Fred</p>
            <p>Nevan</p>
          </div>
          <div>
            <p className="cs-label">Role</p>
            <p>Engineer</p>
            <p>Design</p>
            <p>Strategy</p>
          </div>
        </div>

        <Section id="overview">
          <p className="cs-label">Overview</p>
          <h2>How do you cook a recipe that only makes sense when Grandma is standing next to you?</h2>
          <p>
            Our grandmas are in Indonesia. We are cooking in different countries, with missing ingredients and measurements like
            “a little” and “until it’s ready”. Moldable is a voice-first cookbook that preserves how a recipe is told, then
            adapts it to the kitchen of whoever is cooking.
          </p>
          <Cols
            items={[
              ['Preservation', 'Capture the recipe, the reasoning, and the story behind it in Grandma’s own voice.'],
              ['Moldable', 'Adapt to people, ingredients, and how you interact with the recipe while cooking.'],
              ['Companionship', 'Mold carries Grandma’s knowledge into the kitchen without replacing her.'],
            ]}
          />
          <Img label="Overview" />
        </Section>

        <Section id="preservation">
          <p className="cs-label">Principle 1</p>
          <h2>Storytelling as preservation, translated across generations</h2>
          <p>
            Two user groups: the grandma passing a recipe down, and the grandchild who wants to learn it. We started with what
            already feels native in a kitchen.
          </p>
          <h3>Native form factors</h3>
          <p>
            Fridge magnets, handwritten recipe cards, cookbooks, cutting boards, kitchen timers, and stencil-style formats where
            everything is laid out for you. All of them are static. Once written down, a recipe can’t capture how it changes, or
            how Grandma actually explains it.
          </p>
          <Img label="Native form factors" />
          <h3>Grandma’s goal: simple, and preserve everything</h3>
          <p>
            “Everything” means more than ingredients and steps: the stories, the tools, the timing, and the sensory cues. “One
            scoop” may mean a handful. “Cook it until it’s ready” means until it turns a specific color. A written recipe loses
            that.
          </p>
          <h3>Voice as the medium</h3>
          <p>
            In interviews, families already share recipes through phone calls and voice notes. So Grandma just talks, and
            Moldable does the organizing. We looked at Granola and Arc’s Tidy for how little effort that can take.
          </p>
          <Img label="Voice as the medium" />
        </Section>

        <Section id="features">
          <p className="cs-label">Preservation features</p>
          <h2>Four features that turn natural speech into a structured recipe</h2>
          <Cols
            items={[
              ['Guiding questions', 'Mold listens for gaps and asks follow-ups: how much salt, what should the onions look like, who taught you this?'],
              ['Tool tagging', '“Microwave for thirty seconds” becomes a microwave chip tied to that step, ready to start a timer later.'],
              ['Tidy', 'Sorts a messy transcript into ingredients, steps, tools, tips, and stories without removing her words.'],
              ['Send cookbook', 'The organized recipe goes to the grandchild as part of a growing family cookbook.'],
            ]}
          />
          <Img label="Guiding questions" />
          <Img label="Tool tagging" />
          <Img label="Tidy" />
        </Section>

        <Section id="moldable">
          <p className="cs-label">Principle 2</p>
          <h2>Reimagining the cookbook as something moldable</h2>
          <p>Moldable adapts to people, ingredients, and interaction.</p>
          <h3>Designing around the cooking environment</h3>
          <p>
            A small home display on the counter, and hands that are wet, dirty, or holding something raw. Small screen, busy
            hands, don’t overwhelm.
          </p>
          <Img label="Recipe collection" />
          <p>The recipe collection is inspired by fridge magnets: family recipes as visual cards you tap to start cooking.</p>
          <Cols
            items={[
              ['Modify recipe', 'Say “cooking for six” or ask for a substitute. Grandma’s original stays visible next to your version.'],
              ['Hands-free navigation', 'Voice and air gestures move through one focused card at a time, with a toolbar for ingredients, tools, and steps.'],
              ['Stories in context', 'A “Tip from Popo” chip appears at the exact step it belongs to, never in a separate archive.'],
            ]}
          />
          <Img label="Modify recipe" />
          <Img label="Hands-free cooking" />
          <Img label="Stories in context" />
        </Section>

        <Section id="companion">
          <p className="cs-label">Principle 3</p>
          <h2>A presence, not a person</h2>
          <p>
            We took inspiration from Tony Stark’s interface for intelligence and the wisps in Brave for presence. Mold guides,
            then fades. It never says “I am your grandma”. It says “Your grandma usually waits until the onions look like this.”
          </p>
          <Img label="Mold companion" />
          <h3>Family knowledge, not a generic assistant</h3>
          <p>
            Mold learns phrases, tips, tools, habits, and stories from each person who shares a recipe. That also works for a
            dad. Every recipe adds more context, so one recipe becomes a cookbook, and a cookbook becomes a family archive.
          </p>
          <Cols
            items={[
              ['Presence', 'There when you need help, quiet when you don’t.'],
              ['Personal guidance', 'Answers come from your family’s actual knowledge.'],
              ['Family memory', 'Each shared recipe makes the archive more valuable.'],
            ]}
          />
        </Section>

        <Section id="demo">
          <p className="cs-label">Short demo</p>
          <h2>From Danica’s lawar to Nevan’s kitchen</h2>
          <h3>1. Danica teaches Moldable</h3>
          <p>
            She tells the recipe naturally. Mold asks what “one good handful” means (about 1 cup), tags the blender, captures
            “slightly coarse”, and saves the story about Nev and the onion knife.
          </p>
          <Img label="Teaching Moldable" />
          <h3>2. Tidy and send</h3>
          <p>One tap organizes everything into ingredients, steps, tools, tips, and stories, then sends it to Nev.</p>
          <Img label="Tidy" />
          <h3>3. Nevan modifies the recipe</h3>
          <p>
            “Change this to two servings.” No kencur? Ginger with lime zest, shown as a substitution chip while Danica’s original
            is kept.
          </p>
          <Img label="Modify recipe" />
          <h3>4. Hands-free cooking, with the story at the right step</h3>
          <p>
            “Next step.” Toast the coconut until golden, not dark brown, shown with Danica’s reference photo. Her recorded story
            plays at the step where it matters.
          </p>
          <Img label="Cooking mode" />
        </Section>

        <Section id="reflection">
          <p className="cs-label">Reflection</p>
          <h2>What I learned</h2>
          <h3>Preservation is more than data.</h3>
          <p>The reasoning, tools, and stories are what make a recipe someone’s, so capture them without flattening the person.</p>
          <h3>Build for the hands in the room.</h3>
          <p>Constraints like busy hands and a small screen shaped every interaction more than any feature idea did.</p>
        </Section>
      </main>
    </div>
  )
}
