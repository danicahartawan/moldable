'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, LinkSimple, MagicWand } from '@phosphor-icons/react'

const emptyTranscript = 'No transcript was captured in this browser.'

function paragraphsFrom(transcript: string, count: number) {
  const clean = transcript.trim() || emptyTranscript
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ?? [clean]
  const groups = Array.from({ length: Math.min(count, sentences.length) }, () => [] as string[])
  sentences.forEach((sentence, index) => groups[index % groups.length].push(sentence))
  return groups.map((group) => group.join(' '))
}

function WrittenLine({ text, index, writingTime, heading = false }: { text: string; index: number; writingTime: number; heading?: boolean }) {
  const Tag = heading ? 'h1' : 'p'
  const words = text.split(/\s+/)
  return (
    <Tag className="story-book__written-line" aria-label={text}>
      {words.map((word, wordIndex) => (
        <span
          className={`story-book__word${writingTime >= (470 + index * 1830 + (wordIndex / words.length) * 1350) ? ' story-book__word--visible' : ''}`}
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

export function GrandmaWritingScreen({ title, transcript }: { title: string; transcript: string }) {
  const [isTidy, setIsTidy] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [writingTime, setWritingTime] = useState(0)
  const story = useMemo(() => paragraphsFrom(transcript, isTidy ? 3 : 4), [isTidy, transcript])
  const storyTitle = title || 'Grandma’s Kitchen Story'

  useEffect(() => {
    window.sessionStorage.setItem('grandma-story', JSON.stringify({ title: storyTitle, transcript }))
    if (window.location.pathname !== '/grandma/story') window.history.replaceState({}, '', '/grandma/story')
  }, [storyTitle, transcript])

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

  const splitAt = Math.ceil(story.length / 2)
  return (
    <article className={`story-book${isTidy ? ' story-book--tidy' : ''}`} aria-label="Grandma writing screen">
      <div className="story-book__actions" aria-label="Story actions">
        <button className="story-book__action" type="button" aria-label={isTidy ? 'Restore full story' : 'Tidy story'} aria-pressed={isTidy} onClick={() => setIsTidy((value) => !value)}>
          <MagicWand size={18} weight="fill" aria-hidden="true" />{isTidy ? 'Untidy' : 'Tidy'}
        </button>
        <button className="story-book__action" type="button" aria-label={copyState === 'copied' ? 'Link copied' : 'Copy link'} onClick={copyLink}>
          {copyState === 'copied' ? <Check size={18} weight="bold" aria-hidden="true" /> : <LinkSimple size={18} weight="bold" aria-hidden="true" />}
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <section className="story-book__writing-stage" aria-label="Story being written" aria-live="polite" key={isTidy ? 'tidy' : 'full'}>
        <div className="story-book__panel story-book__panel--character" aria-label="Character panel">
          <div className="story-book__written-page">
            <WrittenLine text={storyTitle} index={0} writingTime={writingTime} heading />
            {story.slice(0, splitAt).map((paragraph, index) => <WrittenLine text={paragraph} index={index + 1} writingTime={writingTime} key={paragraph} />)}
          </div>
        </div>
        <div className="story-book__panel story-book__panel--story" aria-label="Written story panel">
          <div className="story-book__written-page">
            {story.slice(splitAt).map((paragraph, index) => <WrittenLine text={paragraph} index={index + splitAt + 1} writingTime={writingTime} key={paragraph} />)}
          </div>
        </div>
        <img className="story-book__traveler" src="/assets/mascot-writer-blue.png" alt="Moldable character writing with a silver pencil" width="1100" height="950" />
      </section>
      {copyState === 'error' ? <p className="story-book__status" role="status">Couldn’t copy the link. Try again.</p> : null}
    </article>
  )
}

export function StoredGrandmaWritingScreen() {
  const [story, setStory] = useState({ title: '', transcript: '' })
  useEffect(() => {
    const stored = window.sessionStorage.getItem('grandma-story')
    if (stored) setStory(JSON.parse(stored) as { title: string; transcript: string })
  }, [])
  return <GrandmaWritingScreen {...story} />
}
