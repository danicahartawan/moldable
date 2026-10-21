import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GooSegmented } from './GooSegmented'

vi.mock('@/haptics/haptics', () => ({ play: vi.fn() }))

afterEach(cleanup)

const MODES = [{ value: 'tidy', label: 'Tidy' }, { value: 'oma', label: 'Oma’s words' }] as const

function Switch() {
  const [v, setV] = useState<'tidy' | 'oma'>('tidy')
  return <GooSegmented aria-label="How amounts are written" options={MODES} value={v} onChange={setV} />
}

// jsdom doesn't lay anything out: give the two options their real-ish places.
function layOut() {
  const [tidy, oma] = screen.getAllByRole('button')
  Object.defineProperties(tidy, { offsetLeft: { value: 3 }, offsetWidth: { value: 60 } })
  Object.defineProperties(oma, { offsetLeft: { value: 63 }, offsetWidth: { value: 120 } })
  return { tidy, oma, group: screen.getByRole('group') }
}

describe('GooSegmented', () => {
  it('switches with a tap', () => {
    render(<Switch />)
    fireEvent.click(screen.getByRole('button', { name: 'Oma’s words' }))
    expect(screen.getByRole('button', { name: 'Oma’s words' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('slides: let go past the middle and it lands on the other option; short of it, it stays', () => {
    render(<Switch />)
    const { tidy, oma, group } = layOut()
    fireEvent.pointerDown(tidy, { pointerId: 1, clientX: 30 })
    fireEvent.pointerMove(group, { pointerId: 1, clientX: 50 })
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 50 })
    expect(tidy).toHaveAttribute('aria-pressed', 'true')
    fireEvent.pointerDown(tidy, { pointerId: 2, clientX: 30 })
    fireEvent.pointerMove(group, { pointerId: 2, clientX: 70 })
    fireEvent.pointerUp(group, { pointerId: 2, clientX: 70 })
    // The click that ends a slide doesn't also count as a tap on Tidy.
    fireEvent.click(tidy)
    expect(oma).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves with the arrow keys', () => {
    render(<Switch />)
    const tidy = screen.getByRole('button', { name: 'Tidy' })
    fireEvent.keyDown(tidy, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: 'Oma’s words' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(tidy, { key: 'ArrowLeft' })
    expect(tidy).toHaveAttribute('aria-pressed', 'true')
  })
})
