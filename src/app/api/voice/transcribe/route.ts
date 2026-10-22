import { tooMany } from '@/lib/rateLimit'

// Speech to text in the same ElevenLabs account that speaks the replies.
export async function POST(request: Request) {
  if (tooMany(request, 'transcribe', 20)) return Response.json({ error: 'Slow down a little.' }, { status: 429 })
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) return Response.json({ error: 'Transcription is not configured.' }, { status: 503 })

  const incoming = await request.formData().catch(() => null)
  const audio = incoming?.get('audio')
  if (!audio || typeof audio === 'string' || audio.size === 0) {
    return Response.json({ error: 'Recorded audio is required.' }, { status: 400 })
  }

  const form = new FormData()
  form.append('file', audio, audio.name || 'recording.webm')
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL ?? 'scribe_v1')
  form.append('language_code', 'en')
  form.append('tag_audio_events', 'false')

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
  })
  if (!response.ok) return Response.json({ error: 'Audio transcription failed.' }, { status: 502 })
  const result = await response.json() as { text?: unknown }
  const transcript = typeof result.text === 'string' ? result.text.trim() : ''
  if (!transcript) return Response.json({ error: 'No speech was recognized.' }, { status: 422 })
  return Response.json({ transcript })
}
