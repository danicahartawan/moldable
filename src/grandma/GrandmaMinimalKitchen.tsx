'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { KitchenMockup, type KitchenVoiceBridge, type Perspective } from '../kitchen/KitchenMockup'
import { useHeyPopo } from '../voice/useHeyPopo'
import { useVoiceAssistant } from '../voice/useVoiceAssistant'
import { GrandmaMinimalPage } from './GrandmaMinimalPage'
import { announceRecipe } from '../recipe/client'
import { RecipeSync } from '../recipe/RecipeSync'
import '../kitchen/type-scale.css'
import './grandma-welcome.css'

const storyPhotos = [
  '/assets/grandma-story-creamy-chicken.png',
  '/assets/grandma-story-satay.png',
  '/assets/grandma-story-noodles.png',
  '/assets/grandma-story-pasta.png',
  '/assets/grandma-story-curry.png',
  '/assets/grandma-story-satay.png',
  '/assets/grandma-story-curry.png',
  '/assets/grandma-story-pasta.png',
  '/assets/grandma-story-creamy-chicken.png',
  '/assets/grandma-story-noodles.png',
]

function GrandmaWelcome({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="gm-welcome" role="region" aria-label="Share more stories">
      <span className="gm-welcome__gallery" aria-hidden="true">
        {storyPhotos.map((src, index) => (
          <span className={`gm-welcome__photo gm-welcome__photo--${index + 1}`} key={`${src}-${index}`}>
            <span className="gm-welcome__photo-inner">
              <Image src={src} alt="" fill sizes="(max-width: 700px) 32vw, 210px" priority={index < 5} />
            </span>
          </span>
        ))}
      </span>
      <div className="gm-welcome__prompt">
        <h1 className="gm-welcome__title" aria-label="Share more stories">
          {['Share', 'more', 'stories'].map((word, i) => (
            <span className="gm-welcome__word" style={{ animationDelay: `${300 + i * 380}ms` }} aria-hidden="true" key={word}>{word}</span>
          ))}
        </h1>
        <span className="gm-welcome__unlock-zone">
          <button className="gm-welcome__button" type="button" aria-label="New Recipe" onClick={onContinue}>
            <span aria-hidden="true">+</span> New Recipe
          </button>
        </span>
      </div>
    </section>
  )
}

// The kitchen with the minimal grandma screen; Tidy takes the recipe straight to the Grandkids view.
export function GrandmaMinimalKitchen() {
  const [hasEntered, setHasEntered] = useState(false)
  // A new recipe note starts from Oma's own recipe: any changes saved on the server are put back.
  const begin = () => {
    setHasEntered(true)
    void fetch('/api/recipe/reset', { method: 'POST' }).then((r) => (r.ok ? r.json() : null)).then((r) => { if (r?.recipe) announceRecipe(r.recipe) }).catch(() => {})
  }

  // On the Grandkids side “Hey Popo” talks to the assistant, which changes the shared recipe and answers aloud. (On the Grandma
  // side the finished note listens for it itself.)
  const bridge = useRef<KitchenVoiceBridge | null>(null)
  const [perspective, setPerspective] = useState<Perspective>('grandma')
  const onPerspective = useCallback((next: Perspective) => setPerspective(next), [])
  const assistant = useVoiceAssistant(bridge)
  const onGrandkids = perspective === 'grandkids'
  const wake = useHeyPopo({ onWake: () => { void assistant.run() }, paused: !onGrandkids || assistant.status !== 'idle' })
  const armWake = wake.arm
  useEffect(() => { if (onGrandkids) armWake() }, [onGrandkids, armWake])
  const listening = wake.armed && !wake.error

  // The Recipe change button on the recipe starts the same listening, once the microphone is allowed; until then it plays the demo.
  useEffect(() => {
    if (!listening) return
    const onRequest = (event: Event) => {
      event.preventDefault()
      void assistant.run()
    }
    window.addEventListener('moldable:recipe-change', onRequest)
    return () => window.removeEventListener('moldable:recipe-change', onRequest)
  }, [listening, assistant])

  return (
    <div className="gm-kitchen">
      <RecipeSync />
      <KitchenMockup
        fridge
        voiceBridge={bridge}
        onPerspective={onPerspective}
        grandmaScreen={({ showRecipe, prepareRipple, perspective: side }) => hasEntered
          ? <div className="gm-welcome__next"><GrandmaMinimalPage onTidy={showRecipe} onTidyStart={prepareRipple} active={side === 'grandma'} /></div>
          : <GrandmaWelcome onContinue={begin} />}
      />
    </div>
  )
}
