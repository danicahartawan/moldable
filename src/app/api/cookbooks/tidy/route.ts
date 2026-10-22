import { extractOutputText } from '@/app/api/grandkids/ask/route'
import { cleanDraft, DRAFT_SCHEMA, fallbackTidy, tidyInput, tidyInstructions, type Answer, type Draft } from '@/cookbook/tidy'
import { tooMany } from '@/lib/rateLimit'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

async function askModel(transcript: string, book: string, title: string, answers: Answer[]): Promise<Draft | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  try {
    const upstream = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_TIDY_MODEL ?? 'gpt-5-mini',
        instructions: tidyInstructions(book, title),
        input: [{ role: 'user', content: tidyInput(transcript, answers) }],
        reasoning: { effort: 'low' },
        max_output_tokens: 2000,
        text: { format: { type: 'json_schema', name: 'recipe_draft', strict: true, schema: DRAFT_SCHEMA } },
      }),
      cache: 'no-store',
    })
    if (!upstream.ok) return null
    return cleanDraft(JSON.parse(extractOutputText(await upstream.json().catch(() => null))))
  } catch {
    return null
  }
}

/**
 * Tidies a told recipe: her story (and her answers so far) in, a recipe card out, with the questions still worth asking.
 * The model does it when there is a key; otherwise the rule-based tidy does, and says so.
 */
export async function POST(request: Request): Promise<Response> {
  if (tooMany(request, 'cookbook-tidy', 20)) return Response.json({ error: 'Slow down a little.' }, { status: 429 })
  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const transcript = typeof input?.transcript === 'string' ? input.transcript.trim().slice(0, 8000) : ''
  const book = typeof input?.book === 'string' ? input.book.trim().slice(0, 40) : ''
  const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 80) : ''
  const answers = (Array.isArray(input?.answers) ? input.answers : [])
    .filter((a): a is Answer => !!a && typeof a === 'object' && typeof (a as Answer).question === 'string' && typeof (a as Answer).answer === 'string')
    .map((a) => ({ question: a.question.slice(0, 160), answer: a.answer.slice(0, 400) }))
    .slice(0, 8)
  if (transcript.length < 20) return Response.json({ error: 'Tell a little more of the recipe first.' }, { status: 400 })

  const draft = await askModel(transcript, book, title, answers)
  if (draft) return Response.json({ draft, by: 'ai' }, { headers: { 'Cache-Control': 'no-store' } })
  return Response.json({ draft: fallbackTidy(transcript, title, answers), by: 'rules' }, { headers: { 'Cache-Control': 'no-store' } })
}
