import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecipeBook } from './RecipeBook'

describe('RecipeBook writing screen', () => {
  it('presents the recorded story across two plain writing panels with a traveling character', () => {
    const view = render(<RecipeBook />)

    expect(screen.getByRole('article', { name: 'Balinese minced pork story' })).toHaveClass('story-book')
    expect(view.container.querySelector('.story-book__writing-stage')).toBeInTheDocument()
    expect(screen.getByLabelText('Character panel')).toHaveClass('story-book__panel--character')
    expect(screen.getByLabelText('Written story panel')).toHaveClass('story-book__panel--story')
    expect(screen.getByLabelText('Character panel').querySelectorAll('.story-book__written-line')).toHaveLength(2)
    expect(screen.getByLabelText('Written story panel').querySelectorAll('.story-book__written-line')).toHaveLength(2)
    expect(within(screen.getByLabelText('Character panel')).getByLabelText(/First, toast the coconut/)).toBeInTheDocument()
    expect(within(screen.getByLabelText('Written story panel')).getByLabelText(/Then in goes the pork/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Moldable character writing with a silver pencil' })).toHaveClass(
      'story-book__traveler',
    )
    expect(screen.getByRole('img', { name: 'Moldable character writing with a silver pencil' })).toHaveAttribute(
      'src',
      '/assets/mascot-writer-blue.png',
    )
    expect(screen.queryByRole('heading', { name: 'Soto Ayam' })).not.toBeInTheDocument()
    expect(screen.queryByText("Grandma's story")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tidy story' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    const firstLine = screen.getByLabelText(/First, toast the coconut/)
    expect(firstLine).toHaveClass('story-book__written-line')
    expect(within(firstLine).getAllByTestId('written-word').length).toBeGreaterThan(20)
    expect(within(firstLine).getByText('First,')).toHaveClass('story-book__word')
  })

  it('copies the current page link and confirms the action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    window.history.replaceState({}, '', '/grandma')

    const view = render(<RecipeBook />)
    fireEvent.click(within(view.container).getByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(await within(view.container).findByRole('button', { name: 'Link copied' })).toBeInTheDocument()
  })

  it('tidies the draft into a concise recipe without leaving the page', () => {
    const view = render(<RecipeBook />)

    fireEvent.click(within(view.container).getByRole('button', { name: 'Tidy story' }))

    expect(within(view.container).getByRole('button', { name: 'Restore full story' })).toBeInTheDocument()
    expect(within(view.container).getByRole('heading', { name: 'Balinese Minced Pork (Lawar Bali)' })).toBeInTheDocument()
    expect(within(view.container).getByRole('heading', { name: 'Ingredients' })).toBeInTheDocument()
    expect(within(view.container).getByRole('heading', { name: 'Method' })).toBeInTheDocument()
    expect(within(view.container).getAllByRole('listitem')).toHaveLength(12)
    expect(within(view.container).getByLabelText('500g ground pork')).toBeInTheDocument()
    expect(within(view.container).getByLabelText(/Blend half the onions/)).toBeInTheDocument()
    expect(view.container.querySelectorAll('.story-book__grandma-quote')).toHaveLength(2)
    expect(within(view.container).queryByLabelText(/First, toast the coconut/)).not.toBeInTheDocument()
  })
})
