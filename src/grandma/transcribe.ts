export async function transcribeAudio(audio: Blob) {
  const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('audio', audio, `recording.${extension}`)

  const response = await fetch('/api/grandma/transcribe', {
    method: 'POST',
    body: form,
  })

  if (!response.ok) throw new Error('Audio transcription failed')
  const result = await response.json() as { transcript?: string }
  return result.transcript?.trim() ?? ''
}
