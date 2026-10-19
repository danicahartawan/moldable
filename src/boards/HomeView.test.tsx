import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrandkidsAnswer } from '@/app/api/grandkids/ask/route'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { HomeViewBoard } from './HomeView'

const voice = vi.hoisted(() => ({
  status: 'idle' as 'idle' | 'requesting' | 'listening' | 'thinking' | 'speaking' | 'error',
  answer: null as string | null,
  target: null as GrandkidsAnswer | null,
  errorMessage: null as string | null,
  start: vi.fn(),
  cancel: vi.fn(),
  onTarget: null as ((answer: GrandkidsAnswer) => void) | null,
}))

vi.mock('@/grandkids/useGrandkidsVoiceGuide', () => ({
  useGrandkidsVoiceGuide: (options: { onTarget: (answer: GrandkidsAnswer) => void }) => {
    voice.onTarget = options.onTarget
    return voice
  },
}))

afterEach(cleanup)

describe('HomeViewBoard AI voice guide', () => {
  beforeEach(() => {
    voice.status = 'idle'
    voice.answer = null
    voice.target = null
    voice.errorMessage = null
    voice.start.mockReset()
    voice.cancel.mockReset()
    voice.onTarget = null
  })

  it('starts Adjust and shows sparse listening and thinking states without a transcript', () => {
    const { rerender } = render(<HomeViewBoard />)
    fireEvent.click(screen.getByRole('button', { name: 'Adjust recipe by voice' }))
    expect(voice.start).toHaveBeenCalledOnce()

    voice.status = 'listening'
    rerender(<HomeViewBoard />)
    expect(screen.getByRole('button', { name: 'Adjust recipe by voice' })).toHaveTextContent('Listening…')
    voice.status = 'thinking'
    rerender(<HomeViewBoard />)
    expect(screen.getByRole('button', { name: 'Adjust recipe by voice' })).toHaveTextContent('Thinking…')
    expect(screen.queryByText('how much coconut')).not.toBeInTheDocument()
  })

  it('targets an ingredient and moves the pencil beside its row', () => {
    render(<HomeViewBoard />)

    act(() => voice.onTarget?.({ answer: 'Oma says segenggam—one handful.', target: 'ingredients', ingredient: 'coconut' }))

    const row = screen.getByText('Coconut').closest('li') as HTMLElement
    expect(row).toHaveClass('is-voice-target')
    expect(screen.getByRole('img', { name: 'Moldable mascot showing Coconut' })).toBeInTheDocument()
  })

  it('opens and marks a returned recipe step', () => {
    render(<HomeViewBoard />)

    act(() => voice.onTarget?.({ answer: 'Toast the coconut first.', target: 'step', step: 1 }))

    expect(screen.getByRole('button', { name: 'Show the overview' })).toBeInTheDocument()
    const step = screen.getByText('Toast the coconut in a dry pan until golden').closest('li') as HTMLElement
    expect(step).toHaveClass('is-voice-target')
  })

  it('selects tools, time, and overview targets', () => {
    render(<HomeViewBoard />)
    const swap = screen.getByRole('button', { name: /Cooking time|Tools:/ })

    act(() => voice.onTarget?.({ answer: 'Use the dry pan.', target: 'tools' }))
    expect(swap).toHaveTextContent('Dry pan')
    act(() => voice.onTarget?.({ answer: 'It takes 40 minutes.', target: 'time' }))
    expect(swap).toHaveTextContent('40')
    act(() => voice.onTarget?.({ answer: 'Here is the overview.', target: 'overview' }))
    expect(screen.getByRole('heading', { name: 'Lelawar Bali' })).toBeInTheDocument()
  })

  it('keeps the spoken answer in the live region without adding visible answer chrome', () => {
    voice.status = 'speaking'
    voice.answer = 'Oma says 2 ruas.'
    voice.target = { answer: voice.answer, target: 'ingredients', ingredient: 'kencur' }
    render(<HomeViewBoard />)

    expect(screen.getByRole('status')).toHaveTextContent('Oma says 2 ruas. Ingredients: Kencur.')
    expect(screen.getByRole('button', { name: 'Adjust recipe by voice' })).toHaveTextContent('Speaking…')
    expect(screen.queryByText('Oma says 2 ruas.', { selector: ':not(.hv-sr-only)' })).not.toBeInTheDocument()
  })

  it('clears transient pencil emphasis after speech finishes', () => {
    voice.status = 'speaking'
    voice.answer = 'Oma says segenggam.'
    voice.target = { answer: voice.answer, target: 'ingredients', ingredient: 'coconut' }
    const { rerender } = render(<HomeViewBoard />)
    act(() => voice.onTarget?.(voice.target as GrandkidsAnswer))
    expect(screen.getByText('Coconut').closest('li')).toHaveClass('is-voice-target')

    voice.status = 'idle'
    rerender(<HomeViewBoard />)

    expect(screen.getByText('Coconut').closest('li')).not.toHaveClass('is-voice-target')
  })

  it('cancels an active session before Adjust starts another', () => {
    voice.status = 'listening'
    render(<HomeViewBoard />)

    fireEvent.click(screen.getByRole('button', { name: 'Adjust recipe by voice' }))

    expect(voice.cancel).toHaveBeenCalledOnce()
    expect(voice.start).toHaveBeenCalledOnce()
    expect(voice.cancel.mock.invocationCallOrder[0]).toBeLessThan(voice.start.mock.invocationCallOrder[0])
  })

  it('keeps microphone errors inside the square and leaves Adjust usable', () => {
    voice.status = 'error'
    voice.errorMessage = 'I can’t use the microphone. Try again or check permission.'
    render(<HomeViewBoard />)

    const square = screen.getByTestId('grandkids-square')
    expect(within(square).getByText(voice.errorMessage)).toBeInTheDocument()
    expect(within(square).getByRole('button', { name: 'Adjust recipe by voice' })).toBeEnabled()
  })

  it('keeps visible family ingredient wording aligned with the grounding context', () => {
    render(<HomeViewBoard />)

    for (const ingredient of GRANDKIDS_RECIPE_CONTEXT.ingredients) {
      const row = screen.getByText(ingredient.name).closest('li') as HTMLElement
      expect(row).toHaveAttribute('data-family-amount', ingredient.familyAmount)
    }
  })
})
