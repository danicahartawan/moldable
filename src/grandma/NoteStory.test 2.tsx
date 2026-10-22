import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoteStory } from './NoteStory'
import { ListeningClay, RecipeChangeOverlay, TitlePreview } from './GrandmaMinimalPage'

describe('NoteStory tool words', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('emphasizes ingredients while a detected tool waits to become a chip', async () => {
    vi.useFakeTimers()
    const { container } = render(
      <NoteStory
        text="Use onion and [Blend] until smooth."
        visibleLength={100}
        interimText=""
        photos={[]}
      />,
    )

    expect(container.querySelector('.gm-ingredient-word')).toHaveTextContent('onion')
    expect(getComputedStyle(container.querySelector('.gm-ingredient-word') as Element).fontWeight).toBe('normal')
    expect(container.querySelector('.gm-ingredient-word')).toHaveAttribute('data-effect', 'ink-reveal')
    expect(container.querySelector('.gm-tool-pending')).toHaveTextContent('Blend')
    expect(container.querySelector('.gm-tool-word')).not.toBeInTheDocument()
    expect(container.querySelector('.grandma-transcript-tool-chip')).not.toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(1_499) })
    expect(container.querySelector('.gm-tool-pending')).toHaveTextContent('Blend')

    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(container.querySelector('.gm-tool-pending')).not.toBeInTheDocument()
    const chip = container.querySelector('.grandma-transcript-tool-chip') as Element
    expect(chip).toHaveTextContent('Blend')
    expect(chip).toHaveAttribute('data-entrance', 'pop-up')
  })
})

describe('NoteStory without colour', () => {
  it('keeps the tool words and ingredients plain when colorize is off', () => {
    const { container } = render(
      <NoteStory text="Use onion and [Blend] until smooth." visibleLength={100} interimText="" photos={[]} colorize={false} />,
    )

    expect(container.querySelector('.gm-ingredient-word')).not.toBeInTheDocument()
    expect(container.querySelector('.grandma-transcript-tool-chip')).not.toBeInTheDocument()
    expect(container.querySelector('.gm-tool-pending')).toHaveTextContent('Blend')
  })
})

describe('Recipe change voice feedback', () => {
  it('uses the shared listening treatment then only says Ok, got it before applying', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })))
    const onClose = vi.fn()
    const onHeard = vi.fn()
    render(<RecipeChangeOverlay levelRef={{ current: null }} onClose={onClose} onHeard={onHeard} />)

    expect(document.querySelector('[data-voice-type="mobile"]')).toBeInTheDocument()
    expect(document.querySelector('.vn')).toHaveTextContent('Listening…')
    expect(document.querySelector('.vn')).toHaveTextContent('Say what you’d like to change')

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
    expect(onHeard).toHaveBeenCalledOnce()
    expect(document.querySelector('.vn')).toHaveTextContent('Ok, got it!')
    expect(document.querySelector('.vn')).not.toHaveTextContent('Done')

    await act(async () => { await vi.advanceTimersByTimeAsync(1_300) })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('Grandma title preview', () => {
  it('keeps the title as New Recipe before naming it', () => {
    const { container } = render(<TitlePreview />)

    expect(container).toHaveTextContent('New Recipe')
    expect(container).not.toHaveTextContent('Lawar Bali')
    expect(container.querySelector('.md-dots')).not.toBeInTheDocument()
  })
})

describe('Listening bot', () => {
  it('renders a bot avatar that sleeps while paused', () => {
    const { container, rerender } = render(<ListeningClay isPaused={false} />)
    expect(container.querySelector('.gm-clay [role="img"]')).toBeInTheDocument()

    rerender(<ListeningClay isPaused />)
    expect(container.querySelector('.gm-clay')).toHaveClass('is-paused')
  })
})
