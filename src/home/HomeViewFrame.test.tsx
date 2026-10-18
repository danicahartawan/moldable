import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeViewFrame } from './HomeViewFrame'

describe('HomeViewFrame', () => {
  it('renders labeled content inside one square display', () => {
    render(
      <HomeViewFrame label="Test HomeView">
        <p className="test-content">Inside</p>
      </HomeViewFrame>,
    )

    expect(screen.getByRole('main', { name: 'Test HomeView' })).toHaveClass('moldable-environment')
    expect(screen.getByText('Inside')).toHaveClass('test-content')
    expect(screen.getByText('Inside').closest('.moldable-display')).toBeInTheDocument()
  })
})
