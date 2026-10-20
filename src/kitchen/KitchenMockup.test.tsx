import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitchenMockup } from './KitchenMockup'

vi.mock('./buildScene', () => ({ buildScene: () => () => {} }))

afterEach(cleanup)

describe('KitchenMockup perspectives', () => {
  it('swipes from Grandma recording to the Grandkids recipe and back', () => {
    render(<KitchenMockup />)
    const stage = screen.getByTestId('kitchen-perspective-stage')

    expect(stage).toHaveAttribute('data-perspective', 'grandma')
    expect(screen.getByRole('button', { name: 'Grandma' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Grandkids' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(stage, { clientX: 520 })
    fireEvent.pointerUp(stage, { clientX: 120 })

    expect(stage).toHaveAttribute('data-perspective', 'grandkids')
    expect(screen.getByRole('button', { name: 'Grandkids' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Lawar Bali' })).toBeVisible()

    fireEvent.pointerDown(stage, { clientX: 120 })
    fireEvent.pointerUp(stage, { clientX: 520 })

    expect(stage).toHaveAttribute('data-perspective', 'grandma')
    expect(screen.getByRole('button', { name: 'Record' })).toBeVisible()
  })

  it('allows the perspective labels to switch without swiping', () => {
    render(<KitchenMockup />)

    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    expect(screen.getByTestId('kitchen-perspective-stage')).toHaveAttribute('data-perspective', 'grandkids')

    fireEvent.click(screen.getByRole('button', { name: 'Grandma' }))
    expect(screen.getByTestId('kitchen-perspective-stage')).toHaveAttribute('data-perspective', 'grandma')
  })

  it('opens Fred’s cooking step with Grandma’s cue from the grandkids view', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).getByRole('button', { name: /Step 1/ })).toBeInTheDocument()
    expect(board).toHaveTextContent('half the onions, garlic, sambal')
    expect(within(board).getByLabelText('Blend the aromatics first, little one. Don’t make it watery; you should still see a little texture.')).toBeInTheDocument()
  })

  it('shows what the step uses only after Ingredients is pressed', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).queryByRole('region', { name: 'Ingredients for this step' })).not.toBeInTheDocument()
    fireEvent.click(within(board).getByRole('button', { name: 'Ingredients' }))
    const uses = within(board).getByRole('region', { name: 'Ingredients for this step' })
    for (const name of ['Onions', 'Garlic', 'Sambal', 'Kencur', 'Pepper', 'Lime leaves']) {
      expect(within(uses).getByText(name)).toBeInTheDocument()
    }
  })

  it('advances through the steps from the right edge and the step number', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))
    const board = () => document.querySelector('.kitchen__grandkids-view--in') as HTMLElement

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    expect(board()).toHaveTextContent('Toast')
    expect(board()).toHaveTextContent('the coconut in a dry pan until it turns golden.')

    fireEvent.click(within(board()).getByRole('button', { name: /Step 2/ }))
    expect(board()).toHaveTextContent('Fry')

    for (let i = 3; i < 8; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    expect(board()).toHaveTextContent('Serve')
    expect(screen.queryByRole('button', { name: 'Next instruction' })).not.toBeInTheDocument()
  })
})
