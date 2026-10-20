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
    expect(screen.getByRole('img', { name: 'Moldable mascot writing in the ingredient list' })).toBeInTheDocument()
    expect(screen.getByText('Serves', { exact: false })).toHaveTextContent('Serves 2')

    advance(1300)
    expect(glow()).toHaveAttribute('data-state', 'idle')
    expect(notice()).toHaveAttribute('data-state', 'done')

    advance(4700)
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
    advance(5800 + 6000)
    fireEvent.click(adjust())
    advance(1500)
    expect(screen.getByText('“What can I use instead of kencur?”')).toBeInTheDocument()

    advance(4300 + 5000)
    expect(screen.getByText('Ginger + lime zest')).toBeInTheDocument()
    expect(screen.queryByText('Kencur')).not.toBeInTheDocument()
  })

  it('keeps visible family ingredient wording aligned with the grounding context', () => {
    render(<HomeViewBoard />)

    for (const ingredient of GRANDKIDS_RECIPE_CONTEXT.ingredients) {
      const row = screen.getByText(ingredient.name).closest('li') as HTMLElement
      expect(row).toHaveAttribute('data-family-amount', ingredient.familyAmount)
    }
  })
})
