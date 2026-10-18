import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToolRail } from './ToolRail'

const toolNames = ['Microwave', 'Blend', 'Timer', 'Weigh', 'Temperature']

afterEach(cleanup)

describe('ToolRail', () => {
  it('exposes all five cooking tools from a collapsed rail', () => {
    render(<ToolRail />)

    expect(screen.getByRole('toolbar', { name: 'Cooking tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open cooking tools' })).toHaveAttribute('aria-expanded', 'false')
    toolNames.forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('opens across the shared pointer hit area and collapses when leaving', () => {
    render(<ToolRail />)
    const trigger = screen.getByRole('button', { name: 'Open cooking tools' })
    const rail = trigger.closest('.tool-rail') as HTMLElement

    fireEvent.pointerEnter(rail)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.pointerLeave(rail)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens and expands a focused tool', () => {
    render(<ToolRail />)
    const timer = screen.getByRole('button', { name: 'Timer' })

    fireEvent.focus(timer)

    expect(screen.getByRole('button', { name: 'Open cooking tools' })).toHaveAttribute('aria-expanded', 'true')
    expect(timer).toHaveClass('tool-chip--expanded')
  })

  it('selects one tool without navigating or collapsing', () => {
    render(<ToolRail />)
    const weigh = screen.getByRole('button', { name: 'Weigh' })

    fireEvent.click(weigh)

    expect(weigh).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Open cooking tools' })).toHaveAttribute('aria-expanded', 'true')
    toolNames.filter((name) => name !== 'Weigh').forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('collapses on Escape and returns focus to the trigger', () => {
    render(<ToolRail />)
    const trigger = screen.getByRole('button', { name: 'Open cooking tools' })
    const timer = screen.getByRole('button', { name: 'Timer' })

    fireEvent.focus(timer)
    fireEvent.keyDown(timer, { key: 'Escape' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('collapses when keyboard focus leaves the rail', () => {
    render(<><ToolRail /><button type="button">Outside</button></>)
    const trigger = screen.getByRole('button', { name: 'Open cooking tools' })
    const timer = screen.getByRole('button', { name: 'Timer' })
    const outside = screen.getByRole('button', { name: 'Outside' })

    fireEvent.focus(timer)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.blur(timer, { relatedTarget: outside })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
