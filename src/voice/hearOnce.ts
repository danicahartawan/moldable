'use client'

import { listen, transcribe } from './capture'

type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Hears one thing said (an answer, a name) and returns the words, or '' if nothing was said. The browser's own speech
 * recognition when it has one (no key needed, words as she speaks via `onWords`), else a short recording sent to be
 * transcribed. Rejects only when the microphone can't be used at all.
 */
export function hearOnce({ maxMs = 9000, onWords }: { maxMs?: number; onWords?: (words: string) => void } = {}): Promise<string> {
  const Recognition = recognitionClass()
  if (!Recognition) {
    return listen().then((audio) => (audio ? transcribe(audio) : ''))
  }
  return new Promise((resolve, reject) => {
    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    let words = ''
    let done = false
    const finish = (fail?: Error) => {
      if (done) return
      done = true
      window.clearTimeout(limit)
      if (fail) reject(fail)
      else resolve(words.trim())
    }
    recognition.onresult = (event) => {
      words = Array.from(event.results).map((r) => r[0].transcript).join(' ')
      onWords?.(words.trim())
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') finish(new Error('The microphone is off'))
      else finish()
    }
    recognition.onend = () => finish()
    const limit = window.setTimeout(() => { try { recognition.stop() } catch { finish() } }, maxMs)
    try {
      recognition.start()
    } catch {
      finish(new Error('Listening could not start'))
    }
  })
}
