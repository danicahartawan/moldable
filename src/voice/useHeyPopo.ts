'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Speech recognition hears the name in many spellings ("hey popo", "hey po po", "hey bobo", "a popo").
const WAKE = /\b(?:hey|hay|hi|hello|okay|ok|a|eh)[,.!]?\s+(?:p[oua][\s-]?p[oua]|b[oua][\s-]?b[oua]|p[oua]p+[oua]?|pop(?:e|py|pu)|pup(?:py|pa)?|po\s?po)\b/i

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
  return WAKE.test(text)
}

/**
 * Listens quietly for “Hey Popo” and calls `onWake` the moment it hears it. It needs a tap to begin (browsers only grant the
 * microphone from a gesture), then keeps listening while `paused` is false.
 */
export function useHeyPopo({ onWake, paused }: { onWake: () => void; paused: boolean }) {
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  return { armed, supported, error, arm, disarm: () => setArmed(false) }
}
