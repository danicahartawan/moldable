// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const recipeState = {
  servings: 2 as const,
  activeStep: 2,
  versionLabel: 'Nevan + Fred · 2 servings',
  kencurSubstitution: true,
}

function request(body: unknown) {
  return new Request('http://localhost/api/grandkids/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function responsesPayload(answer: unknown) {
  return {
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }],
  }
}

describe('POST /api/grandkids/ask', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns 503 without calling OpenAI when the server key is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request({ question: 'What is kencur?', recipeState, history: [] }))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['   ', 'x'.repeat(1001)])('rejects an invalid question', async (question) => {
    vi.stubEnv('OPENAI_API_KEY', 'server-key')
    vi.stubGlobal('fetch', vi.fn())

    expect((await POST(request({ question, recipeState, history: [] }))).status).toBe(400)
  })

  it('grounds the Responses request while keeping user words out of instructions', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'server-key')
    vi.stubEnv('OPENAI_GRANDKIDS_MODEL', 'gpt-test')
    const fetchMock = vi.fn().mockResolvedValue(Response.json(responsesPayload({
      answer: 'Oma says 2 ruas. Here we use ginger and lime zest.',
      target: 'ingredients',
      ingredient: 'kencur',
    })))
    vi.stubGlobal('fetch', fetchMock)
    const question = 'Where is the SECRET CHILD PHRASE?'
    const history = Array.from({ length: 5 }, (_, index) => ({
      question: `question ${index + 1}`,
      answer: `answer ${index + 1}`,
    }))

    const response = await POST(request({ question, recipeState, history }))

    expect(response.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer server-key')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('gpt-test')
    expect(body.instructions).toContain('segenggam')
    expect(body.instructions).toContain('Nevan + Fred · 2 servings')
    expect(body.instructions).toContain('Ginger + lime zest')
    expect(body.instructions).not.toContain('SECRET CHILD PHRASE')
    expect(JSON.stringify(body.input)).toContain(question)
    expect(JSON.stringify(body.input)).not.toContain('question 1')
    expect(JSON.stringify(body.input)).toContain('question 5')
    expect(body.text.format.type).toBe('json_schema')
  })

  it.each([
    { answer: 'Use the kencur line.', target: 'ingredients', ingredient: 'kencur' },
    { answer: 'Now toast the coconut.', target: 'step', step: 1 },
    { answer: 'Serve it on pandan rice.', target: 'step', step: 8 },
    { answer: 'It takes 40 minutes.', target: 'time' },
  ])('returns a validated public answer contract', async (answer) => {
    vi.stubEnv('OPENAI_API_KEY', 'server-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(responsesPayload(answer))))

    const response = await POST(request({ question: 'Help me', recipeState, history: [] }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(answer)
  })

  it.each([
    { answer: 'Unknown ingredient.', target: 'ingredients', ingredient: 'dragonfruit' },
    { answer: 'Bad step.', target: 'step', step: 0 },
    { answer: 'Bad step.', target: 'step', step: 9 },
    { answer: 'Fractional step.', target: 'step', step: 2.5 },
  ])('rejects structured answers that cannot map to the recipe', async (answer) => {
    vi.stubEnv('OPENAI_API_KEY', 'server-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(responsesPayload(answer))))

    expect((await POST(request({ question: 'Help me', recipeState, history: [] }))).status).toBe(502)
  })

  it.each([
    Response.json({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] }] }),
    Response.json(responsesPayload('{not-json')),
    new Response('upstream secret body', { status: 500 }),
  ])('returns a generic 502 for malformed, refused, or failed upstream output', async (upstreamResponse) => {
    vi.stubEnv('OPENAI_API_KEY', 'server-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstreamResponse))

    const response = await POST(request({ question: 'Help me', recipeState, history: [] }))
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain('upstream secret body')
    expect(body).not.toContain('No.')
  })

  it('rejects malformed recipe state before calling OpenAI', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'server-key')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request({ question: 'Help me', recipeState: { ...recipeState, servings: 12 }, history: [] }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
