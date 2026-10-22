let current: HTMLAudioElement | null = null

export function stopSpeaking() {
  current?.pause()
  current = null
}

/** Speaks `text` in the Grandkids ElevenLabs voice. Resolves when it has finished, or quietly when audio or the voice is unavailable. */
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
    current = audio
    // Resolves once she has finished speaking, so a listener can wait before it listens again.
    await new Promise<void>((resolve) => {
      const done = () => { URL.revokeObjectURL(audio.src); resolve() }
      audio.onended = done
      audio.onerror = done
      audio.onpause = done
      audio.play().catch(done)
    })
  } catch {
    // The typed reply still shows when the voice is unavailable.
  }
}
