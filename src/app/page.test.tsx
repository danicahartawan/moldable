import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Home', () => {
  it('renders the Moldable HomeView without navigation links', () => {
    render(<Home />)

    expect(screen.getByRole('main', { name: 'Moldable HomeView' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
