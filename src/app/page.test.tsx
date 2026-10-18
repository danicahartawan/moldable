import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Home', () => {
  it('renders the combined Grandma recording HomeView without navigation links', () => {
    render(<Home />)

    expect(screen.getByRole('main', { name: 'Grandma HomeView' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Grandma companion' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
