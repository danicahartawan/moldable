import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('opens the borderless step card with the mascot from the grandkids view', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const instruction = screen.getByRole('region', { name: 'Recipe instruction step 1' })
    expect(within(instruction).getByText('Step 1')).toBeInTheDocument()
    expect(within(instruction).getByRole('img', { name: 'Moldable mascot' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Step 1' })).not.toBeInTheDocument()
    expect(within(instruction).getByText('Blender')).toHaveClass('instruction-chip')
    expect(within(instruction).getByText('Blend half the onions, garlic, sambal, kencur, pepper, and lime leaves into a fine paste.')).toBeInTheDocument()
    expect(within(instruction).queryByRole('button', { name: 'Back to recipe' })).not.toBeInTheDocument()
  })

  it('keeps the step ingredients collapsed until the lower-left control is pressed', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const ingredients = screen.getByRole('group', { name: 'Ingredients used in step 1' })
    expect(ingredients).toHaveAttribute('data-open', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Show step ingredients' }))

    expect(ingredients).toHaveAttribute('data-open', 'true')
    for (const name of ['Onion', 'Garlic', 'Sambal', 'Pepper', 'Lime leaves']) {
      expect(within(ingredients).getByLabelText(name)).toBeInTheDocument()
    }
  })

  it('advances through the remaining instruction cards from the invisible right edge', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    expect(screen.getByRole('region', { name: 'Recipe instruction step 2' })).toHaveTextContent('Toast the coconut flour in a dry pan until golden brown.')

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    expect(screen.getByRole('region', { name: 'Recipe instruction step 3' })).toHaveTextContent('Sauté the remaining onions, garlic, and the spice paste in a little oil until fragrant.')
    expect(screen.getByRole('region', { name: 'Recipe instruction step 3' })).toHaveTextContent('Stir in lime juice and fresh chives.')

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    expect(screen.getByRole('region', { name: 'Recipe instruction step 4' })).toHaveTextContent('Serve over white pandan rice.')
    expect(screen.queryByRole('button', { name: 'Next instruction' })).not.toBeInTheDocument()
  })

  it('uses chips only for cooking tools and keeps verbs in the instruction copy', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    let instruction = screen.getByRole('region', { name: 'Recipe instruction step 1' })
    expect(within(instruction).getByText('Blender')).toHaveClass('instruction-chip')
    expect(instruction).toHaveTextContent('Blend half the onions')

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    instruction = screen.getByRole('region', { name: 'Recipe instruction step 2' })
    expect(within(instruction).getByText('Dry pan')).toHaveClass('instruction-chip')
    expect(instruction).toHaveTextContent('Toast the coconut flour')

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    instruction = screen.getByRole('region', { name: 'Recipe instruction step 3' })
    expect(within(instruction).getByText('Sauté pan')).toHaveClass('instruction-chip')
    expect(instruction).toHaveTextContent('Sauté the remaining onions')

    fireEvent.click(screen.getByRole('button', { name: 'Next instruction' }))
    instruction = screen.getByRole('region', { name: 'Recipe instruction step 4' })
    expect(instruction.querySelector('.instruction-chip')).not.toBeInTheDocument()
    expect(within(instruction).queryByText('Rice pot')).not.toBeInTheDocument()
    expect(instruction).toHaveTextContent('Serve over white pandan rice.')
  })
})
