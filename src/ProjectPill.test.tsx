import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectPill } from './ProjectPill'

describe('ProjectPill', () => {
  it('exposes eight local project choices as keyboard-focusable buttons', () => {
    render(<ProjectPill />)

    const chooser = screen.getByRole('group', { name: 'Choose a project' })
    const buttons = screen.getAllByRole('button')

    expect(chooser).toHaveClass('project-pill')
    expect(buttons).toHaveLength(8)
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Mobility',
      'Mobile',
      'Tolan',
      'OpenAI',
      'Groth',
      'Editorial',
      'Orbit',
      'Object',
    ])
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('tabindex', '-1')
      expect(button.querySelector('svg, [data-artwork]')).not.toBeNull()
      expect(button.querySelector('img')).toBeNull()
    })
  })

  it('does not render unrelated navigation or page content', () => {
    render(<ProjectPill />)

    expect(screen.queryByText(/about|contact|projects|catalog/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
