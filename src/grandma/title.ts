const minimumTranscriptLength = 120
const sentencePattern = /[.!?](?:\s|$)/g

export function shouldGenerateTitle(transcript: string) {
  return transcript.trim().length >= minimumTranscriptLength
    && (transcript.match(sentencePattern)?.length ?? 0) >= 3
}

export function cleanGeneratedTitle(value: string) {
  return value.trim().replace(/^["'“”‘’]+|["'“”‘’.!?]+$/g, '').trim().slice(0, 72)
}

export async function requestGeneratedTitle(transcript: string) {
  const response = await fetch('/api/grandma/title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  })

  if (!response.ok) throw new Error('Title generation failed')
  const result = await response.json() as { title?: string }
  return cleanGeneratedTitle(result.title ?? '')
}
