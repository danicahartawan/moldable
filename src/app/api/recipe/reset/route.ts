import { tooMany } from '@/lib/rateLimit'
import { applyOps } from '@/recipe/model'
import { loadRecipe, saveRecipe } from '@/recipe/store'

// A new recipe note starts from Oma's own recipe again: every change put back.
export async function POST(request: Request) {
  if (tooMany(request, 'recipe-reset', 6)) return Response.json({ error: 'Slow down a little.' }, { status: 429 })
  const recipe = await loadRecipe()
  const next = applyOps(recipe, [{ type: 'reset' }], 'Grandma')
  if (next !== recipe) await saveRecipe(next)
  return Response.json({ recipe: next }, { headers: { 'Cache-Control': 'no-store' } })
}
