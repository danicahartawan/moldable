import { extractOutputText } from '@/app/api/grandkids/ask/route'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export type VoiceEdit = { find: string; replace: string; reply: string } | { find: null; replace: null; reply: string }

const pick = <T,>(options: readonly T[]) => options[Math.floor(Math.random() * options.length)]

function occursIn(note: string, word: string) {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(note)
}

// Used only when the model can't be reached: “replace X with Y”, “change X to Y”, “swap X for Y”.
function fallbackEdit(transcript: string, note: string): VoiceEdit {
  const m = transcript.toLowerCase().match(/(?:replace|change|swap|switch)\s+(?:the\s+)?([a-z]+)\s+(?:with|to|for|into)\s+(?:the\s+)?([a-z]+)/)
  if (m && occursIn(note, m[1])) return { find: m[1], replace: m[2], reply: pick(['Okay!', 'Okay, done!', 'Got it, changed!']) }
  return { find: null, replace: null, reply: 'I couldn’t find that in the recipe. Try “replace pork with beef”.' }
}

export async function POST(request: Request): Promise<Response> {
  const input = await request.json().catch(() => null) as Record<string, unknown> | null
  const transcript = typeof input?.transcript === 'string' ? input.transcript.trim() : ''
  const note = typeof input?.note === 'string' ? input.note : ''
  if (!transcript || transcript.length > 600 || !note || note.length > 8000) {
    return Response.json({ error: 'Invalid edit request.' }, { status: 400 })
  }
  const fallback = () => Response.json(fallbackEdit(transcript, note), { headers: { 'Cache-Control': 'no-store', 'X-Voice-Fallback': '1' } })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return fallback()

  const instructions = [
    'You are Popo, a warm kitchen helper. Oma’s recipe note is below. The person speaks a change they want made to it, after a wake phrase like “Hey Popo” and maybe “change recipe”; ignore those.',
    'Reduce the request to one word swap: `find` is a single word that appears in the note exactly as written (match its spelling), `replace` is the word that should take its place.',
    'If you cannot find such a word in the note, set find and replace to null and say so kindly in the reply.',
    'The reply is spoken aloud: one short, natural sentence in your own words each time (for example confirming the swap). Never invent recipe facts.',
    '',
    `Note:\n${note}`,
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
        max_output_tokens: 200,
        text: {
          format: {
            type: 'json_schema',
            name: 'voice_edit',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: { find: { type: ['string', 'null'] }, replace: { type: ['string', 'null'] }, reply: { type: 'string' } },
              required: ['find', 'replace', 'reply'],
            },
          },
        },
      }),
      cache: 'no-store',
    })
  } catch {
    return fallback()
  }
  if (!upstream.ok) return fallback()

  let edit: Partial<VoiceEdit> | null = null
  try {
    edit = JSON.parse(extractOutputText(await upstream.json().catch(() => null)))
  } catch {
    return fallback()
  }
  if (!edit || typeof edit.reply !== 'string' || !edit.reply.trim() || edit.reply.length > 300) return fallback()
  if (edit.find && edit.replace && typeof edit.find === 'string' && typeof edit.replace === 'string' && occursIn(note, edit.find)) {
    return Response.json({ find: edit.find, replace: edit.replace, reply: edit.reply }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return Response.json({ find: null, replace: null, reply: edit.reply }, { headers: { 'Cache-Control': 'no-store' } })
}
