import { Profiler } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitchenMockup } from './KitchenMockup'

vi.mock('./buildScene', () => ({ buildScene: () => () => {} }))
vi.mock('@/grandma/speakReply', () => ({ speakReply: vi.fn(async () => {}), stopSpeaking: vi.fn() }))

afterEach(cleanup)

describe('KitchenMockup perspectives', () => {
  it('swipes from Grandma recording to the Grandkids recipe and back', () => {
    render(<KitchenMockup />)
    const stage = screen.getByTestId('kitchen-perspective-stage')

    expect(stage).toHaveAttribute('data-perspective', 'grandma')
    expect(stage).toHaveAttribute('data-transition', 'slow-slide')
    expect(screen.getByRole('button', { name: 'Grandma' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Grandkids' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.pointerDown(stage, { clientX: 520 })
    fireEvent.pointerUp(stage, { clientX: 120 })

    expect(stage).toHaveAttribute('data-perspective', 'grandkids')
    expect(screen.getByRole('button', { name: 'Grandkids' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Lawar Bali' })).toBeVisible()

    fireEvent.pointerDown(stage, { clientX: 120 })
    fireEvent.pointerUp(stage, { clientX: 520 })

    expect(stage).toHaveAttribute('data-perspective', 'grandma')
    expect(screen.getByRole('button', { name: 'Record' })).toBeVisible()
  })

  it('allows the perspective labels to switch without swiping', () => {
    render(<KitchenMockup />)

    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    expect(screen.getByTestId('kitchen-perspective-stage')).toHaveAttribute('data-perspective', 'grandkids')

    fireEvent.click(screen.getByRole('button', { name: 'Grandma' }))
    expect(screen.getByTestId('kitchen-perspective-stage')).toHaveAttribute('data-perspective', 'grandma')
  })

  it('opens the cooking step from the grandkids view', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).getByRole('button', { name: 'Step 1' })).toHaveAttribute('aria-current', 'step')
    expect(board).toHaveTextContent('half the onions, garlic, sambal')
    expect(within(board).queryByRole('button', { name: /Oma Lien’s words/ })).not.toBeInTheDocument()
  })

  it('shows the wordless recipe-change voice treatment on a cooking step', () => {
    render(<KitchenMockup voiceStatus="listening" />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).getByTestId('step-voice-overlay')).toBeInTheDocument()
    expect(within(board).queryByText(/Listening|Thinking|Speaking/i)).not.toBeInTheDocument()
  })

  it('shows what the step uses only after Ingredients is pressed', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))

    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement
    expect(within(board).queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(within(board).getByRole('button', { name: 'Ingredients' }))
    const uses = within(board).getByRole('dialog', { name: 'Ingredients Step 1' })
    for (const name of ['Onions', 'Garlic', 'Sambal', 'Kencur', 'Pepper', 'Lime leaves']) {
      expect(within(uses).getByText(name)).toBeInTheDocument()
    }
  })

  it('moves through the steps with the step bars, keeping one screen', () => {
    render(<KitchenMockup />)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open step 1' }))
    const board = document.querySelector('.kitchen__grandkids-view--in') as HTMLElement

    fireEvent.click(within(board).getByRole('button', { name: 'Step 8' }))
    expect(document.querySelector('.kitchen__grandkids-view--in')).toBe(board)
    expect(within(board).getByRole('button', { name: 'Step 8' })).toHaveAttribute('aria-current', 'step')
    expect(screen.queryByRole('button', { name: 'Next instruction' })).not.toBeInTheDocument()
  })

  it('follows a swipe without re-rendering the kitchen on every move', () => {
    let commits = 0
    render(<Profiler id="kitchen" onRender={() => { commits++ }}><KitchenMockup /></Profiler>)
    fireEvent.click(screen.getByRole('button', { name: 'Grandkids' }))
    const stage = screen.getByTestId('kitchen-perspective-stage')
    const host = screen.getByTestId('kitchen-grandkids')
    commits = 0

    fireEvent.pointerDown(stage, { clientX: 100 })
    for (let x = 101; x <= 140; x++) fireEvent.pointerMove(stage, { clientX: x })
    // It leans a third of the way with the finger.
    expect(host).toHaveStyle({ transform: 'translateX(13.6px)' })
    expect(host).toHaveClass('is-dragging')
    fireEvent.pointerUp(stage, { clientX: 140 })

    expect(host.style.transform).toBe('')
    expect(host).not.toHaveClass('is-dragging')
    // One render as the drag starts, one as it ends.
    expect(commits).toBeLessThanOrEqual(2)
  })
})
