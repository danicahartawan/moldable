import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HapticClicks } from './HapticClicks'
import { play } from './haptics'

vi.mock('./haptics', () => ({ play: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.mocked(play).mockClear()
})

function Screen() {
  return (
    <>
      <HapticClicks />
      <button type="button">Tidy up</button>
      <button type="button" className="hm-go">Start cooking</button>
      <button type="button" aria-haspopup="dialog">Ingredients</button>
      <button type="button" className="hm-done">Done</button>
      <button type="button" aria-label="Back to the fridge">↑</button>
      <button type="button" aria-pressed="false">Mild</button>
      <button type="button" aria-pressed="true">Hot</button>
      <div className="goo-seg">
        <button type="button" aria-pressed="true">Tidy</button>
        <button type="button" aria-pressed="false">Oma’s words</button>
      </div>
      <nav><button type="button" aria-label="Tante Ani’s cookbook" /></nav>
      <button type="button" className="fz-note" aria-label="Klepon, 45 minutes" />
      <button type="button" className="hv-talk" aria-label="Talk to Moldable" />
      <button type="button" data-haptics="open">Photo</button>
      <button type="button" disabled>Locked</button>
      <div data-haptics="off"><button type="button">Quiet</button></div>
      <p>Just text</p>
    </>
  )
}

const press = (name: string) => fireEvent.pointerDown(screen.getByRole('button', { name }))

describe('HapticClicks', () => {
  it('plays the sound for what each button does, as it goes down', () => {
    render(<Screen />)
    const cases: [string, string][] = [
      ['Tidy up', 'tap'], ['Start cooking', 'confirm'], ['Ingredients', 'open'], ['Done', 'close'], ['Back to the fridge', 'close'],
      ['Mild', 'on'], ['Hot', 'off'], ['Oma’s words', 'on'], ['Tidy', 'tap'], ['Tante Ani’s cookbook', 'nav'],
      ['Klepon, 45 minutes', 'paper'], ['Talk to Moldable', 'wake'], ['Photo', 'open'],
    ]
    for (const [name, kind] of cases) {
      press(name)
      expect([name, vi.mocked(play).mock.lastCall?.[0]]).toEqual([name, kind])
    }
  })

  it('plays for keyboard presses too, once per press', () => {
    render(<Screen />)
    const b = screen.getByRole('button', { name: 'Ingredients' })
    fireEvent.keyDown(b, { key: 'Enter' })
    fireEvent.keyDown(b, { key: 'Enter', repeat: true })
    fireEvent.keyDown(b, { key: 'a' })
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenLastCalledWith('open')
  })

  it('stays quiet for disabled buttons, opted-out areas, plain text and other mouse buttons', () => {
    render(<Screen />)
    press('Locked')
    press('Quiet')
    fireEvent.pointerDown(screen.getByText('Just text'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Tidy up' }), { button: 2 })
    expect(play).not.toHaveBeenCalled()
  })
})
