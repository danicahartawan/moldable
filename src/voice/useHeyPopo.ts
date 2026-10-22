'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Speech recognition hears the name in many spellings ("hey popo", "hey po po", "hey bobo", "a popo").
const GREETING = /\b(?:hey|hay|hi|hello|okay|ok|a|eh|hay)\b[,.!?\s-]*([\p{L}'-]{2,8})/iu
const NAME = 'popo'

// How far a word is from “popo” (letters to add, drop or change), so “hey pop-up”, “hey papa” and “hey bobo” still count.
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = keep
    }
  }
  return row[b.length]
}

const WAKE_WORDS = new Set(['popo', 'po po', 'pop o', 'poppo', 'puppo', 'pupo', 'bobo', 'pobo', 'papo', 'pepo', 'pope', 'popeye', 'poppy', 'papa', 'pop up', 'popup', 'poko', 'pogo', 'polo', 'bubu', 'pupu', 'pipo'])

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> }
type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: RecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isWakePhrase(text: string) {
  const heard = text.toLowerCase().replace(/[.,!?]/g, ' ')
  // The greeting, then a word that sounds like the name; “hey po po” arrives as two words.
  const two = heard.match(/\b(?:hey|hay|hi|hello|okay|ok|a|eh)\s+(\p{L}{1,4})[\s-]+(\p{L}{1,4})\b/u)
  if (two && WAKE_WORDS.has(`${two[1]} ${two[2]}`)) return true
  const one = heard.match(GREETING)
  if (!one) return false
  const word = one[1].replace(/['-]/g, '')
  return WAKE_WORDS.has(word) || (word.length >= 3 && word.length <= 6 && distance(word, NAME) <= 1)
}

/**
 * Listens quietly for “Hey Popo” and calls `onWake` the moment it hears it. It needs a tap to begin (browsers only grant the
 * microphone from a gesture), then keeps listening while `paused` is false.
 */
export function useHeyPopo({ onWake, paused }: { onWake: () => void; paused: boolean }) {
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [heard, setHeard] = useState('')
  const supported = typeof window === 'undefined' ? true : recognitionClass() !== null
  const recognition = useRef<Recognition | null>(null)
  const wanted = useRef(false)
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake

  const stop = useCallback(() => {
    wanted.current = false
    const current = recognition.current
    recognition.current = null
    if (current) {
      current.onend = null
      current.onresult = null
      try { current.stop() } catch { /* already stopped */ }
    }
  }, [])

  const begin = useCallback(() => {
    const Ctor = recognitionClass()
    if (!Ctor) {
      setError('This browser can’t listen for “Hey Popo”. Tap the mic instead.')
      return
    }
    wanted.current = true
    const next = new Ctor()
    next.continuous = true
    next.interimResults = true
    next.lang = 'en-US'
    next.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        setHeard(event.results[i][0].transcript.trim().slice(-60))
        if (isWakePhrase(event.results[i][0].transcript)) {
          next.onend = null
          try { next.stop() } catch { /* already stopped */ }
          recognition.current = null
          onWakeRef.current()
          return
        }
      }
    }
    next.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wanted.current = false
        setArmed(false)
        setError('I need the microphone to hear “Hey Popo”.')
      } else if (event.error === 'network') {
        setError('The browser’s speech service is offline. Tap Talk instead.')
      } else if (event.error === 'audio-capture') {
        setError('No microphone found. Tap Talk instead.')
      }
    }
    next.onend = () => {
      // The browser ends a session every so often; start another while we still want to listen.
      if (wanted.current && recognition.current === next) {
        try { next.start() } catch { /* retried on the next end */ }
      }
    }
    recognition.current = next
    try { next.start() } catch { /* already running */ }
  }, [])

  // Listen while armed and not busy; stop while the assistant is working, so it never hears its own voice.
  useEffect(() => {
    if (armed && !paused) begin()
    else stop()
    return stop
  }, [armed, paused, begin, stop])

  const arm = useCallback(() => { setError(null); setArmed(true) }, [])
  return { armed, supported, error, heard, arm, disarm: () => setArmed(false) }
}
