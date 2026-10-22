// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultRecipe, type RecipeDoc } from '@/recipe/model'

let stored: RecipeDoc
vi.mock('@/recipe/store', () => ({
  loadRecipe: async () => stored,
  saveRecipe: async (doc: RecipeDoc) => { stored = doc },
}))

import { POST } from './route'

const NOTE = 'Add the pork and the toasted coconut.'
const request = (body: unknown, ip = '1.1.1.1') => new Request('http://localhost/api/recipe/change', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  body: JSON.stringify(body),
})
const modelSays = (decision: unknown) => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(decision) }] }] })

beforeEach(() => { stored = defaultRecipe() })
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('POST /api/recipe/change', () => {
  it('refuses a request without words or without saying which screen it comes from', async () => {
    expect((await POST(request({ transcript: '', from: 'grandkid' }, '2.2.2.2'))).status).toBe(400)
    expect((await POST(request({ transcript: 'hi', from: 'nobody' }, '2.2.2.2'))).status).toBe(400)
  })

  it('asks before changing anything: a first request becomes a question and the recipe stays as it was', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(modelSays({
      action: 'confirm',
      ops: [{ type: 'set_servings', number: 2, flag: null, find: null, replace: null }, { type: 'set_mild', number: null, flag: true, find: null, replace: null }],
      step: null,
      reply: 'Do you want me to halve it for two and make it milder?',
    }))))

    const body = await (await POST(request({ transcript: 'Hey Popo, two people and less spicy', from: 'grandkid' }, '3.3.3.3'))).json()
    expect(body.action).toBe('confirm')
    expect(body.reply).toBe('Do you want me to cook it for two and make it milder?')
    expect(body.ops).toEqual([{ type: 'set_servings', value: 2 }, { type: 'set_mild', value: true }])
    expect(stored.rev).toBe(0)
    expect(stored.mods.servings).toBe(4)
  })

  it('turns a change the model tried to make straight away into a question', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(modelSays({
      action: 'change_recipe',
      ops: [{ type: 'set_servings', number: 2, flag: null, find: null, replace: null }],
      step: null,
      reply: 'Done!',
    }))))
    const body = await (await POST(request({ transcript: 'make it for two', from: 'grandkid' }, '3.3.3.4'))).json()
    expect(body.action).toBe('confirm')
    expect(body.reply).toBe('Do you want me to cook it for two?')
    expect(stored.rev).toBe(0)
  })

  it('makes the change, saves it and returns it once the person has said yes', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(modelSays({
      action: 'change_recipe',
      ops: [{ type: 'set_servings', number: 2, flag: null, find: null, replace: null }],
      step: null,
      reply: 'Two servings — done.',
    }))))

    const response = await POST(request({ transcript: 'yes please', from: 'grandkid', pending: [{ type: 'set_servings', value: 2 }] }, '3.3.3.5'))
    const body = await response.json()
    expect(body.action).toBe('change_recipe')
    expect(body.change).toBe('serves2')
    expect(body.recipe.mods.servings).toBe(2)
    expect(body.recipe.rev).toBe(1)
    expect(stored.versions[0].who).toBe('Grandkid')
  })

  it('swaps a word in Grandma’s story only when that word is in her note', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const swap = (find: string) => vi.fn(async () => Response.json(modelSays({
      action: 'change_recipe',
      ops: [{ type: 'swap_word', number: null, flag: null, find, replace: 'beef' }],
      step: null,
      reply: 'Swapped.',
    })))
    const yes = [{ type: 'swap_word', find: 'pork', replace: 'beef' }]

    vi.stubGlobal('fetch', swap('pork'))
    const ok = await (await POST(request({ transcript: 'yes', from: 'grandma', note: NOTE, pending: yes }, '4.4.4.4'))).json()
    expect(ok.swap).toEqual({ find: 'pork', replace: 'beef' })
    expect(stored.storyEdits).toEqual([{ find: 'pork', replace: 'beef' }])

    vi.stubGlobal('fetch', swap('salmon'))
    const missing = await (await POST(request({ transcript: 'replace salmon with beef', from: 'grandma', note: NOTE }, '4.4.4.4'))).json()
    expect(missing.swap).toBeNull()
    expect(missing.action).toBe('unclear')
    expect(stored.rev).toBe(1)
  })

  it('still works when the model cannot be reached: it asks, then does it on a yes, or leaves it on a no', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no credits', { status: 429 })))
    const ask = await (await POST(request({ transcript: 'make it for two', from: 'grandkid' }, '5.5.5.5'))).json()
    expect(ask.action).toBe('confirm')
    expect(stored.mods.servings).toBe(4)

    const no = await (await POST(request({ transcript: 'no thanks', from: 'grandkid', pending: ask.ops }, '5.5.5.5'))).json()
    expect(no.reply).toContain('leave it')
    expect(stored.mods.servings).toBe(4)

    const yes = await (await POST(request({ transcript: 'yes', from: 'grandkid', pending: ask.ops }, '5.5.5.5'))).json()
    expect(yes.change).toBe('serves2')
    expect(stored.mods.servings).toBe(2)
  })

  it('slows down a caller who asks too often', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    let last = 200
    for (let i = 0; i < 14; i++) last = (await POST(request({ transcript: 'make it milder', from: 'grandkid' }, '6.6.6.6'))).status
    expect(last).toBe(429)
  })
})
