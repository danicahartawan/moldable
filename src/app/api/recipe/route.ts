import { loadRecipe } from '@/recipe/store'

// The shared recipe, as it stands: what both screens show.
export async function GET() {
  return Response.json({ recipe: await loadRecipe() }, { headers: { 'Cache-Control': 'no-store' } })
}
