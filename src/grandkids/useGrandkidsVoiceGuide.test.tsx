import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useGrandkidsVoiceGuide } from './useGrandkidsVoiceGuide'

const recipeState = {
  servings: 4 as const,
  activeStep: null,
  versionLabel: null,
  kencurSubstitution: false,
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  stream: MediaStream
  state = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  constructor(stream: MediaStream) {
    this.stream = stream
    FakeMediaRecorder.instances.push(this)
  }

  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

class FakeAudio {
  static instances: FakeAudio[] = []
  static playError: Error | null = null
  src: string
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  play = vi.fn(() => FakeAudio.playError ? Promise.reject(FakeAudio.playError) : Promise.resolve())
  pause = vi.fn()

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
}

async function flushRequests() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}

describe('useGrandkidsVoiceGuide', () => {
  const track = { stop: vi.fn() }

  beforeEach(() => {
    vi.useFakeTimers()
    FakeMediaRecorder.instances = []
    FakeAudio.instances = []
    FakeAudio.playError = null
    track.stop.mockClear()
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:answer'),
      revokeObjectURL: vi.fn(),
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('records for five seconds before transcribing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ transcript: '' }, { status: 422 }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn() }))

    await act(async () => { await result.current.start() })
    expect(result.current.status).toBe('listening')
    expect(FakeMediaRecorder.instances[0].state).toBe('recording')

    await act(async () => { await vi.advanceTimersByTimeAsync(4999) })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1); await flushRequests() })

    expect(fetchMock).toHaveBeenCalledWith('/api/grandma/transcribe', expect.objectContaining({ method: 'POST' }))
    expect(track.stop).toHaveBeenCalled()
  })

  it('keeps the transcript private, targets the answer, and speaks only the answer text', async () => {
    const answer = { answer: 'Oma says segenggam—one handful.', target: 'ingredients' as const, ingredient: 'coconut' }
    const onTarget = vi.fn()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ transcript: 'how much coconut' }))
      .mockResolvedValueOnce(Response.json(answer))
      .mockResolvedValueOnce(new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget, recordingDurationMs: 5 }))

    await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })
    expect(result.current.status).toBe('speaking')

    expect(result.current).not.toHaveProperty('transcript')
    expect(result.current.answer).toBe(answer.answer)
    expect(onTarget).toHaveBeenCalledWith(answer)
    const askBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body))
    expect(askBody.question).toBe('how much coconut')
    const speakBody = JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body))
    expect(speakBody).toEqual({ text: answer.answer })

    act(() => { FakeAudio.instances[0].onended?.() })
    expect(result.current.status).toBe('idle')
  })

  it('returns a short retry message for blank recognition and skips ask and speech', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ transcript: '   ' }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn(), recordingDurationMs: 5 }))

    await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })
    expect(result.current.errorMessage).toBe('I didn’t catch that. Try again.')

    expect(result.current.status).toBe('idle')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats a transcription no-speech response as a retry, not an AI failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'No speech was recognized.' }, { status: 422 })))
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn(), recordingDurationMs: 5 }))

    await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })

    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBe('I didn’t catch that. Try again.')
  })

  it('cancels active media, requests, audio, and object URLs on restart and unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ transcript: 'question' }))
      .mockResolvedValueOnce(Response.json({ answer: 'Answer', target: 'overview' }))
      .mockResolvedValueOnce(new Response('audio'))
    vi.stubGlobal('fetch', fetchMock)
    const { result, unmount } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn(), recordingDurationMs: 5 }))

    await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })
    expect(result.current.status).toBe('speaking')
    await act(async () => { await result.current.start() })

    expect(FakeAudio.instances[0].pause).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:answer')
    unmount()
    expect(track.stop).toHaveBeenCalled()
  })

  it('keeps a visual answer available when speech generation fails', async () => {
    const answer = { answer: 'Use the dry pan.', target: 'tools' as const }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ transcript: 'what tool' }))
      .mockResolvedValueOnce(Response.json(answer))
      .mockResolvedValueOnce(Response.json({ error: 'no audio' }, { status: 502 })))
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn(), recordingDurationMs: 5 }))

    await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })
    expect(result.current.status).toBe('error')

    expect(result.current.answer).toBe(answer.answer)
    expect(result.current.target).toEqual(answer)
    expect(result.current.errorMessage).toBe('I can show you, but I can’t speak just now.')
  })

  it('releases generated audio when browser playback fails', async () => {
    FakeAudio.playError = new Error('autoplay blocked')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ transcript: 'what tool' }))
      .mockResolvedValueOnce(Response.json({ answer: 'Use the dry pan.', target: 'tools' }))
      .mockResolvedValueOnce(new Response('audio')))
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn(), recordingDurationMs: 5 }))

    await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('I can show you, but I can’t speak just now.')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:answer')
  })

  it('sends only the newest four complete conversation pairs', async () => {
    let transcriptNumber = 0
    const askBodies: Array<{ history: Array<{ question: string; answer: string }> }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/transcribe')) {
        transcriptNumber += 1
        return Response.json({ transcript: `question ${transcriptNumber}` })
      }
      if (String(url).endsWith('/ask')) {
        askBodies.push(JSON.parse(String(init?.body)))
        return Response.json({ answer: `answer ${transcriptNumber}`, target: 'overview' })
      }
      return new Response('audio')
    }))
    const { result } = renderHook(() => useGrandkidsVoiceGuide({ recipeState, onTarget: vi.fn(), recordingDurationMs: 5 }))

    for (let exchange = 0; exchange < 6; exchange += 1) {
      await act(async () => { await result.current.start(); await vi.advanceTimersByTimeAsync(5); await flushRequests() })
      act(() => { FakeAudio.instances[FakeAudio.instances.length - 1]?.onended?.() })
    }

    expect(askBodies[5].history).toEqual([
      { question: 'question 2', answer: 'answer 2' },
      { question: 'question 3', answer: 'answer 3' },
      { question: 'question 4', answer: 'answer 4' },
      { question: 'question 5', answer: 'answer 5' },
    ])
  })
})
