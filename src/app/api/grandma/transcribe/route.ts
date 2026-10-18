export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return Response.json({ error: 'Transcription is not configured.' }, { status: 503 })

  const incoming = await request.formData().catch(() => null)
  const audio = incoming?.get('audio')
  if (!audio || typeof audio === 'string' || audio.size === 0) {
    return Response.json({ error: 'Recorded audio is required.' }, { status: 400 })
  }

  const form = new FormData()
  form.append('file', audio, audio.name || 'recording.webm')
  form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe')
  form.append('response_format', 'json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })

  if (!response.ok) return Response.json({ error: 'Audio transcription failed.' }, { status: 502 })
  const result = await response.json() as { text?: unknown }
  const transcript = typeof result.text === 'string' ? result.text.trim() : ''
  if (!transcript) return Response.json({ error: 'No speech was recognized.' }, { status: 422 })
  return Response.json({ transcript })
}
