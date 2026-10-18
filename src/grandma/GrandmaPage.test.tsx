import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GrandmaPage } from './GrandmaPage'

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }

let recognition: FakeRecognition
let mediaRecorder: FakeMediaRecorder

class FakeRecognition {
  continuous = false
  interimResults = false
  onresult: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()

  emit(...results: RecognitionResult[]) {
    this.onresult?.({ resultIndex: 0, results } as unknown as Event)
  }
}

class FakeMediaRecorder {
  state: RecordingState = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: BlobEvent) => void) | null = null

  constructor() { mediaRecorder = this }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive' }

  emitAudio(data: Blob) {
    this.ondataavailable?.({ data } as BlobEvent)
  }
}

describe('GrandmaPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    recognition = new FakeRecognition()
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('webkitSpeechRecognition', function FakeRecognitionConstructor() { return recognition })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
    })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string | URL | Request) => ({
      ok: true,
      json: async () => String(input).includes('/api/grandma/transcribe')
        ? { transcript: 'Toast the spices gently.' }
        : { title: 'Sunday Soto Stories' },
    })))
  })

  it('starts as a blank recording canvas with a compact record control', () => {
    render(<GrandmaPage />)

    expect(screen.getByRole('main', { name: 'Record grandma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record' })).toHaveClass(
      'grandma-record-button--plain',
      'grandma-record-button--embossed',
    )
    expect(screen.getByTestId('grandma-header')).toHaveClass('grandma-header--right')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByTestId('character-placeholder')).not.toBeInTheDocument()
  })

  it('shows a constrained live preview and moves to the complete transcript after stopping', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording' })).toBeInTheDocument())

    recognition.emit({
      isFinal: true,
      0: { transcript: 'Grandma toasted the spices slowly. Then she added the broth and told us to wait for the fragrance. We stayed beside the stove until the whole kitchen smelled warm.' },
    })

    const preview = await screen.findByTestId('transcript-preview')
    expect(preview).toHaveClass('grandma-transcript--preview', 'grandma-transcript--under-control')
    expect(await screen.findByRole('heading', { name: 'Sunday Soto Stories' })).toHaveClass('grandma-generated-title')
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))

    expect(await screen.findByRole('heading', { name: 'Sunday Soto Stories' })).toBeInTheDocument()
    expect(screen.getByTestId('complete-transcript')).toHaveTextContent('Grandma toasted the spices slowly')
    expect(screen.queryByTestId('transcript-preview')).not.toBeInTheDocument()
  })

  it('requests an AI title only after a few sentences have been transcribed', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(recognition.start).toHaveBeenCalled())

    recognition.emit({ isFinal: true, 0: { transcript: 'One short sentence.' } })
    expect(fetch).not.toHaveBeenCalled()

    recognition.emit({
      isFinal: true,
      0: { transcript: ' Then the broth began to simmer with the toasted spices. Grandma smiled and added a final pinch of salt while we waited together by the warm stove.' },
    })

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/grandma/title', expect.objectContaining({ method: 'POST' })))
    expect(await screen.findByRole('heading', { name: 'Sunday Soto Stories' })).toBeInTheDocument()
    expect(screen.getByTestId('grandma-header')).toContainElement(
      screen.getByRole('heading', { name: 'Sunday Soto Stories' }),
    )
  })

  it('keeps the pending title beside Stop and never moves it onto the completed transcript', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(recognition.start).toHaveBeenCalled())

    recognition.emit({
      isFinal: true,
      0: { transcript: 'Grandma toasted the spices slowly. Then she poured in the broth and lowered the heat. We waited together until the whole kitchen smelled warm and peppery.' },
    })

    const pendingTitle = await screen.findByText('Naming this story…')
    const stopButton = screen.getByRole('button', { name: 'Stop recording' })
    expect(screen.getByTestId('grandma-header')).toContainElement(pendingTitle)

    fireEvent.click(stopButton)
    expect(await screen.findByTestId('complete-transcript')).toBeInTheDocument()
    expect(screen.queryByText('Naming this story…')).not.toBeInTheDocument()
  })

  it('explains when the browser finishes without producing a transcript', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(recognition.start).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))

    expect(await screen.findByTestId('complete-transcript')).toHaveTextContent(
      'No transcript was captured in this browser.',
    )
  })

  it('places listening and live transcription directly beneath Stop', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    const stopButton = await screen.findByRole('button', { name: 'Stop recording' })
    const controls = screen.getByTestId('grandma-recorder-stack')

    expect(controls).toContainElement(stopButton)
    expect(controls).toContainElement(screen.getByText('Listening…'))

    recognition.emit({ isFinal: false, 0: { transcript: 'Toast the spices gently.' } })
    expect(await screen.findByTestId('transcript-preview')).toHaveClass('grandma-transcript--under-control')
  })

  it('shows actual spoken words from OpenAI audio transcription', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await screen.findByRole('button', { name: 'Stop recording' })

    mediaRecorder.emitAudio(new Blob(['recorded voice'], { type: 'audio/webm' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/api/grandma/transcribe',
      expect.objectContaining({ method: 'POST' }),
    ))
    expect(await screen.findByTestId('transcript-preview')).toHaveTextContent('Toast the spices gently.')
  })
})
