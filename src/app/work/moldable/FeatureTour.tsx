'use client'

import { useState } from 'react'

type Feature = { title: string; body: string; image: string; alt: string; pin: { x: number; y: number } }

// Pin positions are percentages of the screenshot, placed on the part of the screen each feature is about.
const features: Record<'grandma' | 'grandkids', Feature[]> = {
  grandma: [
    {
      title: 'She just talks',
      body: 'Hit record and tell the recipe the way you would at the stove. The note writes itself, names the dish as you go, and pulls out tools like Blend and Weigh as chips. A little clay ball listens beside you.',
      image: '/assets/case-study/screen-grandma-1.png',
      alt: 'Grandma display while recording, with a pause and stop control, a camera button and the clay ball listening',
      pin: { x: 88, y: 89 },
    },
    {
      title: 'Snap it mid-story',
      body: 'A camera card opens from the corner without covering what she is saying. The photo lands in the story right where she took it, as [Image 1], instead of in a folder somewhere else.',
      image: '/assets/case-study/screen-grandma-2.png',
      alt: 'Grandma display with the camera card open beside the story',
      pin: { x: 76, y: 52 },
    },
    {
      title: 'Say what to change',
      body: 'Recipe change fogs the screen and listens. The clay hears her out, answers “Ok, got it!”, then the note scrolls to the word that changes and marks it in orange: pork becomes beef.',
      image: '/assets/case-study/screen-grandma-3.png',
      alt: 'Grandma note after a recipe change, with pork crossed out and beef marked in orange',
      pin: { x: 56, y: 52 },
    },
  ],
  grandkids: [
    {
      title: 'A recipe that remembers',
      body: 'Version history lists who changed what, and when. Popo’s original stays at v1 in orange; every change a grandkid makes after it is teal.',
      image: '/assets/case-study/screen-grandkids-1.png',
      alt: 'Grandkids recipe screen with the version history under the recipe photo',
      pin: { x: 18, y: 69 },
    },
    {
      title: 'All of it, at a glance',
      body: 'Glance opens one scrolling sheet: tick off the ingredients first, then read the steps on a yellow note. It scrolls slowly and fades out at the bottom so nothing is cut off hard.',
      image: '/assets/case-study/screen-grandkids-2.png',
      alt: 'Glance sheet showing ingredients and the steps on a yellow note',
      pin: { x: 50, y: 45 },
    },
    {
      title: 'Ask for a change',
      body: 'Adjust is a clay orb at the top. Say “just two servings” and a drop of teal is mixed through the whole ball until it is teal. The ingredients update and a new version is saved.',
      image: '/assets/case-study/screen-grandkids-3.png',
      alt: 'Grandkids recipe screen fogged with the clay ball turning teal',
      pin: { x: 50, y: 56 },
    },
  ],
}

const all = [...features.grandma, ...features.grandkids]

// A product shot like a store page: two displays on stands, a numbered pin on the one being explained,
// and a dark panel underneath with the selected feature.
export function FeatureTour() {
  const [active, setActive] = useState(0)
  // Each display keeps the last feature that was shown on it while the other one is being explored.
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(3)
  const feature = all[active]
  const onRight = active >= 3

  const choose = (next: number) => {
    setActive(next)
    if (next < 3) setLeft(next)
    else setRight(next)
  }

  return (
    <div className="ft">
      <div className="ft-card">
        <div className="ft-hero">
          <p className="ft-brand"><i aria-hidden="true" />Moldable</p>
          <div className="ft-devices">
            {[0, 1].map((half) => {
              const list = features[half === 0 ? 'grandma' : 'grandkids']
              const shown = half === 0 ? left : right - 3
              const pinned = (half === 1) === onRight
              return (
                <div key={half} className={`ft-dev ft-dev--${half === 0 ? 'left' : 'right'}`}>
                  <div className="ft-dev__frame">
                    <div className="ft-dev__bezel">
                      <div className="ft-dev__screen">
                        {list.map((item, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={item.image} src={item.image} alt={item.alt} className={i === shown ? 'is-on' : ''} aria-hidden={i !== shown} />
                        ))}
                        {pinned ? <span className="ft-pin" style={{ left: `${feature.pin.x}%`, top: `${feature.pin.y}%` }} aria-hidden="true">{active + 1}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="ft-dev__neck" />
                  <div className="ft-dev__base" />
                </div>
              )
            })}
          </div>
        </div>

        <div className="ft-copy">
          <div className="ft-copy__text" key={active} role="status">
            <p className="ft-copy__side">{onRight ? 'Grandkids' : 'Grandma'}</p>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </div>
          <ol className="ft-dots" aria-label="Features">
            {all.map((item, i) => (
              <li key={item.title}>
                <button type="button" className={i === active ? 'is-on' : ''} aria-label={`${i + 1}. ${item.title}`} aria-current={i === active} onClick={() => choose(i)}>{i + 1}</button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
