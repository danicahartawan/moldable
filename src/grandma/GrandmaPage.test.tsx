import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

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

  it('starts in the square HomeView with a compact record control and cloud companion', () => {
    render(<GrandmaPage />)

    expect(screen.getByRole('main', { name: 'Grandma HomeView' })).toBeInTheDocument()
    expect(document.querySelector('.grandma-homeview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record' })).toHaveClass('grandma-recorder-card__idle')
    expect(screen.getByRole('button', { name: 'Record' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('img', { name: 'Grandma companion' })).toHaveAttribute('src', expect.stringContaining(encodeURIComponent('/assets/mascot-blue.png')))
    expect(screen.getByTestId('grandma-header')).toHaveClass('grandma-header--right')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Guiding questions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Live transcript' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Mold shelf' })).not.toBeInTheDocument()
  })

  it('shows a constrained live preview and stays inside HomeView after stopping', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording' })).toHaveAttribute('aria-pressed', 'true'))

    recognition.emit({
      isFinal: true,
      0: { transcript: 'Grandma toasted the spices slowly. Then she added the broth and told us to wait for the fragrance. We stayed beside the stove until the whole kitchen smelled warm.' },
    })

    const preview = await screen.findByRole('region', { name: 'Live transcript' })
    expect(preview).toHaveTextContent('Grandma toasted the spices slowly.')
    expect(await screen.findByRole('heading', { name: 'Sunday Soto Stories' })).toHaveClass('grandma-generated-title')
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))

    expect(await screen.findByRole('main', { name: 'Grandma story HomeView' })).toBeInTheDocument()
    expect(document.querySelector('.grandma-handoff')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Transcript' })).toHaveTextContent('Grandma toasted the spices slowly.')
    expect(screen.getByRole('button', { name: 'Tidy' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Recipe change' }))
    expect(screen.getByRole('region', { name: 'Recipe' })).toHaveTextContent('Toast the grated coconut')
    fireEvent.click(screen.getByRole('button', { name: 'Tidy' }))
    expect(await screen.findByRole('heading', { name: 'Lelawar Bali' }, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Live transcript' })).not.toBeInTheDocument()
  })

  it('says one sentence, then goes quiet', async () => {
    vi.useFakeTimers()
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await act(async () => {})

    const transcript = () => screen.getByRole('region', { name: 'Live transcript' })
    expect(transcript()).toHaveTextContent('Take half an onion, garlic, chili, kencur, pepper, and lime leaves.')
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(transcript()).not.toHaveTextContent('No, you didn’t.')
    expect(transcript()).not.toHaveTextContent('Don’t make it completely watery')
    expect(document.querySelectorAll('.grandma-transcript-tool-chip[data-tool="blend"]')).toHaveLength(1)
  })

  it('pulls a completed transcript tool into the Mold shelf and selects it', async () => {
    vi.useFakeTimers()
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await act(async () => {})

    await act(async () => { await vi.advanceTimersByTimeAsync(3_200) })

    expect(screen.getByRole('button', { name: 'Blend' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.grandma-tool-flight[data-tool="blend"]')).toHaveTextContent('Blend')
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
    expect(await screen.findByRole('main', { name: 'Grandma story HomeView' })).toBeInTheDocument()
    expect(screen.queryByText('Naming this story…')).not.toBeInTheDocument()
  })

  it('explains when the browser finishes without producing a transcript', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(recognition.start).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))

    expect(await screen.findByRole('main', { name: 'Grandma story HomeView' })).toBeInTheDocument()
  })

  it('keeps the area beneath Stop blank until real transcription arrives', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    const stopButton = await screen.findByRole('button', { name: 'Stop recording' })
    const controls = screen.getByTestId('grandma-recorder-stack')

    expect(controls).toContainElement(stopButton)
    expect(screen.queryByText('Listening…')).not.toBeInTheDocument()

    recognition.emit({ isFinal: false, 0: { transcript: 'Toast the spices gently.' } })
    expect(await screen.findByRole('region', { name: 'Live transcript' })).toHaveTextContent('Toast the spices gently.')
  })

  it('keeps the cloud companion visible while recording', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))

    const stopButton = await screen.findByRole('button', { name: 'Stop recording' })
    expect(stopButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('grandma-recorder-stack')).toContainElement(
      screen.getByRole('img', { name: 'Grandma companion' }),
    )
  })

  it('marks newly transcribed words for the rolling reveal', async () => {
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(recognition.start).toHaveBeenCalled())

    act(() => {
      recognition.emit({ isFinal: false, 0: { transcript: 'Soup' } })
    })

    const preview = screen.getByRole('region', { name: 'Live transcript' })
    expect(preview).toHaveTextContent('Soup')
    expect(document.querySelector('.grandma-transcript__interim')).toHaveTextContent('Soup')
  })

  it('shows contextual guidance on the left two seconds after recording starts', async () => {
    vi.useFakeTimers()
    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await act(async () => {})

    act(() => { vi.advanceTimersByTime(1_999) })
    expect(screen.queryByText('How old was Nev when that happened?')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.getByRole('region', { name: 'Guiding questions' })).toBeInTheDocument()
    expect(screen.getByText('How old was Nev when that happened?')).toHaveAttribute('aria-live', 'polite')

    act(() => { vi.advanceTimersByTime(10_000) })
    expect(screen.getByText('What should the beef smell like when it’s ready?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))
    expect(screen.queryByText('What should the beef smell like when it’s ready?')).not.toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByRole('region', { name: 'Live transcript' })).toHaveTextContent('Toast the spices gently.'))
  })

  it('keeps a successful transcript when a newer audio request fails', async () => {
    let finishFirstRequest: ((response: Response) => void) | undefined
    let transcriptionRequest = 0
    vi.mocked(fetch).mockImplementation(async (input: string | URL | Request) => {
      if (!String(input).includes('/api/grandma/transcribe')) {
        return { ok: true, json: async () => ({ title: 'Sunday Soto Stories' }) } as Response
      }

      transcriptionRequest += 1
      if (transcriptionRequest === 1) {
        return new Promise<Response>((resolve) => { finishFirstRequest = resolve })
      }
      return { ok: false, json: async () => ({ error: 'No speech was recognized.' }) } as Response
    })

    render(<GrandmaPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Record' }))
    await screen.findByRole('button', { name: 'Stop recording' })

    mediaRecorder.emitAudio(new Blob(['first recorded phrase'], { type: 'audio/webm' }))
    mediaRecorder.emitAudio(new Blob(['later silence'], { type: 'audio/webm' }))
    await waitFor(() => expect(transcriptionRequest).toBe(2))

    finishFirstRequest?.({
      ok: true,
      json: async () => ({ transcript: 'Grandma stirred the soup slowly.' }),
    } as Response)

    await waitFor(() => expect(screen.getByRole('region', { name: 'Live transcript' })).toHaveTextContent(
      'Grandma stirred the soup slowly.',
    ))
  })
})
