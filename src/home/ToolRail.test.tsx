import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToolRail } from './ToolRail'

const toolNames = ['Microwave', 'Blend', 'Timer', 'Weigh', 'Temperature']

afterEach(cleanup)

describe('ToolRail', () => {
  it('shows the shelf without a trigger button or section tabs', () => {
    render(<ToolRail />)

    expect(screen.getByRole('toolbar', { name: 'Cooking tools and pantry' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Mold shelf' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    toolNames.forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('stays hidden until the top-left corner is hovered, then closes on leave', () => {
    const { container } = render(<ToolRail />)
    const rail = container.querySelector('.tool-rail') as HTMLElement

    expect(rail).not.toHaveClass('tool-rail--open')
    fireEvent.pointerEnter(container.querySelector('.tool-rail__hotspot') as HTMLElement)
    expect(rail).toHaveClass('tool-rail--open')
    fireEvent.pointerLeave(rail)
    expect(rail).not.toHaveClass('tool-rail--open')
  })

  it('renders icon-only chips', () => {
    const { container } = render(<ToolRail />)

    expect(container.querySelectorAll('.tool-chip__label')).toHaveLength(0)
    toolNames.forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveClass('tool-chip')
    })
  })

  it('expands a focused chip', () => {
    render(<ToolRail />)
    const timer = screen.getByRole('button', { name: 'Timer' })

    fireEvent.focus(timer)

    expect(timer).toHaveClass('tool-chip--expanded')
  })

  it('selects one tool at a time', () => {
    render(<ToolRail />)

    fireEvent.click(screen.getByRole('button', { name: 'Timer' }))

    expect(screen.getByRole('button', { name: 'Timer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Microwave' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows three items at a time with the fourth faded at the edge', () => {
    render(<ToolRail />)

    expect(screen.getByRole('button', { name: 'Microwave' })).not.toHaveClass('tool-chip--hidden')
    expect(screen.getByRole('button', { name: 'Timer' })).not.toHaveClass('tool-chip--hidden')
    expect(screen.getByRole('button', { name: 'Weigh' })).toHaveClass('tool-chip--edge')
    expect(screen.getByRole('button', { name: 'Temperature' })).toHaveClass('tool-chip--hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Weigh' }))

    expect(screen.getByRole('button', { name: 'Microwave' })).toHaveClass('tool-chip--hidden')
    expect(screen.getByRole('button', { name: 'Temperature' })).toHaveClass('tool-chip--edge')
  })

  it('scrolls the carousel when swiping up and back down', () => {
    const { container } = render(<ToolRail />)
    const rail = container.querySelector('.tool-rail') as HTMLElement

    fireEvent.pointerDown(rail, { clientX: 100, clientY: 200 })
    fireEvent.pointerMove(rail, { clientX: 100, clientY: 150 })
    expect(screen.getByRole('button', { name: 'Microwave' })).toHaveClass('tool-chip--hidden')
    expect(screen.getByRole('button', { name: 'Temperature' })).not.toHaveClass('tool-chip--hidden')

    fireEvent.pointerMove(rail, { clientX: 100, clientY: 200 })
    expect(screen.getByRole('button', { name: 'Microwave' })).not.toHaveClass('tool-chip--hidden')
    fireEvent.pointerUp(rail)
  })
})
