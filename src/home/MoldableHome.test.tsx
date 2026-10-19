import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MoldableHome } from './MoldableHome'

describe('MoldableHome', () => {
  it('renders a square HomeView display with the cloud mascot', () => {
    const view = render(<MoldableHome />)

    expect(screen.getByRole('main', { name: 'Moldable HomeView' })).toHaveClass('moldable-environment')
    expect(view.container.querySelector('.moldable-display')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Moldable companion' })).toHaveAttribute(
      'src',
      '/assets/mascot-blue.png',
    )
    expect(screen.getByRole('toolbar', { name: 'Cooking tools and pantry' })).toBeInTheDocument()
  })
})
