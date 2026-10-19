import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HomeViewBoard } from '@/boards/HomeView'

type GrandmaTranscriptScreenProps = {
  title: string
  transcript: string
}

type View = 'story' | 'changes' | 'tidy'

// A plain string is fixed text; a pair is [original, changed] and swaps when the pencil reaches it.
type Segment = string | readonly [string, string]

const toolTags = /\[(?:Blend|Weigh|Timer|Temperature|Microwave)\]\s+(?=[A-Z])/g
const toolVerbs = /\[(Blend|Weigh|Timer|Temperature|Microwave)\]/g

const recipeSteps: readonly (readonly Segment[])[] = [
  ['Blend half an onion, garlic, chili, ', ['kencur', 'ginger and lime zest'], ', pepper, and lime leaves into a fine paste with a little texture left.'],
  ['Weigh ', ['500 g', '250 g'], ' of ground beef.'],
  ['Toast the grated coconut in a dry pan for about two minutes, until golden brown.'],
  ['Saute the remaining onion in a little oil, then add the garlic and the spice paste until the oil separates.'],
  ['Add the beef and brown it over high heat without stirring every second.'],
  ['Add one pinch of salt, then mix in the coconut, green beans, and chives.'],
  ['Turn off the heat and squeeze in a little lime juice.'],
  ['Serve warm with white rice for ', ['four', 'two'], '.'],
]

const ROW_MS = 520

export function GrandmaTranscriptScreen({ title, transcript }: GrandmaTranscriptScreenProps) {
  const [view, setView] = useState<View>('story')
  const [rowsDone, setRowsDone] = useState(0)
  const [penRow, setPenRow] = useState<number | null>(null)
  const [penPos, setPenPos] = useState<{ left: number; top: number } | null>(null)
  const storyRef = useRef<HTMLParagraphElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const plainText = transcript.replace(toolTags, '').replace(toolVerbs, '$1')

  const toggle = (next: Exclude<View, 'story'>) => setView((current) => (current === next ? 'story' : next))

  // The story scrolls on its own, like words arriving, until the reader takes over.
  useEffect(() => {
    const el = storyRef.current
    if (view !== 'story' || !el) return
    let frame = 0
    let stopped = false
    const stop = () => { stopped = true }
    const step = () => {
      if (stopped || el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return
      el.scrollTop += 0.7
      frame = window.requestAnimationFrame(step)
    }
    el.addEventListener('wheel', stop, { passive: true })
    el.addEventListener('pointerdown', stop)
    frame = window.requestAnimationFrame(step)
    return () => {
      window.cancelAnimationFrame(frame)
      el.removeEventListener('wheel', stop)
      el.removeEventListener('pointerdown', stop)
    }
  }, [view])

  // Recipe change: a pencil pass down the steps swaps each marked phrase.
  useEffect(() => {
    if (view !== 'changes') {
      setRowsDone(0)
      setPenRow(null)
      return
    }
    const timers: number[] = []
    recipeSteps.forEach((_, row) => {
      timers.push(window.setTimeout(() => { setPenRow(row); setRowsDone(row + 1) }, 600 + row * ROW_MS))
    })
    timers.push(window.setTimeout(() => setPenRow(null), 600 + recipeSteps.length * ROW_MS + 200))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [view])

  useLayoutEffect(() => {
    if (penRow === null) return
    const row = listRef.current?.children[penRow] as HTMLElement | undefined
    if (!row) return
    const change = row.querySelector<HTMLElement>('[data-change]')
    const tipX = change ? change.offsetLeft + change.offsetWidth : row.offsetLeft + Math.min(row.offsetWidth, 240)
    setPenPos({ left: tipX - 88 + 6, top: row.offsetTop + row.offsetHeight / 2 - 60 })
  }, [penRow])

  const toggles = (
    <div className="grandma-transcript-screen__toggle" role="group" aria-label="Story view">
      <button type="button" aria-pressed={view === 'changes'} onClick={() => toggle('changes')}>Recipe change</button>
      <button type="button" aria-pressed={view === 'tidy'} onClick={() => toggle('tidy')}>Tidy</button>
    </div>
  )

  if (view === 'tidy') {
    return (
      <div className="grandma-transcript-screen grandma-transcript-screen--tidy" data-testid="grandma-transcript-screen">
        <HomeViewBoard embedded />
      </div>
    )
  }

  return (
    <div className="grandma-transcript-screen" data-testid="grandma-transcript-screen">
      <section className="grandma-transcript-screen__widget widget-reveal" key={view} aria-label={view === 'changes' ? 'Recipe' : 'Transcript'}>
        <header className="grandma-transcript-screen__header">
          <h1>{title || 'Your story'}</h1>
          {toggles}
        </header>
        {view === 'story' ? (
          <p className="grandma-transcript-screen__text" ref={storyRef}>{plainText}</p>
        ) : (
          <ol className="grandma-transcript-screen__text grandma-transcript-screen__steps" ref={listRef}>
            {recipeSteps.map((segments, row) => (
              <li key={row}>
                {segments.map((segment, index) => (
                  <Fragment key={index}>
                    {typeof segment === 'string' ? segment : (
                      <span data-change className={rowsDone > row ? 'hv-mark' : undefined}>{rowsDone > row ? segment[1] : segment[0]}</span>
                    )}
                  </Fragment>
                ))}
              </li>
            ))}
          </ol>
        )}
        {view === 'changes' && penRow !== null && penPos && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hv-pen" src="/assets/grandma-writer.png" alt="Moldable mascot writing in the recipe" style={{ left: penPos.left, top: penPos.top }} />
        )}
      </section>
    </div>
  )
}
