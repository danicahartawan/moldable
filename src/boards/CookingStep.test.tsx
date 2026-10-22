import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookingStepBoard } from './CookingStep'
import { speakReply, stopSpeaking } from '@/grandma/speakReply'

vi.mock('@/grandma/speakReply', () => ({ speakReply: vi.fn(async () => {}), stopSpeaking: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.mocked(speakReply).mockClear()
  vi.mocked(stopSpeaking).mockClear()
})

const current = () => document.querySelector('.cs-step[data-state="current"]') as HTMLElement
const screenEl = () => document.querySelector('.cs') as HTMLElement
const wheel = (deltaY: number) => act(() => { screenEl().dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })) })

describe('CookingStepBoard', () => {
  it('reads each step aloud as it comes up, stops it when the step changes, and stays quiet while sliding out', () => {
    const { unmount } = render(<CookingStepBoard />)
    expect(speakReply).toHaveBeenCalledTimes(1)
    const first = vi.mocked(speakReply).mock.calls[0][0]
    expect(first).not.toContain('**')
    expect(current()).toHaveTextContent(first.slice(0, 12))

    fireEvent.click(screen.getByRole('button', { name: 'Step 2' }))
    expect(stopSpeaking).toHaveBeenCalled()
    expect(speakReply).toHaveBeenCalledTimes(2)
    expect(vi.mocked(speakReply).mock.calls[1][0]).not.toBe(first)

    unmount()
    expect(stopSpeaking).toHaveBeenCalledTimes(2)
    vi.mocked(speakReply).mockClear()
    render(<CookingStepBoard enter={false} />)
    expect(speakReply).not.toHaveBeenCalled()
  })

  it('shows one step as a sentence with its verb tag, the next one blurred below', () => {
    render(<CookingStepBoard />)
    expect(current()).toHaveTextContent('Step 1')
    expect(current()).toHaveTextContent('Blend half the onions, garlic, sambal, kencur, pepper and lime leaves into a fine paste.')
    expect(within(current()).getByText('onions, garlic, sambal, kencur, pepper').tagName).toBe('STRONG')
    expect(document.querySelectorAll('.cs-step[data-state="near"]')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Go to step 2' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Step \d$/ })).toHaveLength(8)
  })

  it('moves with the arrow keys, Space and Page keys, and jumps by tapping a blurred step', () => {
    render(<CookingStepBoard />)
    fireEvent.keyDown(screenEl(), { key: 'ArrowDown' })
    expect(current()).toHaveTextContent('Toast the coconut')
    fireEvent.keyDown(screenEl(), { key: ' ' })
    fireEvent.keyDown(screenEl(), { key: 'PageDown' })
    expect(current()).toHaveTextContent('Cook the paste')
    fireEvent.keyDown(screenEl(), { key: 'ArrowUp' })
    expect(current()).toHaveTextContent('Fry the rest')
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 2' }))
    expect(current()).toHaveTextContent('Toast the coconut')
  })

  it('moves one step per wheel flick, locked for a moment after each move', () => {
    vi.useFakeTimers()
    render(<CookingStepBoard />)
    wheel(20)
    expect(current()).toHaveTextContent('Step 1')
    wheel(30)
    expect(current()).toHaveTextContent('Step 2')
    wheel(120)
    expect(current()).toHaveTextContent('Step 2')
    act(() => { vi.advanceTimersByTime(700) })
    wheel(-60)
    expect(current()).toHaveTextContent('Step 1')
  })

  it('moves with a vertical swipe', () => {
    render(<CookingStepBoard />)
    fireEvent.pointerDown(screenEl(), { clientX: 300, clientY: 400 })
    fireEvent.pointerUp(screenEl(), { clientX: 310, clientY: 300 })
    expect(current()).toHaveTextContent('Step 2')
    fireEvent.pointerDown(screenEl(), { clientX: 300, clientY: 300 })
    fireEvent.pointerUp(screenEl(), { clientX: 300, clientY: 380 })
    expect(current()).toHaveTextContent('Step 1')
  })

  it('has no orb beside the step label, so no hidden button for Oma’s words', () => {
    render(<CookingStepBoard />)
    expect(screen.queryByRole('button', { name: /Oma Lien’s words/ })).not.toBeInTheDocument()
    expect(document.querySelector('.cs-orb')).not.toBeInTheDocument()
    expect(current()).toHaveTextContent('Step 1')
  })

  it('opens the ingredients pop-up, which blocks step changes and closes with Done, the backdrop or Escape', () => {
    vi.useFakeTimers()
    render(<CookingStepBoard />)
    const pill = () => screen.getByRole('button', { name: 'Ingredients' })
    const closed = () => {
      // Pouring back: no longer a dialog at once, and gone from the page once the liquid is back in the pill.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(600) })
      expect(document.querySelector('.cs-pop')).not.toBeInTheDocument()
      expect(pill()).not.toHaveClass('is-poured')
    }
    fireEvent.click(pill())
    expect(pill()).toHaveClass('is-poured')
    const card = screen.getByRole('dialog', { name: 'Ingredients Step 1' })
    expect(within(card).getByText('Lime leaves').closest('li')).toHaveTextContent('Lime leaves4')
    fireEvent.keyDown(screenEl(), { key: 'ArrowDown' })
    fireEvent.pointerDown(screenEl(), { clientX: 300, clientY: 400 })
    fireEvent.pointerUp(screenEl(), { clientX: 300, clientY: 200 })
    expect(current()).toHaveTextContent('Step 1')

    fireEvent.click(within(card).getByRole('button', { name: 'Done' }))
    closed()
    fireEvent.click(pill())
    fireEvent.click(screen.getByRole('button', { name: 'Close ingredients' }))
    closed()
    fireEvent.click(pill())
    fireEvent.keyDown(screenEl(), { key: 'Escape' })
    closed()
  })

  it('hides Ingredients on steps without any', () => {
    render(<CookingStepBoard />)
    fireEvent.click(screen.getByRole('button', { name: 'Step 4' }))
    expect(current()).toHaveTextContent('Cook the paste')
    expect(screen.queryByRole('button', { name: 'Ingredients' })).not.toBeInTheDocument()
  })

  it('shows Done only on the last step, and Done goes back', () => {
    const done = vi.fn()
    render(<CookingStepBoard onDone={done} />)
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Step 8' }))
    expect(current()).toHaveTextContent('Serve on pandan rice.')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('without a host, Done links to the fridge', () => {
    render(<CookingStepBoard step={7} />)
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/boards/fridge')
  })
})
