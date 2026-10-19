const GRANDKIDS_VOICE_ID = 'dqoT2ZtOCpbG5tUUBU2W'

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return Response.json({ error: 'Grandma voice is not configured.' }, { status: 503 })

  const input = await request.json().catch(() => null) as { text?: unknown } | null
  const text = typeof input?.text === 'string' ? input.text.trim() : ''
  if (!text || text.length > 1000) {
    return Response.json({ error: 'Speech text must be between 1 and 1000 characters.' }, { status: 400 })
  }

  const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${GRANDKIDS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.48,
        similarity_boost: 0.78,
        style: 0.28,
        use_speaker_boost: true,
      },
    }),
  })

  if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
    return Response.json({ error: 'Grandma could not speak just now.' }, { status: 502 })
  }

  return new Response(elevenLabsResponse.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
