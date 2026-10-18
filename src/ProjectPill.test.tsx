import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectPill } from './ProjectPill'

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
})

describe('ProjectPill', () => {
  it('exposes the Moldable brand and ten food choices as keyboard-focusable buttons', () => {
    render(<ProjectPill />)

    const chooser = screen.getByRole('group', { name: 'Choose a project' })
    const buttons = within(chooser).getAllByRole('button')

    expect(chooser).toHaveClass('project-pill')
    expect(screen.getByRole('img', { name: 'Moldable' })).toHaveAttribute('src', '/assets/moldable-logo.png')
    expect(buttons).toHaveLength(10)
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Bean pancakes',
      'Colorful rice cakes',
      'Brown layered cakes',
      'Banana leaf cakes',
      'Green coconut cakes',
      'Sesame balls',
      'Steamed cupcakes',
      'Wrapped rice cakes',
      'Red rice rolls',
      'Striped layer cake',
    ])
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('tabindex', '-1')
      expect(button.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/^\/assets\/food-/))
    })
  })

  it('does not render unrelated navigation or page content', () => {
    render(<ProjectPill />)

    expect(screen.queryByText(/about|contact|projects|catalog/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('keeps camera, chat, and a labeled record control outside the project chooser', () => {
    render(<ProjectPill />)

    const choosers = screen.getAllByRole('group', { name: 'Choose a project' })
    const actionGroups = screen.getAllByRole('group', { name: 'Quick actions' })
    const chooser = choosers[choosers.length - 1]
    const actions = actionGroups[actionGroups.length - 1]
    const buttons = within(actions).getAllByRole('button')

    expect(chooser).not.toContainElement(actions)
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Open camera',
      'Open chat',
      'Record',
    ])
    expect(within(actions).getByRole('button', { name: 'Record' })).toHaveTextContent('Record')
  })

  it('explains when live voice recording is unsupported', async () => {
    render(<ProjectPill />)

    const recordButtons = screen.getAllByRole('button', { name: 'Record' })
    fireEvent.click(recordButtons[recordButtons.length - 1])

    expect(await screen.findByText('Live voice recording is not supported in this browser.')).toBeInTheDocument()
  })

  it('starts and stops microphone capture and speech recognition', async () => {
    const stopTrack = vi.fn()
    const recorderStart = vi.fn()
    const recorderStop = vi.fn()
    const recognitionStart = vi.fn()
    const recognitionStop = vi.fn()
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(stream)

    class FakeMediaRecorder {
      state: RecordingState = 'inactive'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null

      start() {
        this.state = 'recording'
        recorderStart()
      }

      stop() {
        this.state = 'inactive'
        recorderStop()
        this.onstop?.()
      }
    }

    class FakeSpeechRecognition {
      continuous = false
      interimResults = false
      onresult: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onend: (() => void) | null = null
      start = recognitionStart
      stop = recognitionStop
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('SpeechRecognition', FakeSpeechRecognition)

    const view = render(<ProjectPill />)
    fireEvent.click(within(view.container).getByRole('button', { name: 'Record' }))

    const stopButton = await within(view.container).findByRole('button', { name: 'Stop recording' })
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(recorderStart).toHaveBeenCalledOnce()
    expect(recognitionStart).toHaveBeenCalledOnce()
    expect(stopButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(stopButton)

    expect(await within(view.container).findByRole('button', { name: 'Record' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(view.container).getByRole('heading', { name: 'Soto Ayam' })).toBeInTheDocument()
    expect(within(view.container).getByRole('article', { name: 'Soto Ayam recipe' })).toHaveClass(
      'recipe-article',
    )
    expect(within(view.container).getByRole('img', { name: 'An illustrated bowl of Soto Ayam' })).toHaveClass(
      'recipe-article__illustration',
    )
    expect(within(view.container).getByText(/Begin by pounding garlic/)).toBeInTheDocument()
    expect(recorderStop).toHaveBeenCalledOnce()
    expect(recognitionStop).toHaveBeenCalledOnce()
    expect(stopTrack).toHaveBeenCalledOnce()
  })

  it('shows final and in-progress speech as a transcript', async () => {
    let recognition: FakeSpeechRecognition | undefined

    class FakeMediaRecorder {
      state: RecordingState = 'inactive'
      start() { this.state = 'recording' }
      stop() { this.state = 'inactive' }
    }

    class FakeSpeechRecognition {
      continuous = false
      interimResults = false
      onresult: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onend: (() => void) | null = null
      start() { recognition = this }
      stop() {}
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    })
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('SpeechRecognition', FakeSpeechRecognition)

    const view = render(<ProjectPill />)
    fireEvent.click(within(view.container).getByRole('button', { name: 'Record' }))
    await within(view.container).findByRole('button', { name: 'Stop recording' })

    recognition?.onresult?.({
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'Build the quiet interface.' }], { isFinal: true }),
        Object.assign([{ transcript: ' Then soften the edges.' }], { isFinal: false }),
      ],
    } as unknown as Event)

    expect(await within(view.container).findByText(/Build the quiet interface/)).toHaveTextContent(
      'Build the quiet interface. Then soften the edges.',
    )
  })
})
