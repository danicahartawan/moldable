import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GooButton, GooTooltipGroup } from './GooTooltip'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const tip = () => screen.getByRole('tooltip', { hidden: true })

function Row() {
  return (
    <GooTooltipGroup aria-label="Actions">
      <GooButton tooltip="Add item" aria-label="Add item" />
      <GooButton tooltip="Copy a link">Share</GooButton>
      <GooButton tooltip="Download as CSV">Export</GooButton>
    </GooTooltipGroup>
  )
}

describe('GooTooltipGroup', () => {
  it('shows a short beat after the pointer arrives, and describes the button', () => {
    render(<Row />)
    const share = screen.getByRole('button', { name: 'Share' })
    fireEvent.pointerEnter(share, { pointerType: 'mouse' })
    // A cursor sweeping past doesn't flash it.
    advance(40)
    expect(share).not.toHaveAttribute('aria-describedby')
    advance(60)
    expect(share).toHaveAttribute('aria-describedby', tip().id)
    expect(tip()).toHaveTextContent('Copy a link')
  })

  it('travels to the next button at once, and only absorbs once the pointer has really left', () => {
    render(<Row />)
    const share = screen.getByRole('button', { name: 'Share' })
    const exp = screen.getByRole('button', { name: 'Export' })
    fireEvent.pointerEnter(share, { pointerType: 'mouse' })
    advance(100)
    // Crossing the gap between pills: it stays up and moves over, with the new label.
    fireEvent.pointerLeave(share, { pointerType: 'mouse' })
    advance(60)
    fireEvent.pointerEnter(exp, { pointerType: 'mouse' })
    expect(exp).toHaveAttribute('aria-describedby', tip().id)
    expect(share).not.toHaveAttribute('aria-describedby')
    expect(tip()).toHaveTextContent('Download as CSV')
    // Leaving the row: gone after the hide delay.
    fireEvent.pointerLeave(exp, { pointerType: 'mouse' })
    advance(100)
    expect(exp).toHaveAttribute('aria-describedby')
    advance(40)
    expect(exp).not.toHaveAttribute('aria-describedby')
  })

  it('comes back from where it is if the pointer returns while it is absorbing', () => {
    render(<Row />)
    const share = screen.getByRole('button', { name: 'Share' })
    fireEvent.pointerEnter(share, { pointerType: 'mouse' })
    advance(600)
    fireEvent.pointerLeave(share, { pointerType: 'mouse' })
    advance(200)
    const drop = document.querySelector('.goo__tip') as HTMLElement
    expect(drop).toHaveClass('is-on')
    // Back in, with no show delay and no restart.
    fireEvent.pointerEnter(share, { pointerType: 'mouse' })
    expect(share).toHaveAttribute('aria-describedby', tip().id)
    expect(drop).toHaveClass('is-on')
  })

  it('shows on keyboard focus, travels as focus moves, and Escape hides it', () => {
    render(<Row />)
    const add = screen.getByRole('button', { name: 'Add item' })
    const share = screen.getByRole('button', { name: 'Share' })
    act(() => add.focus())
    expect(add).toHaveAttribute('aria-describedby', tip().id)
    expect(tip()).toHaveTextContent('Add item')
    act(() => share.focus())
    expect(share).toHaveAttribute('aria-describedby', tip().id)
    fireEvent.keyDown(share, { key: 'Escape' })
    expect(share).not.toHaveAttribute('aria-describedby')
  })

  it('on touch, shows only on a long press and is absorbed on release', () => {
    render(<Row />)
    const share = screen.getByRole('button', { name: 'Share' })
    fireEvent.pointerEnter(share, { pointerType: 'touch' })
    advance(200)
    expect(share).not.toHaveAttribute('aria-describedby')
    fireEvent.pointerDown(share, { pointerType: 'touch' })
    advance(460)
    expect(share).toHaveAttribute('aria-describedby', tip().id)
    fireEvent.pointerUp(share, { pointerType: 'touch' })
    advance(140)
    expect(share).not.toHaveAttribute('aria-describedby')
  })

  it('keeps every button named on its own, and the goo shapes out of the accessibility tree', () => {
    render(<Row />)
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Add item', 'Share', 'Export'])
    expect(document.querySelector('.goo__shapes')).toHaveAttribute('aria-hidden', 'true')
  })
})
