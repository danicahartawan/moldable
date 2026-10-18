import { cleanGeneratedTitle } from '@/grandma/title'

const minimumLength = 120

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> }
  if (typeof response.output_text === 'string') return response.output_text
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === 'string') return content.text
    }
  }
  return ''
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return Response.json({ error: 'Title generation is not configured.' }, { status: 503 })

  const body = await request.json().catch(() => null) as { transcript?: unknown } | null
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : ''
  if (transcript.length < minimumLength) {
    return Response.json({ error: 'More transcript is needed.' }, { status: 400 })
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TITLE_MODEL ?? 'gpt-5-mini',
      instructions: 'Create a warm, specific title for this spoken family food story. Return only the title, with no quotation marks. Use 2 to 7 words.',
      input: transcript.slice(0, 4000),
      reasoning: { effort: 'minimal' },
      max_output_tokens: 128,
    }),
  })

  if (!response.ok) return Response.json({ error: 'Title generation failed.' }, { status: 502 })
  const title = cleanGeneratedTitle(extractOutputText(await response.json()))
  if (!title) return Response.json({ error: 'No title was generated.' }, { status: 502 })
  return Response.json({ title })
}
