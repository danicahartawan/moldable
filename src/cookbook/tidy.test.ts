import { describe, expect, it } from 'vitest'
import { cleanDraft, fallbackTidy } from './tidy'

const KLEPON = 'Mix two cups of glutinous rice flour with pandan water until it is soft. Then roll small balls and put a piece of palm sugar inside. Boil them in a pot until they float, about ten minutes. Roll them in grated coconut. This feeds four people.'

describe('the rule-based tidy', () => {
  it('finds the ingredients with her amounts, the method, the tools, the time and servings', () => {
    const draft = fallbackTidy(KLEPON, 'Klepon')
    expect(draft.name).toBe('Klepon')
    expect(draft.ingredients.map((i) => i.name)).toEqual(expect.arrayContaining(['Glutinous rice flour', 'Palm sugar', 'Grated coconut', 'Pandan']))
    expect(draft.ingredients.find((i) => i.name === 'Glutinous rice flour')).toMatchObject({ amount: '2 cups', said: 'two cups of glutinous rice flour' })
    expect(draft.steps[1]).toBe('Roll small balls and put a piece of palm sugar inside.')
    expect(draft.tools).toEqual(expect.arrayContaining(['Pot', 'Bowl']))
    expect(draft.minutes).toBe(10)
    expect(draft.serves).toBe(4)
  })

  it('asks about what is missing, and folds her answers back in', () => {
    const draft = fallbackTidy('Fry the shallots and garlic. Add the chicken and cook it through.')
    expect(draft.questions).toEqual(['What do you call this dish?', 'How much shallots?', 'How much garlic?', 'How long does it take, start to finish?'])
    const answered = fallbackTidy('Fry the shallots and garlic. Add the chicken and cook it through.', '', [
      { question: 'What do you call this dish?', answer: 'We call it ayam goreng.' },
      { question: 'How much shallots?', answer: 'six of the shallots' },
      { question: 'How long does it take, start to finish?', answer: 'about half an hour' },
      { question: 'How many people does it feed?', answer: 'four' },
    ])
    expect(answered.name).toBe('Ayam goreng')
    expect(answered.ingredients.find((i) => i.name === 'Shallots')?.amount).toBe('six')
    expect(answered.minutes).toBe(30)
    expect(answered.serves).toBe(4)
    expect(answered.questions).not.toContain('How much shallots?')
  })

  it('keeps only a well-formed draft from the model', () => {
    expect(cleanDraft({ name: '' })).toBeNull()
    expect(cleanDraft({ name: 'Klepon', minutes: 'soon', steps: ['Roll.', 3], questions: ['a', 'b', 'c', 'd', 'e'] })).toMatchObject({ minutes: null, steps: ['Roll.'], questions: ['a', 'b', 'c', 'd'] })
  })
})
