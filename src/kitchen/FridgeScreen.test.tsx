import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FridgeScreen } from './FridgeScreen'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const cam = () => (document.querySelector('.fz-cam') as HTMLElement).style.transform
const note = (name: RegExp) => screen.getByRole('button', { name })
const root = () => document.querySelector('.fz') as HTMLElement

describe('FridgeScreen', () => {
  it('shows the whole fridge first, then zooms into the door', () => {
    render(<FridgeScreen />)
    expect(cam()).toContain('scale(0.48)')
    advance(1600)
    expect(cam()).toContain('scale(1.6)')
    expect(screen.getByText('OMA LIEN')).toBeInTheDocument()
    expect(note(/Lawar Bali, 40 minutes/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Make your own recipe/ })[0]).toBeEnabled()
  })

  it('swipes to the next fridge: zoom out, slide, then zoom into its door', () => {
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.pointerDown(root(), { clientX: 500, clientY: 300 })
    fireEvent.pointerUp(root(), { clientX: 300, clientY: 310 })
    expect(cam()).toContain('scale(0.48)')
    advance(850)
    expect(screen.getByRole('button', { name: 'Tante Ani’s cookbook' })).toHaveAttribute('aria-current', 'true')
    advance(1700)
    expect(cam()).toContain('scale(1.6)')
    expect(note(/Klepon/)).not.toBeDisabled()
  })

  it('drags a note without opening it', () => {
    render(<FridgeScreen />)
    advance(1600)
    const lelawar = note(/Lawar Bali, 40/)
    const before = lelawar.style.left
    fireEvent.pointerDown(lelawar, { clientX: 100, clientY: 100 })
    fireEvent.pointerMove(root(), { clientX: 160, clientY: 140 })
    fireEvent.pointerUp(root(), { clientX: 160, clientY: 140 })
    fireEvent.click(lelawar)
    advance(800)
    expect(lelawar.style.left).not.toBe(before)
    expect(screen.queryByRole('button', { name: 'Back to the fridge' })).not.toBeInTheDocument()
  })

  it('dives into Lelawar Bali for the recipe home view, and Back returns to the fridge', () => {
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(note(/Lawar Bali, 40/))
    expect(document.querySelector('.fz-fly')).toBeInTheDocument()
    advance(700)
    expect(screen.getByRole('heading', { name: 'Lelawar Bali' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the fridge' }))
    advance(800)
    expect(screen.queryByRole('heading', { name: 'Lelawar Bali' })).not.toBeInTheDocument()
    expect(note(/Lawar Bali, 40/)).toBeVisible()
  })

  it('Make your own opens the New recipe page', () => {
    const record = vi.fn()
    render(<FridgeScreen onRecord={record} />)
    advance(1600)
    fireEvent.click(screen.getAllByRole('button', { name: /Make your own/ })[0])
    advance(700)
    expect(screen.getByRole('article', { name: 'New recipe' })).toHaveTextContent('For Oma Lien’s cookbook. How do you want to save it?')
    fireEvent.click(screen.getByRole('button', { name: /Record her telling it/ }))
    expect(record).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Scan a card/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Write it yourself/ })).toBeInTheDocument()
  })

  it('the dashed fridge adds a NEW BOOK fridge with only Make your own', () => {
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(screen.getByRole('button', { name: 'New fridge' }))
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Build a new fridge for another cookbook' }))
    expect(screen.getByText('NEW BOOK')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New cookbook' })).toHaveAttribute('aria-current', 'true')
    advance(1200)
    expect(cam()).toContain('scale(1.6)')
    expect(screen.getAllByRole('button', { name: /Make your own recipe/ })).toHaveLength(3)
  })

  it('can open straight onto the recipe, handed over from the grandma screen', () => {
    render(<FridgeScreen startOpen />)
    expect(screen.getByRole('heading', { name: 'Lelawar Bali' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to the fridge' })).toBeInTheDocument()
  })

  it('closes the open recipe back onto the door when asked (Done at the end of cooking)', () => {
    const { rerender } = render(<FridgeScreen startOpen closeRequest={0} />)
    expect(screen.getByRole('heading', { name: 'Lelawar Bali' })).toBeInTheDocument()
    rerender(<FridgeScreen startOpen closeRequest={1} />)
    advance(800)
    expect(screen.queryByRole('heading', { name: 'Lelawar Bali' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lawar Bali, 40 minutes/ })).toBeVisible()
    expect(cam()).toContain('scale(1.6)')
  })

  it('scrolls the door up and down with the wheel and by dragging empty door, stopping at the fridge ends', () => {
    render(<FridgeScreen />)
    advance(1600)
    const ty = () => Number(/translate\(-?\d+px, (-?\d+)px\)/.exec(cam())?.[1])
    const start = ty()
    // The wheel glides the door there over a few frames.
    act(() => { root().dispatchEvent(new WheelEvent('wheel', { deltaY: 160, bubbles: true, cancelable: true })) })
    expect(ty()).toBeGreaterThan(start - 160)
    advance(500)
    expect(ty()).toBe(start - 160)
    // Far down: it stops with the bottom of the fridge at the bottom of the screen.
    act(() => { root().dispatchEvent(new WheelEvent('wheel', { deltaY: 5000, bubbles: true, cancelable: true })) })
    advance(500)
    expect(ty()).toBe(640 - 1240 * 1.6)
    // Dragging the door down scrolls back up.
    fireEvent.pointerDown(root(), { clientX: 300, clientY: 100 })
    fireEvent.pointerMove(root(), { clientX: 302, clientY: 420 })
    fireEvent.pointerUp(root(), { clientX: 302, clientY: 420 })
    expect(ty()).toBe(640 - 1240 * 1.6 + 320)
    // Not a sideways swipe: still on Oma Lien's fridge.
    expect(screen.getByRole('button', { name: 'Oma Lien’s cookbook' })).toHaveAttribute('aria-current', 'true')
  })

  it('carrying a note past the bottom of the screen scrolls the fridge with it', () => {
    render(<FridgeScreen />)
    advance(1600)
    const start = cam()
    const lawar = note(/Lawar Bali, 40/)
    fireEvent.pointerDown(lawar, { clientX: 100, clientY: 100 })
    for (let y = 140; y <= 600; y += 40) fireEvent.pointerMove(root(), { clientX: 100, clientY: y })
    fireEvent.pointerUp(root(), { clientX: 100, clientY: 600 })
    expect(cam()).not.toBe(start)
    expect(Number(lawar.style.top.replace('px', ''))).toBeGreaterThan(700)
  })

  it('keeps a note on the main door: not past its sides, the freezer seal or the ribbed base', () => {
    render(<FridgeScreen />)
    advance(1600)
    const lawar = note(/Lawar Bali, 40/)
    const at = () => [lawar.style.left, lawar.style.top].map((v) => Number(v.replace('px', '')))
    fireEvent.pointerDown(lawar, { clientX: 300, clientY: 300 })
    fireEvent.pointerMove(root(), { clientX: -3000, clientY: -3000 })
    expect(at()).toEqual([14, 396])
    fireEvent.pointerMove(root(), { clientX: 3000, clientY: 3000 })
    fireEvent.pointerUp(root(), { clientX: 3000, clientY: 3000 })
    expect(at()).toEqual([600 - 130 - 14, 1138 - 188])
  })
})
