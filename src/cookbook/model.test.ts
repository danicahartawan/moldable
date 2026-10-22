import { describe, expect, it } from 'vitest'
import { applyCookbookOp, cleanOp, cleanRecipe, defaultCookbooks, nameFromSpeech, type SavedRecipe } from './model'

const recipe = (id: string): SavedRecipe => ({
  id, name: 'Klepon', summary: 'Green rice balls with palm sugar.', minutes: 45, serves: 4,
  ingredients: [{ name: 'Glutinous rice flour', amount: '250 g', said: 'a bowl' }], steps: ['Knead the dough.'], tools: ['Pot'],
  questions: [], transcript: 'Knead the dough.', createdAt: '2026-10-21T00:00:00.000Z',
})

describe('cookbooks', () => {
  it('adds a fridge once, names it, and adds recipes to it', () => {
    let doc = defaultCookbooks()
    doc = applyCookbookOp(doc, { type: 'add_book', id: 'b-1' })
    expect(applyCookbookOp(doc, { type: 'add_book', id: 'b-1' })).toBe(doc)
    expect(doc.books.map((b) => b.id)).toEqual(['oma-lien', 'tante-ani', 'b-1'])
    expect(doc.books[2].colour).toBe('#8fc6ba')
    doc = applyCookbookOp(doc, { type: 'rename_book', id: 'b-1', name: 'Uncle Budi' })
    doc = applyCookbookOp(doc, { type: 'add_recipe', book: 'b-1', recipe: recipe('r-1') })
    expect(applyCookbookOp(doc, { type: 'add_recipe', book: 'b-1', recipe: recipe('r-1') })).toBe(doc)
    expect(doc.books[2]).toMatchObject({ name: 'Uncle Budi', recipes: [{ id: 'r-1', name: 'Klepon' }] })
    expect(doc.rev).toBe(3)
    // A fridge with recipes, or a built-in one, can't be removed; an empty new one can.
    expect(applyCookbookOp(doc, { type: 'remove_book', id: 'b-1' })).toBe(doc)
    expect(applyCookbookOp(doc, { type: 'remove_book', id: 'tante-ani' })).toBe(doc)
    const added = applyCookbookOp(doc, { type: 'add_book', id: 'b-2' })
    expect(applyCookbookOp(added, { type: 'remove_book', id: 'b-2' }).books.map((b) => b.id)).toEqual(['oma-lien', 'tante-ani', 'b-1'])
  })

  it('only lets well-formed, bounded changes through', () => {
    expect(cleanOp({ type: 'add_book', id: 'Not An Id!' })).toBeNull()
    expect(cleanOp({ type: 'rename_book', id: 'b-1', name: '   ' })).toBeNull()
    expect(cleanOp({ type: 'rename_book', id: 'b-1', name: '  Tante   Ani and everyone else too  ' })).toEqual({ type: 'rename_book', id: 'b-1', name: 'Tante Ani and everyone e' })
    expect(cleanOp({ type: 'drop_table' })).toBeNull()
    const cleaned = cleanRecipe({ ...recipe('r-2'), minutes: -5, steps: ['  Fry  ', 7, ''], extra: 'ignored' })
    expect(cleaned).toMatchObject({ minutes: null, steps: ['Fry'] })
    expect(cleaned).not.toHaveProperty('extra')
  })

  it('hears the name in what was said', () => {
    expect(nameFromSpeech('It’s Uncle Budi’s cookbook.')).toBe('Uncle Budi')
    expect(nameFromSpeech("um, this is for tante ani")).toBe('Tante Ani')
    expect(nameFromSpeech('Call it Nana Sri.')).toBe('Nana Sri')
    expect(nameFromSpeech('Grandpa Joe')).toBe('Grandpa Joe')
    expect(nameFromSpeech('...')).toBe('')
  })
})
