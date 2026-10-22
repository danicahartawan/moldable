import { cleanOp } from '@/cookbook/model'
import { changeCookbooks, loadCookbooks } from '@/cookbook/store'
import { tooMany } from '@/lib/rateLimit'

// The fridges and their recipes, as they stand: what the fridge screen shows.
export async function GET() {
  return Response.json({ cookbooks: await loadCookbooks() }, { headers: { 'Cache-Control': 'no-store' } })
}

// One change: a new fridge, a fridge's name, or a recipe added to a fridge. Answers with the cookbooks after it.
export async function POST(request: Request): Promise<Response> {
  if (tooMany(request, 'cookbooks', 30)) return Response.json({ error: 'Slow down a little.' }, { status: 429 })
  const body = await request.json().catch(() => null) as { op?: unknown } | null
  const op = cleanOp(body?.op)
  if (!op) return Response.json({ error: 'Invalid change.' }, { status: 400 })
  return Response.json({ cookbooks: await changeCookbooks(op) }, { headers: { 'Cache-Control': 'no-store' } })
}
