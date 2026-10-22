// The shared recipe: one document that both the Grandma and the Grandkids screens read and that the assistant changes.

export type RecipeMods = { servings: 2 | 4; mild: boolean; chicken: boolean; kencurSwapped: boolean }
export type StoryEdit = { find: string; replace: string }
export type RecipeVersion = { id: string; version: number; time: string; who: string; what: string }

export type RecipeDoc = {
  /** Goes up with every change, so a screen can tell when someone else changed the recipe. */
  rev: number
  mods: RecipeMods
  /** Word swaps in Grandma's story, newest last. */
  storyEdits: StoryEdit[]
  versions: RecipeVersion[]
  updatedAt: string
}

export type RecipeOp =
  | { type: 'set_servings'; value: 2 | 4 }
  | { type: 'set_mild'; value: boolean }
  | { type: 'set_chicken'; value: boolean }
  | { type: 'set_kencur_swapped'; value: boolean }
  | { type: 'swap_word'; find: string; replace: string }
  | { type: 'reset' }

export type Who = 'Grandma' | 'Grandkid'

export const DEFAULT_MODS: RecipeMods = { servings: 4, mild: false, chicken: false, kencurSwapped: false }

export function defaultRecipe(now = new Date()): RecipeDoc {
  return { rev: 0, mods: { ...DEFAULT_MODS }, storyEdits: [], versions: [], updatedAt: now.toISOString() }
}

const WORD = /^[\p{L}\p{N}'’ -]{1,40}$/u

export function isOp(value: unknown): value is RecipeOp {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  switch (o.type) {
    case 'set_servings': return o.value === 2 || o.value === 4
    case 'set_mild':
    case 'set_chicken':
    case 'set_kencur_swapped': return typeof o.value === 'boolean'
    case 'swap_word': return typeof o.find === 'string' && typeof o.replace === 'string' && WORD.test(o.find) && WORD.test(o.replace)
    case 'reset': return true
    default: return false
  }
}

function describe(op: RecipeOp): string {
  switch (op.type) {
    case 'set_servings': return op.value === 2 ? 'Servings 4 → 2' : 'Servings back to 4'
    case 'set_mild': return op.value ? 'Made it milder' : 'Spice back to Oma’s'
    case 'set_chicken': return op.value ? 'Swapped pork for chicken' : 'Pork put back'
    case 'set_kencur_swapped': return op.value ? 'Kencur swapped out' : 'Kencur put back'
    case 'swap_word': return `Changed “${op.find}” to “${op.replace}”`
    case 'reset': return 'Back to Oma’s recipe'
  }
}

/** Applies the changes and returns the new recipe, one version up. Nothing is mutated. Changes that change nothing are dropped. */
export function applyOps(doc: RecipeDoc, ops: RecipeOp[], who: Who, now = new Date()): RecipeDoc {
  let mods = doc.mods
  let storyEdits = doc.storyEdits
  const notes: string[] = []
  for (const op of ops) {
    const before = JSON.stringify([mods, storyEdits])
    switch (op.type) {
      case 'set_servings': mods = { ...mods, servings: op.value }; break
      case 'set_mild': mods = { ...mods, mild: op.value }; break
      case 'set_chicken': mods = { ...mods, chicken: op.value }; break
      case 'set_kencur_swapped': mods = { ...mods, kencurSwapped: op.value }; break
      case 'reset': mods = { ...DEFAULT_MODS }; storyEdits = []; break
      case 'swap_word': {
        // Swapping a word that was already swapped replaces that swap instead of stacking another.
        const find = op.find.trim()
        const replace = op.replace.trim()
        storyEdits = [...storyEdits.filter((e) => e.find.toLowerCase() !== find.toLowerCase()), { find, replace }]
        break
      }
    }
    if (JSON.stringify([mods, storyEdits]) !== before) notes.push(describe(op))
  }
  if (notes.length === 0) return doc
  const version = (doc.versions[0]?.version ?? 3) + 1
  const entry: RecipeVersion = { id: `v${version}`, version, time: now.toISOString(), who, what: notes.join(', ') }
  return { rev: doc.rev + 1, mods, storyEdits, versions: [entry, ...doc.versions].slice(0, 30), updatedAt: now.toISOString() }
}

/** The one change the Grandkids screen animates, when the ops make one of the changes it knows. */
export function screenChange(ops: RecipeOp[]): 'serves2' | 'serves4' | 'mild' | 'chicken' | 'kencur_swap' | 'kencur_back' | 'reset' | null {
  for (const op of ops) {
    if (op.type === 'set_servings') return op.value === 2 ? 'serves2' : 'serves4'
    if (op.type === 'set_mild' && op.value) return 'mild'
    if (op.type === 'set_chicken' && op.value) return 'chicken'
    if (op.type === 'set_kencur_swapped') return op.value ? 'kencur_swap' : 'kencur_back'
    if (op.type === 'reset') return 'reset'
  }
  return null
}

/** What a set of changes amounts to, in words a person says: “cook for two and make it milder”. */
export function describeOps(ops: RecipeOp[]): string {
  const parts = ops.map((op) => {
    switch (op.type) {
      case 'set_servings': return op.value === 2 ? 'cook it for two' : 'cook it for four again'
      case 'set_mild': return op.value ? 'make it milder' : 'put the spice back'
      case 'set_chicken': return op.value ? 'use chicken instead of pork' : 'put the pork back'
      case 'set_kencur_swapped': return op.value ? 'swap the kencur for ginger and lime zest' : 'put the kencur back'
      case 'swap_word': return `change “${op.find}” to “${op.replace}”`
      case 'reset': return 'go back to Oma’s recipe'
    }
  })
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? ''
}
