import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { extractOutputText } from '@/app/api/grandkids/ask/route'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

const VOICE_ACTIONS = ['change_recipe', 'start_cooking', 'go_to_step', 'next_step', 'previous_step', 'stop_cooking', 'answer', 'unclear'] as const
const VOICE_CHANGES = ['serves2', 'serves4', 'mild', 'chicken', 'kencur_swap', 'kencur_back', 'reset'] as const

export type VoiceCommand = {
  action: (typeof VOICE_ACTIONS)[number]
  change?: (typeof VOICE_CHANGES)[number]
  step?: number
  reply: string
}

type RecipeNow = { servings: 2 | 4; mild: boolean; chicken: boolean; kencurSwapped: boolean }

function isRecipeNow(value: unknown): value is RecipeNow {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (v.servings === 2 || v.servings === 4) && typeof v.mild === 'boolean' && typeof v.chicken === 'boolean' && typeof v.kencurSwapped === 'boolean'
}

function isCommand(value: unknown): value is VoiceCommand {
  if (!value || typeof value !== 'object') return false
  const c = value as Record<string, unknown>
  if (!VOICE_ACTIONS.includes(c.action as never)) return false
  if (typeof c.reply !== 'string' || !c.reply.trim() || c.reply.length > 400) return false
  if (c.action === 'change_recipe') return VOICE_CHANGES.includes(c.change as never) && c.step === undefined
  if (c.action === 'go_to_step') return Number.isInteger(c.step) && (c.step as number) >= 1 && (c.step as number) <= 8 && c.change === undefined
  return c.change === undefined && c.step === undefined
}

function describeRecipe(now: RecipeNow, activeStep: number | null) {
  const { ingredients, steps, tools, cookingTimeMinutes } = GRANDKIDS_RECIPE_CONTEXT
  return [
    `Recipe: Lawar Bali, from Oma Lien. Cooking time ${cookingTimeMinutes} minutes. Tools: ${tools.join(', ')}.`,
    `Right now: ${now.servings} servings; ${now.mild ? 'milder spice' : 'normal spice'}; ${now.chicken ? 'made with chicken' : 'made with pork'}; kencur ${now.kencurSwapped ? 'swapped for ginger and lime zest' : 'as Oma wrote it'}.`,
    `Screen: ${activeStep === null ? 'the recipe overview' : `cooking step ${activeStep} of ${steps.length}`}.`,
    `Ingredients: ${ingredients.map((i) => `${i.name} (${i.familyAmount})`).join(', ')}.`,
    `Steps: ${steps.map((s) => `${s.number}. ${s.text}`).join(' ')}`,
  ].join('\n')
}

const pick = <T,>(options: readonly T[]) => options[Math.floor(Math.random() * options.length)]

