import type { RecipeDoc, RecipeOp } from './model'

/** Sent on `window` whenever the shared recipe is first read or changes; `detail` is the whole recipe. */
export const RECIPE_EVENT = 'moldable:recipe'

export type ChangeResult = {
  recipe: RecipeDoc
  action: 'confirm' | 'change_recipe' | 'start_cooking' | 'go_to_step' | 'next_step' | 'previous_step' | 'stop_cooking' | 'answer' | 'unclear'
  step?: number
  /** The changes made, or, for a question, the changes it is asking about. */
  ops: RecipeOp[]
  change: 'serves2' | 'serves4' | 'mild' | 'chicken' | 'kencur_swap' | 'kencur_back' | 'reset' | null
  swap: { find: string; replace: string } | null
  reply: string
}

let latest: RecipeDoc | null = null

/** The newest recipe this page has seen, if any. */
export const latestRecipe = () => latest

/** Tells every screen on the page about a recipe (the server's, or the one a change just returned). */
export function announceRecipe(doc: RecipeDoc) {
  if (latest && latest.rev > doc.rev) return
  latest = doc
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<RecipeDoc>(RECIPE_EVENT, { detail: doc }))
}

export async function fetchRecipe(): Promise<RecipeDoc | null> {
  try {
    const response = await fetch('/api/recipe', { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json() as { recipe: RecipeDoc }).recipe
  } catch {
    return null
  }
}

/** Says something to the assistant; it decides, changes the shared recipe on the server if that is what was asked, and answers. */
export async function requestChange(body: { transcript: string; from: 'grandma' | 'grandkid'; note?: string; activeStep?: number | null; pending?: RecipeOp[] }): Promise<ChangeResult> {
  const response = await fetch('/api/recipe/change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('The assistant could not answer')
  const result = await response.json() as ChangeResult
  announceRecipe(result.recipe)
  return result
}
