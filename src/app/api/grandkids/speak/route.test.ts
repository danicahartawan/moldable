// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

describe('POST /api/grandkids/speak', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns no-store speech audio using the Grandkids ElevenLabs voice', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('audio-bytes', {
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    })))

    const response = await POST(new Request('http://localhost/api/grandkids/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Toast the coconut gently.' }),
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('audio/mpeg')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/text-to-speech/dqoT2ZtOCpbG5tUUBU2W',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'xi-api-key': 'test-key' }),
      }),
    )
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(init?.body)).not.toContain('test-key')
  })

  it('rejects empty speech text', async () => {
    vi.stubEnv('ELEVENLABS_API_KEY', 'test-key')

    const response = await POST(new Request('http://localhost/api/grandkids/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    }))

    expect(response.status).toBe(400)
  })
})