// Used only when the model can't be reached (no network, no credits): the simplest readings of what was said.
function fallbackCommand(transcript: string, now: RecipeNow): VoiceCommand {
  const t = transcript.toLowerCase()
  const step = t.match(/step\s*(\d)|(\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bsix\b|\bseven\b|\beight\b)\s*step/)
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']
  if (/for (just )?(two|2)|two (people|servings)|halve|half/.test(t)) return { action: 'change_recipe', change: 'serves2', reply: pick(['Okay, I’ve halved everything for two.', 'Two servings it is.']) }
  if (/for (four|4)|four (people|servings)|double/.test(t)) return { action: 'change_recipe', change: 'serves4', reply: pick(['Back to four servings.', 'Okay, cooking for four again.']) }
  if (/mild|less spicy|not spicy|gentle/.test(t)) return { action: 'change_recipe', change: 'mild', reply: pick(['I made it a little gentler.', 'Okay, less spicy.']) }
  if (/chicken/.test(t)) return { action: 'change_recipe', change: 'chicken', reply: pick(['Chicken instead of pork, done.', 'Swapped the pork for chicken.']) }
  if (/kencur|ginger/.test(t)) return now.kencurSwapped
    ? { action: 'change_recipe', change: 'kencur_back', reply: 'I put the kencur back.' }
    : { action: 'change_recipe', change: 'kencur_swap', reply: pick(['Ginger and lime zest instead of kencur.', 'No kencur — I swapped in ginger and lime zest.']) }
  if (/original|reset|start over|oma/.test(t)) return { action: 'change_recipe', change: 'reset', reply: 'Back to Oma’s recipe.' }
  if (/start cooking|let'?s cook|begin/.test(t)) return { action: 'start_cooking', reply: pick(['Okay, let’s cook!', 'Starting with step one.']) }
  if (/next/.test(t)) return { action: 'next_step', reply: 'Next step.' }
  if (/back|previous|before/.test(t)) return { action: 'previous_step', reply: 'Going back a step.' }
  if (/stop|done|finish|leave/.test(t)) return { action: 'stop_cooking', reply: 'Okay, back to the recipe.' }
  if (step) {
    const n = step[1] ? Number(step[1]) : words.indexOf(step[2])
    if (n >= 1 && n <= 8) return { action: 'go_to_step', step: n, reply: `Step ${n}.` }
  }
  return { action: 'unclear', reply: 'I can change the recipe, start cooking, or move between steps. What would you like?' }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return Response.json({ error: 'The assistant is not configured.' }, { status: 503 })

  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const transcript = typeof input?.transcript === 'string' ? input.transcript.trim() : ''
  const activeStep = input?.activeStep === null || (Number.isInteger(input?.activeStep) && (input?.activeStep as number) >= 1 && (input?.activeStep as number) <= 8) ? (input?.activeStep as number | null) : undefined
  if (!transcript || transcript.length > 600 || !isRecipeNow(input?.recipeNow) || activeStep === undefined) {
    return Response.json({ error: 'Invalid voice request.' }, { status: 400 })
  }

  const instructions = [
    'You are Popo, a warm, quick kitchen helper on a countertop display. A grandkid speaks to you while cooking Oma Lien’s Lawar Bali.',
    'The transcript may begin with the wake phrase “Hey Popo”; ignore it. Work out what they want and pick exactly one action:',
    '- change_recipe: they want the recipe itself changed. Pick change: serves2 (cook for two), serves4 (back to four), mild (less spicy), chicken (chicken instead of pork), kencur_swap (no kencur, use ginger and lime zest), kencur_back (put the kencur back), reset (back to Oma’s original).',
    '- start_cooking: open the cooking steps from the start. go_to_step: jump to a step number 1–8. next_step / previous_step: move along. stop_cooking: leave the steps and return to the recipe.',
    '- answer: a question about the recipe, answered from the facts below only. Never invent a recipe fact or family memory.',
    '- unclear: you did not understand, or it is unrelated to this recipe. Say so kindly in one line and say what you can do.',
    'The reply is spoken aloud: one or two short, natural sentences, in your own words each time, never a canned line. Confirm what you did, using the new numbers if it helps.',
    '',
    describeRecipe(input.recipeNow as RecipeNow, activeStep),
  ].join('\n')

  let upstream: Response
  try {
    upstream = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_GRANDKIDS_MODEL ?? 'gpt-5-mini',
        instructions,
        input: [{ role: 'user', content: transcript }],
        reasoning: { effort: 'minimal' },
        max_output_tokens: 300,
        text: {
          format: {
            type: 'json_schema',
            name: 'voice_command',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                action: { type: 'string', enum: VOICE_ACTIONS },
                change: { type: ['string', 'null'], enum: [...VOICE_CHANGES, null] },
                step: { type: ['integer', 'null'], minimum: 1, maximum: 8 },
                reply: { type: 'string' },
              },
              required: ['action', 'change', 'step', 'reply'],
            },
          },
        },
      }),
      cache: 'no-store',
    })
  } catch {
    return Response.json(fallbackCommand(transcript, input.recipeNow as RecipeNow), { headers: { 'Cache-Control': 'no-store', 'X-Voice-Fallback': '1' } })
  }
  if (!upstream.ok) return Response.json(fallbackCommand(transcript, input.recipeNow as RecipeNow), { headers: { 'Cache-Control': 'no-store', 'X-Voice-Fallback': '1' } })

  const text = extractOutputText(await upstream.json().catch(() => null))
  let command: unknown
  try {
    command = JSON.parse(text)
  } catch {
    return Response.json({ error: 'I couldn’t work that out just now.' }, { status: 502 })
  }
  if (command && typeof command === 'object') {
    const c = command as Record<string, unknown>
    if (c.change === null) delete c.change
    if (c.step === null) delete c.step
  }
  if (!isCommand(command)) return Response.json({ error: 'I couldn’t work that out just now.' }, { status: 502 })
  return Response.json(command, { headers: { 'Cache-Control': 'no-store' } })
}
