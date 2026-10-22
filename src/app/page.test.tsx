import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Home from './page'

vi.mock('../kitchen/KitchenMockup', () => ({
  KitchenMockup: ({ grandmaScreen }: { grandmaScreen: React.ReactNode | ((controls: { showRecipe: () => void }) => React.ReactNode) }) => (
    <div data-testid="kitchen-shell">
      {typeof grandmaScreen === 'function' ? grandmaScreen({ showRecipe: vi.fn() }) : grandmaScreen}
    </div>
  ),
}))

describe('Home', () => {
  it('opens straight onto the Grandma kitchen welcome, the same screens as /grandma/blank', () => {
    render(<Home />)

    expect(screen.getByRole('region', { name: 'Share more stories' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Recipe' })).toBeInTheDocument()
  })
})
