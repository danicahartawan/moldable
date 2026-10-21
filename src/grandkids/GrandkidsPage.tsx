'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BowlFood, CookingPot, HandWaving, ListBullets, Microphone, PaintBrush, Sparkle, Timer, Wrench, X } from '@phosphor-icons/react'
import './grandkids.css'

type Section = 'time' | 'tools' | 'ingredients'

const recipeCards = [
  { name: 'Lawar Bali', emoji: '🌺', className: 'lawar' },
  { name: 'Nasi Goreng', emoji: '🍳', className: 'nasi' },
  { name: 'Soto Ayam', emoji: '🍋', className: 'soto' },
]

const ingredients = [
  ['🥩', 'a handful of ground beef'],
  ['🫛', 'a big handful of green beans, sliced tiny'],
  ['🥥', 'a little bowl of grated coconut'],
  ['🧅', '2 shallots, thinly sliced'],
  ['🧄', '1 garlic clove'],
  ['🫚', 'a thumb of ginger'],
  ['🌶️', 'a small red chilli, if you like'],
  ['🍋', 'a good squeeze of lime'],
  ['🧂', 'a pinch of salt'],
]

const cookingSteps = [
  { title: 'Blend', emoji: '🌀', instruction: 'First, put the beef in your biggest bowl. Blend onion, garlic, chilli, ginger, and lime into a paste.', tip: 'A splash of water helps it move.' },
  { title: 'Toast', emoji: '🥥', instruction: 'Toast the coconut in a dry pan until golden.', tip: 'Keep it moving.' },
  { title: 'Sauté', emoji: '🍳', instruction: 'Sauté the spice paste, then add the beef and coconut.', tip: 'Cook until it smells amazing.' },
  { title: 'Serve', emoji: '🥣', instruction: 'Finish with lime, then serve over warm pandan rice.', tip: 'Taste it one last time.' },
]

export function GrandkidsPage() {
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const [section, setSection] = useState<Section>('time')
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const speak = useCallback(async (text: string) => {
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    setSpeaking(true)
    try {
      const response = await fetch('/api/grandkids/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) return
      const audioUrl = URL.createObjectURL(await response.blob())
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audioUrlRef.current = audioUrl
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => setSpeaking(false)
      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }, [])

  useEffect(() => () => {
    audioRef.current?.pause()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])

  function startWalkthrough() {
    setStarted(true)
    setStep(0)
    void speak(cookingSteps[0].instruction)
  }

  function nextStep() {
    const next = Math.min(step + 1, cookingSteps.length - 1)
    setStep(next)
    void speak(cookingSteps[next].instruction)
  }

  return (
    <main className="grandkids-stage">
      <div className="grandkids-screen" data-testid="grandkids-screen">
        <button className="summon-tab" type="button" aria-label={toolbarOpen ? 'Hide recipe tools' : 'Show recipe tools'} aria-expanded={toolbarOpen} onClick={() => setToolbarOpen(!toolbarOpen)} onMouseEnter={() => setToolbarOpen(true)}>
          <Sparkle weight="fill" aria-hidden="true" />
        </button>

        <div className="gradient-toolbar" role="toolbar" aria-label="Recipe tools" data-open={toolbarOpen} onMouseLeave={() => setToolbarOpen(false)}>
          <button type="button" aria-label="Talk to Grandma" data-speaking={speaking} onClick={() => { if (started) void speak(cookingSteps[step].instruction) }}><Microphone weight="fill" /></button>
          <button type="button" aria-label="Change recipe"><PaintBrush weight="fill" /></button>
          <button type="button" aria-label="Recipes"><BowlFood weight="fill" /></button>
          <button type="button" aria-label="Hide recipe tools" onClick={() => setToolbarOpen(false)}><X /></button>
        </div>

        {!recipeOpen ? (
          <section className="fridge" aria-label="Recipe fridge">
            <div className="recipe-magnets">
              {recipeCards.map((recipe) => (
                <button className={`recipe-note recipe-note--${recipe.className}`} type="button" key={recipe.name} aria-label={recipe.name === 'Lawar Bali' ? 'Open Lawar Bali' : `${recipe.name}, coming soon`} onClick={recipe.name === 'Lawar Bali' ? () => setRecipeOpen(true) : undefined}>
                  <span className="magnet" aria-hidden="true">{recipe.emoji}</span>
                  <strong>{recipe.name}</strong>
                  <span className="dish-sketch" aria-hidden="true"><BowlFood weight="duotone" /></span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="cook-view" aria-label="Lawar Bali recipe">
            <button className="back-button" type="button" aria-label="Recipe fridge" onClick={() => setRecipeOpen(false)}><ArrowLeft /></button>
            <h1>{started ? `${step + 1} / 4` : 'Lawar Bali'}</h1>

            {started ? (
              <section className="walkthrough" aria-label="Cooking walkthrough">
                <article className="step-card" aria-live="polite">
                  <span className="step-emoji" aria-hidden="true">{cookingSteps[step].emoji}</span>
                  <h2>{cookingSteps[step].title}</h2>
                  <p>{cookingSteps[step].instruction}</p>
                  <small><span aria-hidden="true">🌺</span> Tip from Popo: {cookingSteps[step].tip}</small>
                </article>
                <div className="step-progress" aria-hidden="true">{cookingSteps.map((item, index) => <i key={item.title} data-active={index === step} />)}</div>
                <button className="step-next" type="button" aria-label="Next step" disabled={step === cookingSteps.length - 1} onClick={nextStep}><ArrowRight weight="bold" /></button>
              </section>
            ) : (
              <>
                <aside className="recipe-player" aria-label="Recipe player">
                  <CookingPot weight="duotone" aria-hidden="true" />
                  <p aria-hidden="true" />
                  <button className="start-button" type="button" aria-label="Wave or tap to start" onClick={startWalkthrough}><HandWaving weight="fill" /></button>
                </aside>

                <nav className="section-dots" aria-label="Recipe sections">
                  <button type="button" aria-label="Show Time" aria-current={section === 'time'} onClick={() => setSection('time')}><Timer weight="fill" /></button>
                  <button type="button" aria-label="Show Tools" aria-current={section === 'tools'} onClick={() => setSection('tools')}><Wrench weight="fill" /></button>
                  <button type="button" aria-label="Show Ingredients" aria-current={section === 'ingredients'} onClick={() => setSection('ingredients')}><ListBullets weight="fill" /></button>
                </nav>

                <div className="widget-stack">
                  <section className="cook-widget time-widget" aria-label="Time" data-active={section === 'time'}><Timer weight="duotone" aria-hidden="true" /><strong aria-label="15 minutes">15</strong><span>min</span></section>
                  <section className="cook-widget tools-widget" aria-label="Tools" data-active={section === 'tools'}><span aria-label="big bowl">🥣</span><span aria-label="frying pan">🍳</span><span aria-label="blender">🫙</span></section>
                  <section className="cook-widget ingredients-widget" aria-label="Ingredients" data-active={section === 'ingredients'}>{ingredients.map(([emoji, label]) => <span key={label} role="img" aria-label={label}>{emoji}</span>)}</section>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
