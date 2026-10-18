import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('combined app', () => {
  it('keeps the centered ginger artwork beneath the project bar', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('img', { name: 'Ginger root' })).toHaveAttribute(
      'src',
      '/assets/ginger-root.png',
    )
    expect(container.querySelector('.ginger-stage')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Choose a project' })).toBeInTheDocument()
  })
})
