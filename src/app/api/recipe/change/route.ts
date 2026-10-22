import { extractOutputText } from '@/app/api/grandkids/ask/route'
import { ACTIONS, DECISION_SCHEMA, fallbackDecision, instructionsFor, toOps, type Decision } from '@/recipe/interpret'
import { applyOps, describeOps, isOp, screenChange, type RecipeDoc, type RecipeOp, type Who } from '@/recipe/model'
import { loadRecipe, saveRecipe } from '@/recipe/store'
import { tooMany } from '@/lib/rateLimit'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

async function ask(transcript: string, doc: RecipeDoc, who: Who, activeStep: number | null, note: string, pending: RecipeOp[]): Promise<Decision | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  try {
    const upstream = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_GRANDKIDS_MODEL ?? 'gpt-5-mini',
        instructions: instructionsFor(doc, who, activeStep, note, pending),
        input: [{ role: 'user', content: transcript }],
        reasoning: { effort: 'minimal' },
        max_output_tokens: 400,
        text: { format: { type: 'json_schema', name: 'recipe_decision', strict: true, schema: DECISION_SCHEMA } },
      }),
      cache: 'no-store',
    })
    if (!upstream.ok) return null
    const parsed = JSON.parse(extractOutputText(await upstream.json().catch(() => null))) as Record<string, unknown>
    if (!ACTIONS.includes(parsed.action as never) || typeof parsed.reply !== 'string' || !parsed.reply.trim() || parsed.reply.length > 400) return null
    const ops = toOps(parsed.ops, note)
    const step = Number.isInteger(parsed.step) && (parsed.step as number) >= 1 && (parsed.step as number) <= 8 ? (parsed.step as number) : undefined
    // A change with nothing valid in it, or a step jump with no step, is not something to act on.
    if ((parsed.action === 'change_recipe' || parsed.action === 'confirm') && ops.length === 0 && !(parsed.action === 'change_recipe' && pending.length)) return { action: 'unclear', ops: [], reply: parsed.reply }
    if (parsed.action === 'go_to_step' && !step) return { action: 'unclear', ops: [], reply: parsed.reply }
    // Oma's screen can only swap words in her note (or start over); the grandkid's cannot swap words.
    const allowed = who === 'Grandma' ? ops.filter((op) => op.type === 'swap_word' || op.type === 'reset') : ops.filter((op) => op.type !== 'swap_word')
    const keepOps = parsed.action === 'change_recipe' || parsed.action === 'confirm'
    if (keepOps && allowed.length === 0 && !(parsed.action === 'change_recipe' && pending.length)) return { action: 'unclear', ops: [], reply: parsed.reply }
    return { action: parsed.action as Decision['action'], ops: keepOps ? (allowed.length ? allowed : parsed.action === 'change_recipe' ? pending : []) : [], step, reply: parsed.reply }
  } catch {
    return null
  }
}

/**
 * The assistant's one way into the recipe. A screen sends what was said; the model decides what to do; real changes are
 * applied to the shared recipe on the server, saved, and handed back so both screens can show them.
 */
export async function POST(request: Request): Promise<Response> {
  if (tooMany(request, 'recipe-change', 12)) return Response.json({ error: 'Slow down a little.' }, { status: 429 })

  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const transcript = typeof input?.transcript === 'string' ? input.transcript.trim() : ''
  const from: Who | null = input?.from === 'grandma' ? 'Grandma' : input?.from === 'grandkid' ? 'Grandkid' : null
  const note = typeof input?.note === 'string' ? input.note.slice(0, 8000) : ''
  const activeStep = Number.isInteger(input?.activeStep) && (input?.activeStep as number) >= 1 && (input?.activeStep as number) <= 8 ? (input?.activeStep as number) : null
  if (!transcript || transcript.length > 600 || !from) return Response.json({ error: 'Invalid request.' }, { status: 400 })
  // A change that was proposed and is waiting for a yes comes back from the screen with the answer.
  const pending = (Array.isArray(input?.pending) ? input.pending as unknown[] : []).filter(isOp).slice(0, 6)

  const recipe = await loadRecipe()
  let decision = (await ask(transcript, recipe, from, activeStep, note, pending)) ?? fallbackDecision(transcript, recipe, note, pending)
  // Nothing changes the recipe on a first ask: a change with no yes behind it is turned into a question. The question is worded
  // from the changes themselves, so what is asked is exactly what a yes will do.
  if ((decision.action === 'change_recipe' && pending.length === 0) || decision.action === 'confirm') {
    decision = { action: 'confirm', ops: decision.ops, reply: `Do you want me to ${describeOps(decision.ops)}?` }
  }

  let next = recipe
  const applied: RecipeOp[] = []
  if (decision.action === 'change_recipe') {
    next = applyOps(recipe, decision.ops, from)
    if (next !== recipe) {
      await saveRecipe(next)
      applied.push(...decision.ops)
    }
  }
  const proposed = decision.action === 'confirm' ? decision.ops : []
  const swap = applied.find((op): op is Extract<RecipeOp, { type: 'swap_word' }> => op.type === 'swap_word')

  return Response.json({
    recipe: next,
    action: decision.action,
    step: decision.step,
    ops: decision.action === 'confirm' ? proposed : applied,
    change: screenChange(applied),
    swap: swap ? { find: swap.find, replace: swap.replace } : null,
    reply: decision.reply,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
