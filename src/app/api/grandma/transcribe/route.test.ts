// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

describe('POST /api/grandma/transcribe', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('forwards recorded audio to OpenAI and returns the spoken words', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Toast the spices gently.' }),
    }))
    const form = new FormData()
    form.append('audio', new File(['voice'], 'recording.webm', { type: 'audio/webm' }))

    const response = await POST(new Request('http://localhost/api/grandma/transcribe', {
      method: 'POST',
      body: form,
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ transcript: 'Toast the spices gently.' })
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/audio/transcriptions', expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer test-key' },
    }))
  })
})
