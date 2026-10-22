import { describe, expect, it } from 'vitest'
import { isWakePhrase } from './useHeyPopo'

describe('isWakePhrase', () => {
  it.each(['hey popo', 'Hey Popo, make it for two', 'hey po po', 'hey po-po', 'hay bobo', 'okay popo change recipe', 'hey poppo', 'a popo'])('hears %s', (text) => {
    expect(isWakePhrase(text)).toBe(true)
  })

  it.each(['hello there', 'pop the lid', 'hey you', 'make it for two'])('ignores %s', (text) => {
    expect(isWakePhrase(text)).toBe(false)
  })
})
