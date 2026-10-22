// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyOps, defaultRecipe } from './model'
import { loadRecipe, saveRecipe, updateRecipe } from './store'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('recipe store with a Redis database', () => {
  it('reads and writes the recipe over REST with the token', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://db.example.test')
    vi.stubEnv('KV_REST_API_TOKEN', 'secret')
    let value: string | null = null
    const calls: string[][] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const command = JSON.parse(init.body as string) as string[]
      calls.push(command)
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret')
      if (command[0] === 'SET') value = command[2]
      return Response.json({ result: command[0] === 'GET' ? value : 'OK' })
    }))

    expect((await loadRecipe()).rev).toBe(0)
    const { after } = await updateRecipe((doc) => applyOps(doc, [{ type: 'set_servings', value: 2 }], 'Grandkid'))
    expect(after.mods.servings).toBe(2)
    expect((await loadRecipe()).mods.servings).toBe(2)
    expect(calls.map((c) => c[0])).toEqual(['GET', 'GET', 'SET', 'GET'])
  })

  it('falls back to the last saved recipe when the database cannot be reached', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://db.example.test')
    vi.stubEnv('KV_REST_API_TOKEN', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const doc = applyOps(defaultRecipe(), [{ type: 'set_mild', value: true }], 'Grandma')
    await saveRecipe(doc).catch(() => {})
    expect((await loadRecipe()).mods.mild).toBe(true)
  })
})
