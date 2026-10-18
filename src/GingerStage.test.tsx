import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { afterEach } from 'vitest'

afterEach(() => window.history.replaceState({}, '', '/'))

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

  it('opens the finished writing screen from its shareable grandma URL', () => {
    window.history.replaceState({}, '', '/grandma/story')
    const view = render(<App />)

    expect(within(view.container).getByRole('article', { name: 'Balinese minced pork story' })).toBeInTheDocument()
    expect(within(view.container).queryByRole('img', { name: 'Ginger root' })).not.toBeInTheDocument()
  })
})
