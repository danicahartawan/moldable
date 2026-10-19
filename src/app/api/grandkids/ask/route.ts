import {
  GRANDKIDS_INGREDIENT_TARGETS,
  GRANDKIDS_STEP_TARGETS,
  formatRecipeGrounding,
  type GrandkidsRecipeState,
} from '@/grandkids/recipeContext'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const ANSWER_TARGETS = ['overview', 'time', 'tools', 'ingredients', 'step'] as const

export type GrandkidsAnswer = {
  answer: string
  target: (typeof ANSWER_TARGETS)[number]
  ingredient?: string
  step?: number
}

type ConversationPair = { question: string; answer: string }

function isRecipeState(value: unknown): value is GrandkidsRecipeState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  return (state.servings === 2 || state.servings === 4)
    && (state.activeStep === null || (Number.isInteger(state.activeStep) && GRANDKIDS_STEP_TARGETS.includes(state.activeStep as never)))
    && (state.versionLabel === null || state.versionLabel === 'Nevan + Fred · 2 servings')
    && typeof state.kencurSubstitution === 'boolean'
}

function normalizeHistory(value: unknown): ConversationPair[] | null {
  if (!Array.isArray(value)) return null
  const pairs = value.filter((pair): pair is ConversationPair => {
    if (!pair || typeof pair !== 'object') return false
    const item = pair as Record<string, unknown>
    return typeof item.question === 'string'
      && item.question.trim().length > 0
      && item.question.length <= 1000
      && typeof item.answer === 'string'
      && item.answer.trim().length > 0
      && item.answer.length <= 1000
  })
  if (pairs.length !== value.length) return null
  return pairs.slice(-4)
}

export function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as { output_text?: unknown; output?: unknown }
  if (typeof response.output_text === 'string') return response.output_text
  if (!Array.isArray(response.output)) return ''
  for (const item of response.output) {
    if (!item || typeof item !== 'object') continue
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const outputPart = part as { type?: unknown; text?: unknown }
      if (outputPart.type === 'output_text' && typeof outputPart.text === 'string') return outputPart.text
    }
  }
  return ''
}

function isGrandkidsAnswer(value: unknown): value is GrandkidsAnswer {
  if (!value || typeof value !== 'object') return false
  const answer = value as Record<string, unknown>
  if (typeof answer.answer !== 'string' || !answer.answer.trim() || answer.answer.length > 1000) return false
  if (!ANSWER_TARGETS.includes(answer.target as never)) return false

  if (answer.target === 'ingredients') {
    return typeof answer.ingredient === 'string'
      && GRANDKIDS_INGREDIENT_TARGETS.includes(answer.ingredient as never)
      && answer.step === undefined
  }
  if (answer.target === 'step') {
    return Number.isInteger(answer.step)
      && GRANDKIDS_STEP_TARGETS.includes(answer.step as never)
      && answer.ingredient === undefined
  }
  return answer.ingredient === undefined && answer.step === undefined
}

function upstreamError() {
  return Response.json({ error: 'I couldn’t answer just now.' }, { status: 502 })
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return Response.json({ error: 'The recipe guide is not configured.' }, { status: 503 })

  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const question = typeof input?.question === 'string' ? input.question.trim() : ''
  const history = normalizeHistory(input?.history)
  if (!question || question.length > 1000 || !isRecipeState(input?.recipeState) || history === null) {
    return Response.json({ error: 'Invalid recipe question.' }, { status: 400 })
  }

  const recipeGrounding = formatRecipeGrounding(input.recipeState)
  const instructions = [
    'You are Oma Lien’s child-friendly Lelawar Bali cooking guide.',
    'Answer in one to three short spoken sentences using only the recipe facts below.',
    'Preserve Oma’s family wording exactly; tidy metric quantities may only clarify it and never replace it.',
    'Never invent a family memory or recipe fact.',
    'If the recipe does not answer the question, say so and ask whether the child wants a safe general cooking suggestion.',
    'For unsupported safety questions, tell the child to check with an adult.',
    'Briefly redirect unrelated questions to this recipe.',
    'Choose the single UI target that best supports the answer.',
    '',
    recipeGrounding,
  ].join('\n')
  const conversationInput = [
    ...history.flatMap((pair) => [
      { role: 'user', content: pair.question },
      { role: 'assistant', content: pair.answer },
    ]),
    { role: 'user', content: question },
  ]

  let upstream: Response
  try {
    upstream = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_GRANDKIDS_MODEL ?? 'gpt-5-mini',
        instructions,
        input: conversationInput,
        reasoning: { effort: 'minimal' },
        max_output_tokens: 300,
        text: {
          format: {
            type: 'json_schema',
            name: 'grandkids_recipe_answer',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                answer: { type: 'string' },
                target: { type: 'string', enum: ANSWER_TARGETS },
                ingredient: { type: ['string', 'null'], enum: [...GRANDKIDS_INGREDIENT_TARGETS, null] },
                step: { type: ['integer', 'null'], minimum: 1, maximum: 8 },
              },
              required: ['answer', 'target', 'ingredient', 'step'],
            },
          },
        },
      }),
      cache: 'no-store',
    })
  } catch {
    return upstreamError()
  }

  if (!upstream.ok) return upstreamError()
  const payload = await upstream.json().catch(() => null)
  const outputText = extractOutputText(payload)
  if (!outputText) return upstreamError()

  let answer: unknown
  try {
    answer = JSON.parse(outputText)
  } catch {
    return upstreamError()
  }
  if (answer && typeof answer === 'object') {
    const normalized = answer as Record<string, unknown>
    if (normalized.ingredient === null) delete normalized.ingredient
    if (normalized.step === null) delete normalized.step
  }
  if (!isGrandkidsAnswer(answer)) return upstreamError()

  return Response.json(answer, { headers: { 'Cache-Control': 'no-store' } })
}
