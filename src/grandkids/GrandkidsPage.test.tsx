import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GrandkidsPage } from './GrandkidsPage'

afterEach(cleanup)

describe('GrandkidsPage', () => {
  it('opens Lawar Bali from the recipe fridge', () => {
    render(<GrandkidsPage />)

    expect(screen.getByTestId('grandkids-screen')).toHaveClass('grandkids-screen')
    fireEvent.click(screen.getByRole('button', { name: /open lawar bali/i }))

    expect(screen.getByRole('heading', { name: 'Lawar Bali' })).toBeInTheDocument()
    expect(screen.getByLabelText('15 minutes')).toBeInTheDocument()
  })

  it('keeps the toolbar collapsed until it is called', () => {
    render(<GrandkidsPage />)

    const toolbar = screen.getByRole('toolbar', { name: /recipe tools/i })
    expect(toolbar).toHaveAttribute('data-open', 'false')

    fireEvent.click(screen.getByRole('button', { name: /show recipe tools/i }))
    expect(toolbar).toHaveAttribute('data-open', 'true')
  })

  it('starts the recipe and shows the first spoken step', () => {
    render(<GrandkidsPage />)
    fireEvent.click(screen.getByRole('button', { name: /open lawar bali/i }))
    fireEvent.click(screen.getByRole('button', { name: /wave or tap to start/i }))

    expect(screen.getByText(/first, put the beef in your biggest bowl/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /cooking walkthrough/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /blend/i })).toBeInTheDocument()
  })

  it('moves through the four cooking cards', () => {
    render(<GrandkidsPage />)
    fireEvent.click(screen.getByRole('button', { name: /open lawar bali/i }))
    fireEvent.click(screen.getByRole('button', { name: /wave or tap to start/i }))

    fireEvent.click(screen.getByRole('button', { name: /next step/i }))
    expect(screen.getByRole('heading', { name: /toast/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next step/i }))
    expect(screen.getByRole('heading', { name: /sauté/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /next step/i }))
    expect(screen.getByRole('heading', { name: /serve/i })).toBeInTheDocument()
  })

  it('keeps recipe descriptions out of the visual interface', () => {
    render(<GrandkidsPage />)

    expect(screen.queryByText(/warm, bright, crunchy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/pick a note/i)).not.toBeInTheDocument()
  })

  it('moves between cooking widgets with the section controls', () => {
    render(<GrandkidsPage />)
    fireEvent.click(screen.getByRole('button', { name: /open lawar bali/i }))
    fireEvent.click(screen.getByRole('button', { name: /show tools/i }))

    expect(screen.getByRole('region', { name: /tools/i })).toHaveAttribute('data-active', 'true')

    fireEvent.click(screen.getByRole('button', { name: /show ingredients/i }))
    expect(screen.getByRole('region', { name: /ingredients/i })).toHaveAttribute('data-active', 'true')
  })
})
