'use client'

import './tidy-recipe.css'
import { useEffect, useRef, useState } from 'react'
import { HomeViewFrame } from '@/home/HomeViewFrame'
import { MorphBot } from '@/grandma/MorphBot'
import { hearOnce } from '@/voice/hearOnce'
import { changeCookbooks, tidyRecipe } from './client'
import { newId, type SavedRecipe } from './model'
import { RecipePage } from './RecipePage'
import type { Answer, Draft } from './tidy'

const MIC = 'M10 2.5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0V5A2.5 2.5 0 0 1 10 2.5z M5 9.5a5 5 0 0 0 10 0 M10 14.5V17.5'

/**
 * Grandma's screen after Tidy, for a new recipe: her story is tidied into a recipe (name, ingredients, steps, tools), then
 * what's still missing is asked one question at a time. She answers out loud (or types, or skips), each answer is folded
 * back in, and the recipe goes onto the fridge it was started from.
 */
export function TidyRecipe({ book, story, title, onSaved }: {
  book: { id: string; name: string }
  story: string
  title: string
  onSaved: (recipe: SavedRecipe) => void
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [busy, setBusy] = useState<'tidying' | 'listening' | 'saving' | null>('tidying')
  const [heard, setHeard] = useState('')
  const [typed, setTyped] = useState('')
  const [problem, setProblem] = useState('')
  const owner = book.name ? `${book.name}’s` : 'the new'

  // Tidies the story with the answers so far; the newest answer's tidy wins if two overlap.
  const round = useRef(0)
  const tidy = (with_: Answer[]) => {
    const mine = ++round.current
    setBusy('tidying')
    setProblem('')
    tidyRecipe({ transcript: story, book: book.name, title, answers: with_ })
      .then(({ draft: next }) => { if (mine === round.current) setDraft(next) })
      .catch((error: Error) => { if (mine === round.current) setProblem(error.message) })
      .finally(() => { if (mine === round.current) setBusy(null) })
  }
  const tidyRef = useRef(tidy)
  tidyRef.current = tidy
  useEffect(() => { tidyRef.current([]) }, [])

  const asked = new Set([...answers.map((a) => a.question), ...skipped])
  const question = draft?.questions.find((q) => !asked.has(q)) ?? null

  const answer = (text: string) => {
    if (!question || !text.trim()) return
    const next = [...answers, { question, answer: text.trim() }]
    setAnswers(next)
    setTyped('')
    setHeard('')
    tidy(next)
  }
  const speak = async () => {
    setBusy('listening')
    setHeard('')
    setProblem('')
    try {
      const words = await hearOnce({ onWords: setHeard })
      setBusy(null)
      if (words) answer(words)
      else setProblem('I didn’t catch that. Try again, or type it.')
    } catch {
      setBusy(null)
      setProblem('The microphone is off. You can type the answer instead.')
    }
  }
  const save = async () => {
    if (!draft) return
    setBusy('saving')
    const recipe: SavedRecipe = {
      id: newId('recipe'),
      ...draft,
      // What she skipped (or wasn't asked yet) stays with the recipe, to ask another time.
      questions: draft.questions.filter((q) => !answers.some((a) => a.question === q)),
      transcript: story,
      createdAt: new Date().toISOString(),
    }
    await changeCookbooks({ type: 'add_recipe', book: book.id, recipe })
    onSaved(recipe)
  }

  return (
    <HomeViewFrame label="New recipe" className="grandma-homeview tr">
      {!draft ? (
        <div className="tr-wait" role="status" aria-live="polite">
          <span className="tr-wait__bot" aria-hidden="true"><MorphBot size={120} state="working" /></span>
          <p>{problem || 'Tidying up your recipe…'}</p>
        </div>
      ) : (
        <>
          <RecipePage recipe={{ ...draft, questions: [] }} by={`For ${owner} fridge`}>
            <div className="tr-spacer" aria-hidden="true" />
          </RecipePage>
          <section className="tr-ask" aria-label="A few things to check" aria-live="polite">
            {question ? (
              <>
                <p className="tr-ask__label"><b>A few things to check</b>{draft.questions.length > 1 ? ` ${draft.questions.indexOf(question) + 1} of ${draft.questions.length}` : ''}</p>
                <p className="tr-ask__question">{question}</p>
                {busy === 'listening' ? (
                  <p className="tr-ask__heard">{heard ? `“${heard}”` : 'Listening…'}</p>
                ) : problem ? <p className="tr-ask__heard">{problem}</p> : null}
                <form className="tr-ask__row" onSubmit={(e) => { e.preventDefault(); answer(typed) }}>
                  <button type="button" className="tr-ask__mic" aria-label="Answer out loud" disabled={!!busy} onClick={() => void speak()}>
                    <svg width={22} height={22} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={MIC} /></svg>
                  </button>
                  <input className="tr-ask__input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type the answer" aria-label="Answer" disabled={!!busy} />
                  <button type="button" className="tr-ask__skip" disabled={!!busy} onClick={() => setSkipped((s) => [...s, question])}>Skip</button>
                </form>
                <button type="button" className="tr-ask__later" disabled={!!busy} onClick={() => void save()}>Add it now, ask later</button>
              </>
            ) : (
              <>
                <p className="tr-ask__label">{busy === 'tidying' ? 'Updating the recipe…' : 'It’s ready'}</p>
                <button type="button" className="tr-ask__save" disabled={!!busy} onClick={() => void save()}>
                  {busy === 'saving' ? 'Adding…' : `Add to ${owner} fridge`}
                </button>
              </>
            )}
          </section>
        </>
      )}
    </HomeViewFrame>
  )
}
