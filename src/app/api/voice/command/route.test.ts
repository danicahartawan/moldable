// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const recipeNow = { servings: 4 as const, mild: false, chicken: false, kencurSwapped: false }

const request = (body: unknown) => new Request('http://localhost/api/voice/command', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const payload = (command: unknown) => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(command) }] }] })

describe('POST /api/voice/command', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns 503 without calling OpenAI when the key is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const response = await POST(request({ transcript: 'make it for two', recipeNow, activeStep: null }))
    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a request with no transcript or a bad recipe state', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    expect((await POST(request({ transcript: '', recipeNow, activeStep: null }))).status).toBe(400)
    expect((await POST(request({ transcript: 'hi', recipeNow: { servings: 3 }, activeStep: null }))).status).toBe(400)
  })

  it('asks the model with the recipe as it stands and returns its decision', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const fetchMock = vi.fn(async () => Response.json(payload({ action: 'change_recipe', change: 'serves2', step: null, reply: 'Two it is — I halved everything.' })))
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request({ transcript: 'Hey Popo, make it for two', recipeNow, activeStep: null }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ action: 'change_recipe', change: 'serves2', reply: 'Two it is — I halved everything.' })

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)
    expect(body.instructions).toContain('Right now: 4 servings')
    expect(body.input[0].content).toBe('Hey Popo, make it for two')
  })

  it('refuses a decision that does not fit the schema', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(payload({ action: 'change_recipe', change: null, step: null, reply: 'Done' }))))
    const response = await POST(request({ transcript: 'do something', recipeNow, activeStep: null }))
    expect(response.status).toBe(502)
  })
})
