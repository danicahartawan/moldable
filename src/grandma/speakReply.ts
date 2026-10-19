let current: HTMLAudioElement | null = null

export function stopSpeaking() {
  current?.pause()
  current = null
}

/** Speaks `text` in the Grandkids ElevenLabs voice. Resolves quietly when audio or the voice is unavailable. */
export async function speakReply(text: string) {
  if (typeof Audio === 'undefined' || typeof fetch === 'undefined') return
  try {
    const response = await fetch('/api/grandkids/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) return
    stopSpeaking()
    const audio = new Audio(URL.createObjectURL(await response.blob()))
    audio.onended = () => URL.revokeObjectURL(audio.src)
    current = audio
    await audio.play()
  } catch {
    // The typed reply still shows when the voice is unavailable.
  }
}
