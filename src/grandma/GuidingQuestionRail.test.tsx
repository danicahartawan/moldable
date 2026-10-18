import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GuidingQuestionRail, guidingQuestions } from './GuidingQuestionRail'

afterEach(cleanup)

describe('GuidingQuestionRail', () => {
  it('renders the approved questions in their fixed order', () => {
    const view = render(<GuidingQuestionRail activeIndex={0} />)

    expect(Array.from(view.container.querySelectorAll('.grandma-question-rail__question')).map((node) => node.textContent)).toEqual(
      [...guidingQuestions],
    )
  })

  it('exposes only the active question as a polite live update', () => {
    render(<GuidingQuestionRail activeIndex={0} />)

    expect(screen.getByText('How old was Nev when that happened?')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('What should the beef smell like when it’s ready?')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('What else did you add by instinct?')).toHaveAttribute('aria-hidden', 'true')
  })

  it('changes the active question and wraps indices', () => {
    const view = render(<GuidingQuestionRail activeIndex={1} />)
    expect(screen.getByText('What should the beef smell like when it’s ready?')).toHaveAttribute('aria-live', 'polite')

    view.rerender(<GuidingQuestionRail activeIndex={4} />)
    expect(screen.getByText('How old was Nev when that happened?')).toHaveAttribute('aria-live', 'polite')
  })
})
