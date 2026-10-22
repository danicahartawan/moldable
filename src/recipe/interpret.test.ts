import { describe, expect, it } from 'vitest'
import { fallbackDecision, toOps } from './interpret'
import { defaultRecipe } from './model'

describe('toOps', () => {
  it('turns the model’s flat changes into checked ones and drops the rest', () => {
    expect(toOps([
      { type: 'set_servings', number: 2, flag: null, find: null, replace: null },
      { type: 'set_servings', number: 7, flag: null, find: null, replace: null },
      { type: 'set_mild', number: null, flag: true, find: null, replace: null },
      { type: 'swap_word', number: null, flag: null, find: 'pork', replace: 'beef' },
      { type: 'swap_word', number: null, flag: null, find: 'salmon', replace: 'beef' },
      { type: 'wipe', number: null, flag: null, find: null, replace: null },
    ], 'Add the pork and the coconut.')).toEqual([
      { type: 'set_servings', value: 2 },
      { type: 'set_mild', value: true },
      { type: 'swap_word', find: 'pork', replace: 'beef' },
    ])
  })
})

describe('fallbackDecision', () => {
  const doc = defaultRecipe()
  it('reads the simple requests', () => {
    expect(fallbackDecision('make it for two', doc, '').ops).toEqual([{ type: 'set_servings', value: 2 }])
    expect(fallbackDecision('replace pork with beef', doc, 'the pork').ops).toEqual([{ type: 'swap_word', find: 'pork', replace: 'beef' }])
    expect(fallbackDecision('replace salmon with beef', doc, 'the pork').action).toBe('unclear')
    expect(fallbackDecision('go to step 3', doc, '')).toMatchObject({ action: 'go_to_step', step: 3 })
    expect(fallbackDecision('swap the kencur', doc, '').ops).toEqual([{ type: 'set_kencur_swapped', value: true }])
  })
})
