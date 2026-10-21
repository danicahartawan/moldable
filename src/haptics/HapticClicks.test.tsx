import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HapticClicks } from './HapticClicks'
import { tap } from './haptics'

vi.mock('./haptics', () => ({ tap: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.mocked(tap).mockClear()
})

function Screen() {
  return (
    <>
      <HapticClicks />
      <button type="button">Ingredients</button>
      <button type="button" className="hm-go">Start cooking</button>
      <button type="button" disabled>Locked</button>
      <div data-haptics="off"><button type="button">Quiet</button></div>
      <p>Just text</p>
    </>
  )
}

describe('HapticClicks', () => {
  it('taps as a button goes down, fuller on the dark primary pills', () => {
    render(<Screen />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ingredients' }))
    expect(tap).toHaveBeenLastCalledWith('light')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Start cooking' }))
    expect(tap).toHaveBeenLastCalledWith('medium')
    expect(tap).toHaveBeenCalledTimes(2)
  })

  it('taps for keyboard presses too, once per press', () => {
    render(<Screen />)
    const b = screen.getByRole('button', { name: 'Ingredients' })
    fireEvent.keyDown(b, { key: 'Enter' })
    fireEvent.keyDown(b, { key: 'Enter', repeat: true })
    fireEvent.keyDown(b, { key: 'a' })
    expect(tap).toHaveBeenCalledTimes(1)
  })

  it('stays quiet for disabled buttons, opted-out areas, plain text and other mouse buttons', () => {
    render(<Screen />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Locked' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Quiet' }))
    fireEvent.pointerDown(screen.getByText('Just text'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ingredients' }), { button: 2 })
    expect(tap).not.toHaveBeenCalled()
  })
})
