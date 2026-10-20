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

  it('shows two orange blob panels in the portfolio hero', () => {
    render(<CaseStudy />)

    expect(screen.getByRole('img', { name: 'Orange moldable blob one' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Orange moldable blob two' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: /Mold orange blob/ })).toHaveLength(2)
  })

  it('lets each orange blob be molded directly while keeping its geometry bounded', () => {
    render(<CaseStudy />)

    const blob = screen.getByRole('button', { name: 'Mold orange blob one' })
    const originalShape = blob.getAttribute('d')

    fireEvent.pointerDown(blob, { pointerId: 1, clientX: 230, clientY: 90 })
    fireEvent.pointerMove(blob, { pointerId: 1, clientX: 270, clientY: 54 })
    fireEvent.pointerUp(blob, { pointerId: 1 })

    expect(blob.getAttribute('d')).not.toBe(originalShape)

    fireEvent.pointerDown(blob, { pointerId: 2, clientX: 230, clientY: 90 })
    fireEvent.pointerMove(blob, { pointerId: 2, clientX: 1400, clientY: -900 })
    fireEvent.pointerUp(blob, { pointerId: 2 })
    const pathNumbers = blob.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(Math.max(...pathNumbers.map(Math.abs))).toBeLessThan(520)
  })
})
