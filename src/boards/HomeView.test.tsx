import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { HomeViewBoard } from './HomeView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const adjust = () => screen.getByRole('button', { name: 'Adjust recipe by voice' })
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const amountOf = (name: string) => screen.getByText(name).closest('li')?.querySelector('.hv-amt')

describe('HomeViewBoard scripted Adjust flow', () => {
  beforeEach(() => vi.useFakeTimers())

  it('listens for five seconds without a microphone, then halves the servings with the pencil', () => {
    render(<HomeViewBoard />)
    expect(screen.getByText('Serves', { exact: false })).toHaveTextContent('Serves 4')

    const glow = () => document.querySelector('.sg')
    const notice = () => screen.getByRole('status')
    expect(glow()).toHaveAttribute('data-state', 'idle')

    fireEvent.click(adjust())
    expect(adjust()).toHaveTextContent('Listening…')
    expect(glow()).toHaveAttribute('data-state', 'listening')
    expect(notice()).toHaveTextContent('Listening…')
    advance(1500)
    expect(screen.getByText('“Actually, I just want two servings.”')).toBeInTheDocument()
    expect(glow()).toHaveAttribute('data-state', 'hearing')
    advance(3600)
    expect(adjust()).toHaveTextContent('Thinking…')
    expect(glow()).toHaveAttribute('data-state', 'thinking')
    expect(notice()).toHaveTextContent('Thinking…')

    advance(800)
    expect(adjust()).toHaveTextContent('Writing…')
    expect(glow()).toHaveAttribute('data-state', 'done')
    expect(notice()).toHaveTextContent('Halved everything for 2 servings.')
    expect(screen.getByText('Serves', { exact: false })).toHaveTextContent('Serves 2')
    // "Done" holds for a moment before the rows are marked.
    expect(screen.queryByRole('img', { name: /Moldable mascot writing/ })).not.toBeInTheDocument()

    advance(1200)
    expect(screen.getByRole('img', { name: 'Moldable mascot writing in the ingredient list' })).toBeInTheDocument()
    // The island closes once the rows are being marked.
    expect(document.querySelector('.vn')).toHaveAttribute('data-state', 'idle')
    advance(100)
    expect(glow()).toHaveAttribute('data-state', 'idle')

    advance(5200)
    expect(adjust()).toHaveTextContent('Adjust')
    expect(document.querySelector('.vn')).toHaveAttribute('data-state', 'idle')
    expect(document.querySelector('.vn')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('img', { name: /Moldable mascot writing/ })).not.toBeInTheDocument()
    expect(amountOf('Pork')).toHaveTextContent('250 g')
    expect(amountOf('Coconut')).toHaveTextContent('40 g')
  })

  it('swaps kencur for ginger and lime zest on the second Adjust', () => {
    render(<HomeViewBoard />)
    fireEvent.click(adjust())
    advance(5800 + 1200 + 5300)
    fireEvent.click(adjust())
    advance(1500)
    expect(screen.getByText('“What can I use instead of kencur?”')).toBeInTheDocument()

    advance(4300 + 5000)
    expect(screen.getByText('Ginger + lime zest')).toBeInTheDocument()
    expect(screen.queryByText('Kencur')).not.toBeInTheDocument()
  })

  it('with the clay look, has no clay at all until voice starts, and none after it ends', () => {
    render(<HomeViewBoard clay />)
    const talk = screen.getByRole('button', { name: 'Talk to Moldable' })
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
    expect(document.querySelector('.hv-clay-orb')).not.toBeInTheDocument()
    expect(document.querySelector('.vn__clay')).toBeEmptyDOMElement()

    fireEvent.click(talk)
    const clay = document.querySelector('.voice-clay')
    expect(clay).toBeInTheDocument()
    expect(clay).toHaveAttribute('aria-hidden', 'true')

    // Through the flow the same clay stays (island → rows), then it fades where it is and is removed.
    advance(5800 + 1200 + 2000)
    expect(document.querySelector('.voice-clay')).toBe(clay)
    advance(3300)
    expect(document.querySelector('.voice-clay')).toHaveClass('is-fade')
    advance(400)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
  })

  it('with the clay look, tapping away cancels: the clay leaves at once with no done step', () => {
    render(<HomeViewBoard clay />)
    fireEvent.click(screen.getByRole('button', { name: 'Talk to Moldable' }))
    advance(2000)
    fireEvent.pointerDown(screen.getByText('Ingredients'))
    expect(document.querySelector('.sg')).toHaveAttribute('data-state', 'idle')
    expect(document.querySelector('.vn')).toHaveAttribute('data-state', 'idle')
    expect(document.querySelector('.voice-clay')).toBeInTheDocument()
    advance(320)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
    // No done step, and the recipe is unchanged.
    expect(screen.getByText('Serves', { exact: false })).toHaveTextContent('Serves 4')
  })

  it('with the clay look and no speech, gives up after about 6 s', () => {
    render(<HomeViewBoard clay noSpeech />)
    fireEvent.click(screen.getByRole('button', { name: 'Talk to Moldable' }))
    advance(5900)
    expect(document.querySelector('.voice-clay')).toBeInTheDocument()
    expect(document.querySelector('.vn')).toHaveAttribute('data-state', 'listening')
    advance(200)
    expect(document.querySelector('.vn')).toHaveAttribute('data-state', 'idle')
    advance(320)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
  })

  it('with the clay look, voice coming back while the clay leaves turns it round instead of popping in again', () => {
    render(<HomeViewBoard clay />)
    const talk = screen.getByRole('button', { name: 'Talk to Moldable' })
    fireEvent.click(talk)
    advance(1000)
    const clay = document.querySelector('.voice-clay')
    fireEvent.pointerDown(screen.getByText('Ingredients'))
    advance(120)
    fireEvent.click(talk)
    advance(400)
    expect(document.querySelector('.voice-clay')).toBe(clay)
    expect(document.querySelector('.vn')).toHaveAttribute('data-state', 'listening')
  })

  it('keeps visible family ingredient wording aligned with the grounding context', () => {
    render(<HomeViewBoard />)

    for (const ingredient of GRANDKIDS_RECIPE_CONTEXT.ingredients) {
      const row = screen.getByText(ingredient.name).closest('li') as HTMLElement
      expect(row).toHaveAttribute('data-family-amount', ingredient.familyAmount)
    }
  })
})
