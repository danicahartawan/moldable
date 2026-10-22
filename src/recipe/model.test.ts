import { describe, expect, it } from 'vitest'
import { applyOps, defaultRecipe, isOp, screenChange } from './model'

const now = new Date('2026-10-21T20:00:00Z')

describe('applyOps', () => {
  it('changes the recipe, adds a version and bumps the rev without touching the old one', () => {
    const base = defaultRecipe(now)
    const next = applyOps(base, [{ type: 'set_servings', value: 2 }], 'Grandkid', now)
    expect(next.rev).toBe(1)
    expect(next.mods.servings).toBe(2)
    expect(next.versions[0]).toMatchObject({ version: 4, who: 'Grandkid', what: 'Servings 4 → 2' })
    expect(base.mods.servings).toBe(4)
    expect(base.rev).toBe(0)
  })

  it('drops changes that change nothing', () => {
    const base = defaultRecipe(now)
    expect(applyOps(base, [{ type: 'set_servings', value: 4 }, { type: 'set_mild', value: false }], 'Grandkid', now)).toBe(base)
  })

  it('swaps a word in Grandma’s story, and a second swap of the same word replaces the first', () => {
    let doc = applyOps(defaultRecipe(now), [{ type: 'swap_word', find: 'pork', replace: 'beef' }], 'Grandma', now)
    expect(doc.storyEdits).toEqual([{ find: 'pork', replace: 'beef' }])
    doc = applyOps(doc, [{ type: 'swap_word', find: 'Pork', replace: 'chicken' }], 'Grandma', now)
    expect(doc.storyEdits).toEqual([{ find: 'Pork', replace: 'chicken' }])
    expect(doc.versions[0].what).toContain('chicken')
  })

  it('applies several changes as one version, and reset puts everything back', () => {
    const doc = applyOps(defaultRecipe(now), [{ type: 'set_servings', value: 2 }, { type: 'set_mild', value: true }], 'Grandkid', now)
    expect(doc.versions).toHaveLength(1)
    expect(doc.mods).toMatchObject({ servings: 2, mild: true })
    const reset = applyOps(doc, [{ type: 'reset' }], 'Grandkid', now)
    expect(reset.mods).toEqual(defaultRecipe(now).mods)
    expect(reset.storyEdits).toEqual([])
  })
})

describe('isOp', () => {
  it('accepts well-formed changes and refuses the rest', () => {
    expect(isOp({ type: 'set_servings', value: 2 })).toBe(true)
    expect(isOp({ type: 'set_servings', value: 3 })).toBe(false)
    expect(isOp({ type: 'swap_word', find: 'pork', replace: 'beef' })).toBe(true)
    expect(isOp({ type: 'swap_word', find: '<script>', replace: 'x' })).toBe(false)
    expect(isOp({ type: 'drop_tables' })).toBe(false)
  })
})

describe('screenChange', () => {
  it('maps the first change the Grandkids screen animates', () => {
    expect(screenChange([{ type: 'set_servings', value: 2 }])).toBe('serves2')
    expect(screenChange([{ type: 'swap_word', find: 'a', replace: 'b' }])).toBeNull()
    expect(screenChange([{ type: 'set_kencur_swapped', value: true }])).toBe('kencur_swap')
  })
})
