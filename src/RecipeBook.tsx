'use client'

import { useEffect, useState } from 'react'
import { Check, LinkSimple, MagicWand } from '@phosphor-icons/react'

const fullStory = [
  'First, toast the coconut until properly golden. It should smell warm and nutty, like the edge of a coconut biscuit. While it cools, pound half the onions and garlic with sambal trassi, kencur, pepper and kaffir lime leaves. The paste should smell sharp, citrusy and a little funky — that means it has enough life.',
  'Warm a little oil and fry the remaining onions and garlic, then add the spice paste. When the raw smell turns sweet and the lime leaf perfume reaches you, it is ready. I used to cook this while Nev sat nearby. One day he arrived very quiet after shaving off one eyebrow. He thought I would not notice. A grandmother always notices; I nearly burned the onions laughing.',
  'Then in goes the pork — all 500 grams — with the toasted coconut. Break it apart so every crumb catches the spices. The pan will smell rich, smoky and bright. Cook until no pink remains and the edges begin to brown. Taste it: the pork should be juicy and savoury, with warm spice, gentle chilli and crisp little flecks of coconut.',
  'Turn off the heat before stirring through lime juice and chopped chives. The lime should wake everything up, while the chives taste fresh against the rich pork. Add salt and pepper until you immediately want another bite. Spoon it over hot white pandan rice. To me, lelawar tastes fragrant, bright and a little fiery — a noisy family kitchen in one bowl.',
]

const tidyIngredients = [
  '500g ground pork',
  '6 tbsp grated coconut, toasted',
  '5 tbsp chopped onions + 5 garlic cloves',
  '1 tsp sambal trassi',
  '1/2 tsp kencur',
  '4 kaffir lime leaves, finely sliced',
  'Lime juice, salt, black pepper + chopped chives',
]

const tidyMethod = [
  'Blend half the onions and garlic with the sambal, kencur, pepper and lime leaves into a fine paste.',
  'Toast the coconut in a dry pan until evenly golden.',
  'Sauté the remaining onions and garlic, then cook the spice paste until fragrant.',
  'Add the pork and toasted coconut. Break it apart and cook until no pink remains and the edges brown.',
  'Turn off the heat, stir through lime juice and chives, then serve over hot white pandan rice.',
]

