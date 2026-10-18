import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RollingTranscript } from './RollingTranscript'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('RollingTranscript', () => {
  it('renders nothing without transcript or error content', () => {
    render(<RollingTranscript finalText="" interimText="" errorMessage={null} />)
    expect(screen.queryByRole('region', { name: 'Live transcript' })).not.toBeInTheDocument()
  })

  it('renders final and interim text as one coherent live region', () => {
    vi.useFakeTimers()
    const view = render(
      <RollingTranscript finalText="Toast the spices." interimText=" Add broth." errorMessage={null} />,
    )
    const region = screen.getByRole('region', { name: 'Live transcript' })

    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'true')
    act(() => { vi.advanceTimersByTime('Toast the spices.'.length * 28) })
    expect(view.container.querySelector('.grandma-transcript__final')).toHaveTextContent('Toast the spices.')
    expect(view.container.querySelector('.grandma-transcript__interim')).toHaveTextContent('Add broth.')
  })

  it('replaces transcript content with a status error', () => {
    render(
      <RollingTranscript finalText="Old words" interimText="" errorMessage="Microphone access was denied." />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Microphone access was denied.')
    expect(screen.queryByText('Old words')).not.toBeInTheDocument()
  })

  it('marks only newly appended final text for visual motion', () => {
    vi.useFakeTimers()
    const view = render(<RollingTranscript finalText="Grandma" interimText="" errorMessage={null} />)
    act(() => { vi.advanceTimersByTime('Grandma'.length * 28) })
    view.rerender(<RollingTranscript finalText="Grandma cooked slowly." interimText="" errorMessage={null} />)
    act(() => { vi.advanceTimersByTime(' cook'.length * 28) })

    const region = screen.getByRole('region', { name: 'Live transcript' })
    expect(view.container.querySelector('.grandma-transcript__accessible')).toHaveTextContent('Grandma cooked slowly.')
    expect(view.container.querySelector('.grandma-transcript__new')).toHaveTextContent('cook')
    expect(view.container.querySelector('.grandma-transcript__settled')).toHaveTextContent('Grandma')
  })

  it('types final transcript text one character at a time', () => {
    vi.useFakeTimers()
    const view = render(<RollingTranscript finalText="Soup" interimText="" errorMessage={null} />)
    const typedText = view.container.querySelector('.grandma-transcript__new')

    expect(typedText).toBeEmptyDOMElement()
    act(() => { vi.advanceTimersByTime(28) })
    expect(typedText).toHaveTextContent('S')
    act(() => { vi.advanceTimersByTime(84) })
    expect(view.container.querySelector('.grandma-transcript__final')).toHaveTextContent('Soup')
    expect(view.container.querySelector('.grandma-transcript__accessible')).toHaveTextContent('Soup')
  })
})
