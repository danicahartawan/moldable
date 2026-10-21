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
    expect(screen.getByRole('heading', { name: 'Lelawar Bali' })).toBeVisible()

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

  it('opens the cooking step from the grandkids view, with Oma’s words behind the orb', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).getByRole('button', { name: 'Step 1' })).toHaveAttribute('aria-current', 'step')
    expect(board).toHaveTextContent('half the onions, garlic, sambal')
    fireEvent.click(within(board).getByRole('button', { name: 'Show Oma Lien’s words' }))
    expect(board).toHaveTextContent('Blend the aromatics first, little one.')
  })

  it('shows what the step uses only after Ingredients is pressed', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(within(board).getByRole('button', { name: 'Ingredients' }))
    const uses = within(board).getByRole('dialog', { name: 'Ingredients · Step 1' })
    for (const name of ['Onions', 'Garlic', 'Sambal', 'Kencur', 'Pepper', 'Lime leaves']) {
      expect(within(uses).getByText(name)).toBeInTheDocument()
    }
  })

  it('moves through the steps with the step bars, keeping one screen', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))
    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement

    fireEvent.click(within(board).getByRole('button', { name: 'Step 8' }))
    expect(document.querySelector('.kitchen__grandkids-view--in')).toBe(board)
    expect(within(board).getByRole('button', { name: 'Step 8' })).toHaveAttribute('aria-current', 'step')
    expect(screen.queryByRole('button', { name: 'Next instruction' })).not.toBeInTheDocument()
  })
})
