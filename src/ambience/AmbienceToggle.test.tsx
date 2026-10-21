import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AmbienceToggle } from './AmbienceToggle'
import { setAmbience } from './ambience'

afterEach(() => {
  act(() => setAmbience(false))
  cleanup()
  window.localStorage.clear()
})

describe('AmbienceToggle', () => {
  it('is off until switched on, and remembers the choice', () => {
    render(<AmbienceToggle />)
    const toggle = screen.getByRole('button', { name: /Rain & jazz/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('moldable-ambience')).toBe('on')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(window.localStorage.getItem('moldable-ambience')).toBe('off')
  })

  it('keeps every switch on the page in step (the kitchen bar and the boards nav share one player)', () => {
    render(<><AmbienceToggle className="a" /><AmbienceToggle className="b" /></>)
    const [a, b] = screen.getAllByRole('button', { name: /Rain & jazz/ })
    fireEvent.click(a)
    expect(b).toHaveAttribute('aria-pressed', 'true')
  })
})
