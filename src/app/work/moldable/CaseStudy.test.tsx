import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaseStudy } from './CaseStudy'

describe('Moldable case study', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  it('tells the core experience as four distinct portfolio chapters', () => {
    render(<CaseStudy />)

    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { name: 'What is a Moldable cookbook?' })).toBeVisible()
    expect(within(main).getByRole('heading', { name: 'A moldable writing experience' })).toBeVisible()
    expect(within(main).getByRole('heading', { name: 'A moldable cooking experience' })).toBeVisible()
    expect(within(main).getByRole('heading', { name: "Your grandma's whisper" })).toBeVisible()
  })

  it('shows real writing and cooking artifacts instead of empty image placeholders', () => {
    render(<CaseStudy />)

    expect(screen.getByRole('img', { name: 'Early Moldable writing interface from the design process' })).toHaveAttribute('src', '/assets/app/app-4-recording.jpg')
    expect(screen.getByRole('img', { name: 'Grandma recording a recipe on the Moldable kitchen display' })).toHaveAttribute('src', '/assets/case-study/grandma-recording.jpg')
    expect(screen.getByRole('img', { name: 'Grandkids browsing family recipes on the Moldable kitchen display' })).toHaveAttribute('src', '/assets/case-study/grandkids-recipes.jpg')
    expect(screen.getByRole('img', { name: 'Step-by-step family guidance on the Moldable kitchen display' })).toHaveAttribute('src', '/assets/case-study/grandkids-guidance.jpg')
    expect(screen.queryByLabelText('Image placeholder')).not.toBeInTheDocument()
  })

  it('lets the clay character hair be molded with a pointer', () => {
    render(<CaseStudy />)

    expect(screen.getByRole('img', { name: 'Moldable clay character' })).toBeVisible()
    const hair = screen.getByRole('button', { name: 'Mold the clay hair' })
    const fringe = screen.getByTestId('clay-hair-fringe')
    const originalShape = hair.getAttribute('d')
    const originalFringe = fringe.getAttribute('d')

    fireEvent.pointerDown(hair, { pointerId: 1, clientX: 220, clientY: 84 })
    fireEvent.pointerMove(hair, { pointerId: 1, clientX: 260, clientY: 48 })
    fireEvent.pointerUp(hair, { pointerId: 1 })

    expect(hair.getAttribute('d')).not.toBe(originalShape)
    expect(fringe.getAttribute('d')).not.toBe(originalFringe)

    fireEvent.pointerDown(hair, { pointerId: 2, clientX: 220, clientY: 84 })
    fireEvent.pointerMove(hair, { pointerId: 2, clientX: 1200, clientY: -800 })
    fireEvent.pointerUp(hair, { pointerId: 2 })
    const pathNumbers = hair.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(Math.max(...pathNumbers.map(Math.abs))).toBeLessThan(600)
  })
})
