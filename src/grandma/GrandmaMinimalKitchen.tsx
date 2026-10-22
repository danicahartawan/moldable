'use client'

import Image from 'next/image'
import { useState } from 'react'
import { KitchenMockup } from '../kitchen/KitchenMockup'
import { GrandmaMinimalPage } from './GrandmaMinimalPage'
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
        <h1 className="gm-welcome__title">Share more stories</h1>
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

  return (
    <div className="gm-kitchen">
      <KitchenMockup
        fridge
        grandmaScreen={({ showRecipe, prepareRipple }) => hasEntered
          ? <div className="gm-welcome__next"><GrandmaMinimalPage onTidy={showRecipe} onTidyStart={prepareRipple} /></div>
          : <GrandmaWelcome onContinue={() => setHasEntered(true)} />}
      />
    </div>
  )
}
