import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FridgeScreen } from './FridgeScreen'
import { announceCookbooks } from '@/cookbook/client'
import { defaultCookbooks } from '@/cookbook/model'
import { router } from '@/testSetup'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  // The cookbooks are shared across the page; each test starts from the two built-in fridges.
  announceCookbooks(defaultCookbooks(), true)
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
    // Tante Ani's pink fridge holds only the grey Make your own card.
    expect(screen.queryByRole('button', { name: /Klepon|Kue lapis/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Make your own recipe/ })[1]).not.toBeDisabled()
  })

  it('renames a fridge right on its name: the badge, the cookbook and the cards follow; Escape keeps the old name', () => {
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(screen.getByRole('button', { name: 'Rename Oma Lien’s cookbook' }))
    const field = screen.getByRole('textbox', { name: 'Fridge name' })
    expect(field).toHaveClass('fz-badge')
    expect(field).toHaveValue('Oma Lien')
    fireEvent.change(field, { target: { value: '  Nana   Sri ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    fireEvent.blur(field)
    expect(screen.getByRole('button', { name: 'Rename Nana Sri’s cookbook' })).toHaveTextContent('NANA SRI')
    expect(screen.getByRole('button', { name: 'Nana Sri’s cookbook' })).toBeInTheDocument()
    expect(screen.getAllByText('Nana Sri’s Recipe').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Rename Nana Sri’s cookbook' }))
    const again = screen.getByRole('textbox', { name: 'Fridge name' })
    fireEvent.change(again, { target: { value: 'Somebody else' } })
    fireEvent.keyDown(again, { key: 'Escape' })
    fireEvent.blur(again)
    expect(screen.getByRole('button', { name: 'Rename Nana Sri’s cookbook' })).toBeInTheDocument()
  })

  it('a new fridge closed without a name is not kept', () => {
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(screen.getByRole('button', { name: 'New fridge' }))
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Build a new fridge for another cookbook' }))
    expect(screen.getAllByRole('button', { name: /cookbook$/ }).map((b) => b.getAttribute('aria-label'))).toContain('New cookbook')
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    advance(600)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New cookbook' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tante Ani’s cookbook' })).toHaveAttribute('aria-current', 'true')
  })

  it('a new fridge asks whose cookbook it is and listens for the name', async () => {
    // The browser's speech recognition, hearing one sentence.
    class Hear {
      continuous = false; interimResults = false; lang = ''
      onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: unknown) => void) | null = null
      start() { window.setTimeout(() => { this.onresult?.({ results: [{ isFinal: true, 0: { transcript: 'It’s Uncle Budi’s cookbook' } }] }); this.onend?.() }, 300) }
      stop() {}
      abort() {}
    }
    ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = Hear
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(screen.getByRole('button', { name: 'New fridge' }))
    advance(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Build a new fridge for another cookbook' }))
    // It asks straight away.
    expect(screen.getByRole('dialog', { name: 'Name the new fridge' })).toHaveTextContent('Whose cookbook is this?')
    expect(screen.getByRole('dialog', { name: 'Name the new fridge' })).toHaveTextContent('Listening')
    await act(async () => { vi.advanceTimersByTime(400) })
    expect(screen.getByRole('textbox', { name: 'Fridge name' })).toHaveValue('Uncle Budi')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    // The page dissolves away onto the named fridge.
    expect(screen.getByRole('dialog', { name: 'Name the new fridge' })).toHaveClass('is-leaving')
    advance(500)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Uncle Budi’s cookbook' })).toHaveTextContent('UNCLE BUDI')
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  })

  it('shows a saved recipe on its fridge, opens it to its page, and pops one that was just saved', () => {
    const doc = defaultCookbooks()
    doc.books[1].recipes.push({
      id: 'r-klepon', name: 'Klepon', summary: 'Green rice balls with palm sugar inside.', minutes: 45, serves: 4,
      ingredients: [{ name: 'Glutinous rice flour', amount: '2 cups', said: 'two cups' }], steps: ['Roll small balls.', 'Boil until they float.'],
      tools: ['Pot'], questions: ['How much grated coconut?'], transcript: '', createdAt: '2026-10-21T00:00:00.000Z',
    })
    announceCookbooks({ ...doc, rev: 5 }, true)
    const { rerender } = render(<FridgeScreen focus={{ book: 'tante-ani', recipe: 'r-klepon', n: 0 }} />)
    rerender(<FridgeScreen focus={{ book: 'tante-ani', recipe: 'r-klepon', n: 1 }} />)
    advance(1200)
    expect(screen.getByRole('button', { name: 'Tante Ani’s cookbook' })).toHaveAttribute('aria-current', 'true')
    advance(700)
    const card = note(/Klepon, 45 minutes/)
    expect(card).toHaveClass('fz-note--pop')
    fireEvent.click(card)
    advance(700)
    const page = screen.getByRole('article', { name: 'Klepon' })
    expect(page).toHaveTextContent('Green rice balls with palm sugar inside.')
    expect(page).toHaveTextContent('Glutinous rice flour2 cups')
    expect(page).toHaveTextContent('Still to askHow much grated coconut?')
    fireEvent.click(screen.getByRole('button', { name: 'Back to the fridge' }))
    advance(1000)
    expect(screen.queryByRole('article', { name: 'Klepon' })).not.toBeInTheDocument()
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

  it('dives into Lawar Bali for the recipe home view, and Back returns to the fridge', () => {
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(note(/Lawar Bali, 40/))
    // The card grows out of the note with its face, and turns the home view's white as it fills the screen.
    const fly = document.querySelector('.fz-fly') as HTMLElement
    expect(fly.style.background).toBe('rgb(255, 74, 0)')
    expect(fly.querySelector('.fz-lawar__name')).toHaveTextContent('Lawar Bali')
    advance(100)
    expect(fly.style.background).toBe('rgb(255, 255, 255)')
    advance(600)
    expect(screen.getByRole('heading', { name: 'Lawar Bali' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the fridge' }))
    // The page fades out over the card's white first, then the card shrinks back, orange again, onto its note.
    advance(120)
    expect(document.querySelector('.fz-page.fz-out')).toBeInTheDocument()
    expect(document.querySelector('.fz-fly')).toHaveClass('is-big')
    advance(200)
    expect(screen.queryByRole('heading', { name: 'Lawar Bali' })).not.toBeInTheDocument()
    expect((document.querySelector('.fz-fly') as HTMLElement).style.background).toBe('rgb(255, 74, 0)')
    advance(700)
    expect(document.querySelector('.fz-fly')).not.toBeInTheDocument()
    expect(note(/Lawar Bali, 40/)).toBeVisible()
    // Once the card has landed on the door, the camera carries on out to the whole fridge.
    expect(cam()).toContain('scale(1.6)')
    advance(150)
    expect(cam()).toContain('scale(0.48)')
  })

  it('Make your own grows to fill the screen, turning white like Grandma\'s note, then hands over to it and resets', () => {
    const record = vi.fn()
    render(<FridgeScreen onRecord={record} />)
    advance(1600)
    fireEvent.click(screen.getAllByRole('button', { name: /Make your own/ })[0])
    advance(100)
    const fly = document.querySelector('.fz-fly') as HTMLElement
    expect(fly).toHaveClass('is-big')
    expect(fly.style.background).toBe('rgb(255, 255, 255)')
    advance(450)
    expect(record).not.toHaveBeenCalled()
    // The hand-over waits for the card to finish turning white.
    fireEvent.transitionEnd(fly, { propertyName: 'background-color' })
    expect(record).toHaveBeenCalledWith({ id: 'oma-lien', name: 'Oma Lien' })
    // No options page in between, and the fridge is closed again once it's out of sight.
    expect(screen.queryByRole('article', { name: 'New recipe' })).not.toBeInTheDocument()
    advance(1200)
    expect(document.querySelector('.fz-fly')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Make your own/ })[0]).toBeEnabled()
  })

  it('without a kitchen around it, Make your own moves the page to /grandma', () => {
    router.push.mockClear()
    render(<FridgeScreen />)
    advance(1600)
    fireEvent.click(screen.getAllByRole('button', { name: /Make your own/ })[0])
    // With no transition to wait for, a timer hands over.
    advance(950)
    expect(router.push).toHaveBeenCalledWith('/grandma')
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
    expect(screen.getByRole('heading', { name: 'Lawar Bali' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to the fridge' })).toBeInTheDocument()
  })

  it('closes the open recipe back onto the door when asked (Done at the end of cooking)', () => {
    const { rerender } = render(<FridgeScreen startOpen closeRequest={0} />)
    expect(screen.getByRole('heading', { name: 'Lawar Bali' })).toBeInTheDocument()
    rerender(<FridgeScreen startOpen closeRequest={1} />)
    advance(1000)
    expect(screen.queryByRole('heading', { name: 'Lawar Bali' })).not.toBeInTheDocument()
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

  it('zooms in onto the main card, wherever it has been moved to', () => {
    render(<FridgeScreen />)
    advance(1600)
    const ty = () => Number(/translate\(-?\d+px, (-?\d+)px\)/.exec(cam())?.[1])
    // The door view opens centred on Lawar Bali.
    const lawar = note(/Lawar Bali, 40/)
    const centre = () => Number(lawar.style.top.replace('px', '')) + 188 / 2
    expect(ty()).toBe(Math.round(320 - centre() * 1.6))
    // Moved far down the door, then zoomed out and back in: the camera comes back onto it.
    fireEvent.pointerDown(lawar, { clientX: 300, clientY: 300 })
    fireEvent.pointerMove(root(), { clientX: 300, clientY: 3000 })
    fireEvent.pointerUp(root(), { clientX: 300, clientY: 3000 })
    fireEvent.click(screen.getByRole('button', { name: 'See the whole fridge' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in to the door' }))
    expect(ty()).toBe(Math.round(320 - Math.min(centre(), 1240 - 200) * 1.6))
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
