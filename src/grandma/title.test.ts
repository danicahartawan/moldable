import { describe, expect, it } from 'vitest'
import { cleanGeneratedTitle, shouldGenerateTitle } from './title'

describe('grandma title generation', () => {
  it('waits for at least three sentences and enough spoken context', () => {
    expect(shouldGenerateTitle('One. Two.')).toBe(false)
    expect(shouldGenerateTitle('One short sentence. Another short sentence. A third sentence arrives.')).toBe(false)
    expect(shouldGenerateTitle('Grandma toasted the spices slowly. Then she poured in the broth and lowered the heat. We waited together until the whole kitchen smelled warm and peppery.')).toBe(true)
  })

  it('cleans quotes and punctuation from a generated title', () => {
    expect(cleanGeneratedTitle('  "Sunday Soto Stories."  ')).toBe('Sunday Soto Stories')
  })
})
