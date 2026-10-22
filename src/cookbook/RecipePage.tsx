'use client'

import './recipe-page.css'
import type { ReactNode } from 'react'
import type { Ingredient } from './model'

/* A recipe made with "Make your own", on the 640 × 640 display: the same voice as Lawar Bali's page (big name, one sentence,
   grey chips), then everything the tidy found, in one scroll. Used on the fridge, and on Grandma's screen to check it. */

export type RecipeView = {
  name: string
  summary: string
  minutes: number | null
  serves: number | null
  ingredients: Ingredient[]
  steps: string[]
  tools: string[]
  questions?: string[]
}

const ICON = {
  clock: 'M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M10 6.5V10l2.4 1.5',
  serves: 'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5 M14 8.5a2 2 0 1 0 0-4 M13.5 11.6c2.3.2 4 2 4 4.4',
  steps: 'M7 5h10M7 10h10M7 15h10M3 5h.1M3 10h.1M3 15h.1',
}

function Icon({ d }: { d: string }) {
  return (
    <svg width={17} height={17} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

/** `actions`: buttons for the title row's white pill (Back to the fridge). `children`: anything under the recipe. */
export function RecipePage({ recipe, by, actions, children }: { recipe: RecipeView; by?: string; actions?: ReactNode; children?: ReactNode }) {
  const { name, summary, minutes, serves, ingredients, steps, tools, questions = [] } = recipe
  return (
    <div className="rp">
      <header className="rp-head">
        <div className="rp-head__text">
          <h1 className="rp-title">{name}</h1>
          {by ? <p className="rp-by">{by}</p> : null}
        </div>
        {actions ? <div className="rp-actions">{actions}</div> : null}
      </header>
      {summary ? <p className="rp-summary">{summary}</p> : null}
      <div className="rp-tags">
        {minutes ? <span className="rp-tag"><Icon d={ICON.clock} />{minutes} min</span> : null}
        {serves ? <span className="rp-tag"><Icon d={ICON.serves} />Serves {serves}</span> : null}
        {steps.length ? <span className="rp-tag"><Icon d={ICON.steps} />{steps.length} steps</span> : null}
      </div>

      {ingredients.length ? (
        <section className="rp-section" aria-labelledby="rp-ingredients">
          <h2 id="rp-ingredients" className="rp-section__title">Ingredients</h2>
          <ul className="rp-ingredients">
            {ingredients.map((i) => (
              <li key={i.name}>
                <span className="rp-ingredients__name">{i.name}</span>
                <span className="rp-ingredients__amount">{i.amount || '—'}</span>
                {i.said && i.said.toLowerCase() !== i.amount.toLowerCase() ? <span className="rp-ingredients__said">“{i.said}”</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {steps.length ? (
        <section className="rp-section" aria-labelledby="rp-steps">
          <h2 id="rp-steps" className="rp-section__title">Steps</h2>
          <ol className="rp-steps">
            {steps.map((s, n) => <li key={n}><span className="rp-steps__n">{n + 1}</span><span>{s}</span></li>)}
          </ol>
        </section>
      ) : null}

      {tools.length ? (
        <section className="rp-section" aria-labelledby="rp-tools">
          <h2 id="rp-tools" className="rp-section__title">Tools you’ll need</h2>
          <ul className="rp-tools">{tools.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ) : null}

      {questions.length ? (
        <section className="rp-section" aria-labelledby="rp-ask">
          <h2 id="rp-ask" className="rp-section__title">Still to ask</h2>
          <ul className="rp-ask">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
        </section>
      ) : null}

      {children}
    </div>
  )
}
