// The family's cookbooks: one fridge each, its recipes the magnet cards on its door. Kept on the server (see ./store), so
// the Grandma and Grandkids screens, and every visit, see the same fridges. Lawar Bali, Oma Lien's featured recipe, is
// built into her fridge and not stored here; everything made with "Make your own" is.

/** One ingredient: the tidy amount, and the words she used for it. Either may be empty when the story didn't say. */
export type Ingredient = { name: string; amount: string; said: string }

export type SavedRecipe = {
  id: string
  name: string
  /** One sentence about the dish. */
  summary: string
  minutes: number | null
  serves: number | null
  ingredients: Ingredient[]
  steps: string[]
  tools: string[]
  /** What the tidy couldn't tell from her story and she didn't answer: still worth asking. */
  questions: string[]
  /** Her story as it was told, kept with the recipe. */
  transcript: string
  createdAt: string
}

export type Cookbook = { id: string; name: string; colour: string; recipes: SavedRecipe[] }

export type Cookbooks = {
  /** Goes up with every change, so a screen can tell its copy is old. */
  rev: number
  books: Cookbook[]
  updatedAt: string
}

export type CookbookOp =
  | { type: 'add_book'; id: string }
  | { type: 'rename_book'; id: string; name: string }
  | { type: 'add_recipe'; book: string; recipe: SavedRecipe }
  | { type: 'reset' }

// The colours new fridges come in, in turn.
export const FRIDGE_COLOURS = ['#8fc6ba', '#e8d9b8', '#86a3d8', '#f0b54a']
export const OMA_ID = 'oma-lien'

export function defaultCookbooks(now = new Date()): Cookbooks {
  return {
    rev: 0,
    books: [
      { id: OMA_ID, name: 'Oma Lien', colour: '#c42b22', recipes: [] },
      { id: 'tante-ani', name: 'Tante Ani', colour: '#e4a0b1', recipes: [] },
    ],
    updatedAt: now.toISOString(),
  }
}

const ID = /^[a-z0-9-]{1,40}$/
const MAX_NAME = 24
const MAX_BOOKS = 12
const MAX_RECIPES = 24

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const count = (value: unknown, max: number) => (Number.isInteger(value) && (value as number) > 0 && (value as number) <= max ? (value as number) : null)
const list = (value: unknown, max: number, each: number) => (Array.isArray(value) ? value.map((v) => text(v, each)).filter(Boolean).slice(0, max) : [])

/** A fridge name as it should be kept: single-spaced, trimmed, short enough for the badge. */
export const cleanBookName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

/** A recipe as the server will keep it: every field present, every string and list bounded. Null if it has no name. */
export function cleanRecipe(value: unknown): SavedRecipe | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
  const name = text(r.name, 60)
  const id = typeof r.id === 'string' && ID.test(r.id) ? r.id : ''
  if (!name || !id) return null
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .map((i) => {
      const o = (i && typeof i === 'object' ? i : {}) as Record<string, unknown>
      return { name: text(o.name, 60), amount: text(o.amount, 40), said: text(o.said, 80) }
    })
    .filter((i) => i.name)
    .slice(0, 30)
  return {
    id,
    name,
    summary: text(r.summary, 200),
    minutes: count(r.minutes, 24 * 60),
    serves: count(r.serves, 50),
    ingredients,
    steps: list(r.steps, 20, 240),
    tools: list(r.tools, 12, 40),
    questions: list(r.questions, 6, 160),
    transcript: text(r.transcript, 8000),
    createdAt: typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt)) ? r.createdAt : new Date().toISOString(),
  }
}

/** The op, made safe to apply, or null when it isn't one. */
export function cleanOp(value: unknown): CookbookOp | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  switch (o.type) {
    case 'add_book': return typeof o.id === 'string' && ID.test(o.id) ? { type: 'add_book', id: o.id } : null
    case 'rename_book': {
      const name = cleanBookName(typeof o.name === 'string' ? o.name : '')
      return typeof o.id === 'string' && ID.test(o.id) && name ? { type: 'rename_book', id: o.id, name } : null
    }
    case 'add_recipe': {
      const recipe = cleanRecipe(o.recipe)
      return typeof o.book === 'string' && ID.test(o.book) && recipe ? { type: 'add_recipe', book: o.book, recipe } : null
    }
    case 'reset': return { type: 'reset' }
    default: return null
  }
}

/** Applies one change and returns the new cookbooks, one rev up. Nothing is mutated; a change that changes nothing returns `doc`. */
export function applyCookbookOp(doc: Cookbooks, op: CookbookOp, now = new Date()): Cookbooks {
  let books = doc.books
  switch (op.type) {
    case 'reset': return { ...defaultCookbooks(now), rev: doc.rev + 1 }
    case 'add_book':
      // Adding the same fridge twice (a retried request) is a no-op.
      if (books.length >= MAX_BOOKS || books.some((b) => b.id === op.id)) return doc
      books = [...books, { id: op.id, name: '', colour: FRIDGE_COLOURS[(books.length - 2 + FRIDGE_COLOURS.length * 4) % FRIDGE_COLOURS.length], recipes: [] }]
      break
    case 'rename_book':
      if (!books.some((b) => b.id === op.id && b.name !== op.name)) return doc
      books = books.map((b) => (b.id === op.id ? { ...b, name: op.name } : b))
      break
    case 'add_recipe': {
      const book = books.find((b) => b.id === op.book)
      if (!book || book.recipes.some((r) => r.id === op.recipe.id) || book.recipes.length >= MAX_RECIPES) return doc
      books = books.map((b) => (b.id === op.book ? { ...b, recipes: [...b.recipes, op.recipe] } : b))
      break
    }
  }
  return { rev: doc.rev + 1, books, updatedAt: now.toISOString() }
}

export function isCookbooks(value: unknown): value is Cookbooks {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<Cookbooks>
  return typeof d.rev === 'number' && Array.isArray(d.books) && d.books.every((b) => b && typeof b.id === 'string' && Array.isArray(b.recipes))
}

// What people say before or after a name when they're asked whose cookbook it is.
const LEAD = /^(?:(?:um+|uh+|er+|so|ok(?:ay)?|well)[,\s]+)*(?:(?:it(?:'s| is)|this is|this one is|that's|call it|name it|let's call it|the name is|it's for|for|it belongs to|make it)\s+)*(?:(?:the|my|our)\s+)?/i
const TAIL = /(?:['’]s)?\s*(?:cook ?book|fridge|recipes?|kitchen|one)?[\s.!?,]*$/i

/** The name in what was said: “It's Uncle Budi's cookbook.” → “Uncle Budi”. Empty if nothing like a name is left. */
export function nameFromSpeech(said: string) {
  const words = said.trim().replace(/[’‘]/g, "'").replace(LEAD, '').replace(TAIL, '').replace(/[^\p{L}\p{N}' -]/gu, ' ').replace(/\s+/g, ' ').trim()
  const name = words.split(' ').map((w) => (w ? w[0].toLocaleUpperCase() + w.slice(1) : w)).join(' ')
  return cleanBookName(name)
}

/** Ids made on the device, so a fridge or recipe can show at once and the server keep it under the same id. */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
