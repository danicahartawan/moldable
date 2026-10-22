import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrandmaMinimalKitchen } from './GrandmaMinimalKitchen'

vi.mock('../kitchen/KitchenMockup', () => ({
  KitchenMockup: ({ grandmaScreen }: { grandmaScreen: React.ReactNode | ((controls: { showRecipe: () => void }) => React.ReactNode) }) => (
    <div data-testid="kitchen-shell">
      {typeof grandmaScreen === 'function' ? grandmaScreen({ showRecipe: vi.fn() }) : grandmaScreen}
    </div>
  ),
}))

vi.mock('./GrandmaMinimalPage', () => ({
  GrandmaMinimalPage: () => <main aria-label="Grandma recorder" />,
}))

describe('GrandmaMinimalKitchen welcome', () => {
  afterEach(cleanup)

  it('keeps the recorder locked behind the background and opens it only from New Recipe', () => {
    render(<GrandmaMinimalKitchen />)

    const welcome = screen.getByRole('region', { name: 'Share more stories' })
    expect(welcome).toBeInTheDocument()
    expect(screen.queryByText('NO')).not.toBeInTheDocument()
    expect(screen.queryByRole('main', { name: 'Grandma recorder' })).not.toBeInTheDocument()

    fireEvent.click(welcome)
    expect(screen.queryByRole('main', { name: 'Grandma recorder' })).not.toBeInTheDocument()

    const button = screen.getByRole('button', { name: 'New Recipe' })
    fireEvent.click(button)

    expect(screen.queryByRole('region', { name: 'Share more stories' })).not.toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Grandma recorder' })).toBeInTheDocument()
  })
})