function WrittenLine({
  text,
  lineIndex,
  writingTime,
  heading = false,
  as = 'p',
  className = '',
}: {
  text: string
  lineIndex: number
  writingTime: number
  heading?: boolean
  as?: 'p' | 'h3' | 'li' | 'blockquote'
  className?: string
}) {
  const Tag = heading ? 'h2' : as
  const words = text.split(' ')

  return (
    <Tag className={`story-book__written-line${className ? ` ${className}` : ''}`} aria-label={text}>
      {words.map((word, wordIndex) => (
        <span
          className={`story-book__word${writingTime >= (0.47 + lineIndex * 1.83 + (wordIndex / words.length) * 1.35) * 1000 ? ' story-book__word--visible' : ''}`}
          data-testid="written-word"
          aria-hidden="true"
          key={`${word}-${wordIndex}`}
        >
          {word}{wordIndex < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}

function TidyRecipe({ writingTime }: { writingTime: number }) {
  return (
    <>
      <div className="story-book__panel story-book__panel--character" aria-label="Character panel">
        <div className="story-book__tidy-page story-book__tidy-page--left">
          <header className="story-book__tidy-intro">
            <WrittenLine text="Balinese Minced Pork (Lelawar Bali)" lineIndex={0} writingTime={writingTime} heading className="story-book__tidy-title" />
            <WrittenLine
              text="A traditional Balinese dish of warmly spiced pork, toasted coconut and fragrant local herbs."
              lineIndex={0}
              writingTime={writingTime}
              className="story-book__tidy-summary"
            />
          </header>
          <section className="story-book__tidy-section" aria-labelledby="ingredients-heading">
            <h3 id="ingredients-heading">Ingredients</h3>
            <ul className="story-book__ingredients">
              {tidyIngredients.map((ingredient) => (
                <WrittenLine text={ingredient} lineIndex={1} writingTime={writingTime} as="li" key={ingredient} />
              ))}
            </ul>
          </section>
          <WrittenLine
            text="“Toast the coconut until it smells like the edge of a biscuit.” — Grandma"
            lineIndex={1}
            writingTime={writingTime}
            as="blockquote"
            className="story-book__grandma-quote"
          />
        </div>
      </div>
      <div className="story-book__panel story-book__panel--story" aria-label="Written story panel">
        <div className="story-book__tidy-page story-book__tidy-page--right">
          <section className="story-book__tidy-section" aria-labelledby="method-heading">
            <h3 id="method-heading">Method</h3>
            <ol className="story-book__method">
              {tidyMethod.map((step, index) => (
                <WrittenLine text={step} lineIndex={index < 3 ? 2 : 3} writingTime={writingTime} as="li" key={step} />
              ))}
            </ol>
          </section>
          <WrittenLine
            text="“Nev once shaved off one eyebrow while I made this. He thought I would not notice. A grandmother always notices.” — Grandma"
            lineIndex={3}
            writingTime={writingTime}
            as="blockquote"
            className="story-book__grandma-quote"
          />
        </div>
      </div>
    </>
  )
}

export function RecipeBook() {
  const [isTidy, setIsTidy] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [writingTime, setWritingTime] = useState(0)
  const story = fullStory

  useEffect(() => {
    if (window.location.pathname !== '/grandma/story') {
      window.history.replaceState({}, '', '/grandma/story')
    }
  }, [])

  useEffect(() => {
    setWritingTime(0)
    const timer = window.setInterval(() => {
      setWritingTime((current) => {
        if (current >= 8200) {
          window.clearInterval(timer)
          return 8200
        }
        return current + 40
      })
    }, 40)

    return () => window.clearInterval(timer)
  }, [isTidy])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <article className={`story-book${isTidy ? ' story-book--tidy' : ''}`} aria-label="Balinese minced pork story">
      <div className="story-book__actions" aria-label="Story actions">
        <button
          className={`story-book__action${isTidy ? ' story-book__action--active' : ''}`}
          type="button"
          aria-label={isTidy ? 'Restore full story' : 'Tidy story'}
          aria-pressed={isTidy}
          onClick={() => setIsTidy((current) => !current)}
        >
          <MagicWand size={18} weight="fill" aria-hidden="true" />
          {isTidy ? 'Untidy' : 'Tidy'}
        </button>
        <button
          className="story-book__action"
          type="button"
          aria-label={copyState === 'copied' ? 'Link copied' : 'Copy link'}
          onClick={copyLink}
        >
          {copyState === 'copied' ? <Check size={18} weight="bold" aria-hidden="true" /> : <LinkSimple size={18} weight="bold" aria-hidden="true" />}
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <section className="story-book__writing-stage" aria-label="Story being written" aria-live="polite" key={isTidy ? 'tidy' : 'full'}>
        {isTidy ? <TidyRecipe writingTime={writingTime} /> : <><div className="story-book__panel story-book__panel--character" aria-label="Character panel">
          <div className="story-book__written-page">
            {story.slice(0, 2).map((paragraph, index) => (
              <WrittenLine text={paragraph} lineIndex={index} writingTime={writingTime} key={paragraph} />
            ))}
          </div>
        </div>
        <div className="story-book__panel story-book__panel--story" aria-label="Written story panel">
          <div className="story-book__written-page">
            {story.slice(2).map((paragraph, index) => (
              <WrittenLine text={paragraph} lineIndex={index + 2} writingTime={writingTime} key={paragraph} />
            ))}
          </div>
        </div></>}
        <img
          className="story-book__traveler"
          src="/assets/grandma-writer.png"
          alt="Moldable character writing with a silver pencil"
          width="1100"
          height="950"
        />
      </section>
      {copyState === 'error' ? <p className="story-book__status" role="status">Couldn’t copy the link. Try again.</p> : null}
    </article>
  )
}
