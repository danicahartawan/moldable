'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { GrandkidsAnswer } from '@/app/api/grandkids/ask/route'
import type { GrandkidsRecipeState } from './recipeContext'

export type GrandkidsVoiceStatus = 'idle' | 'requesting' | 'listening' | 'thinking' | 'speaking' | 'error'

type ConversationPair = { question: string; answer: string }

type VoiceGuideOptions = {
  recipeState: GrandkidsRecipeState
  onTarget: (answer: GrandkidsAnswer) => void
  recordingDurationMs?: number
}

type ActiveSession = {
  id: number
  abortController: AbortController
  recorder: MediaRecorder | null
  stream: MediaStream | null
  timer: ReturnType<typeof setTimeout> | null
  audio: HTMLAudioElement | null
  objectUrl: string | null
}

function stopSession(session: ActiveSession) {
  session.abortController.abort()
  if (session.timer) clearTimeout(session.timer)
  if (session.recorder?.state === 'recording') session.recorder.stop()
  session.stream?.getTracks().forEach((track) => track.stop())
  session.audio?.pause()
  if (session.objectUrl) URL.revokeObjectURL(session.objectUrl)
}

export function useGrandkidsVoiceGuide({
  recipeState,
  onTarget,
  recordingDurationMs = 5000,
}: VoiceGuideOptions) {
  const [status, setStatus] = useState<GrandkidsVoiceStatus>('idle')
  const [answer, setAnswer] = useState<string | null>(null)
  const [target, setTarget] = useState<GrandkidsAnswer | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const active = useRef<ActiveSession | null>(null)
  const nextSessionId = useRef(0)
  const history = useRef<ConversationPair[]>([])
  const optionsRef = useRef({ recipeState, onTarget, recordingDurationMs })
  optionsRef.current = { recipeState, onTarget, recordingDurationMs }

  const cancel = useCallback(() => {
    const session = active.current
    active.current = null
    if (session) stopSession(session)
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    const previous = active.current
    active.current = null
    if (previous) stopSession(previous)

    const session: ActiveSession = {
      id: ++nextSessionId.current,
      abortController: new AbortController(),
      recorder: null,
      stream: null,
      timer: null,
      audio: null,
      objectUrl: null,
    }
    active.current = session
    setAnswer(null)
    setTarget(null)
    setErrorMessage(null)
    setStatus('requesting')

    let stream: MediaStream
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Microphone recording is unavailable')
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      if (active.current?.id === session.id) {
        active.current = null
        setStatus('error')
        setErrorMessage('I can’t use the microphone. Try again or check permission.')
      }
      return
    }

    if (active.current?.id !== session.id) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }
    session.stream = stream
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream)
    session.recorder = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = async () => {
      session.stream?.getTracks().forEach((track) => track.stop())
      session.stream = null
      if (active.current?.id !== session.id) return
      session.timer = null
      const recording = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
      if (recording.size === 0) {
        active.current = null
        setStatus('idle')
        setErrorMessage('I didn’t catch that. Try again.')
        return
      }

      setStatus('thinking')
      try {
        const form = new FormData()
        form.append('audio', recording, 'question.webm')
        const transcriptionResponse = await fetch('/api/grandma/transcribe', {
          method: 'POST',
          body: form,
          signal: session.abortController.signal,
        })
        if (transcriptionResponse.status === 422) {
          active.current = null
          setStatus('idle')
          setErrorMessage('I didn’t catch that. Try again.')
          return
        }
        if (!transcriptionResponse.ok) throw new Error('transcription failed')
        const transcription = await transcriptionResponse.json() as { transcript?: unknown }
        const question = typeof transcription.transcript === 'string' ? transcription.transcript.trim() : ''
        if (!question) {
          active.current = null
          setStatus('idle')
          setErrorMessage('I didn’t catch that. Try again.')
          return
        }

        const answerResponse = await fetch('/api/grandkids/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            recipeState: optionsRef.current.recipeState,
            history: history.current.slice(-4),
          }),
          signal: session.abortController.signal,
        })
        if (!answerResponse.ok) throw new Error('answer failed')
        const nextAnswer = await answerResponse.json() as GrandkidsAnswer
        if (active.current?.id !== session.id) return
        history.current = [...history.current, { question, answer: nextAnswer.answer }].slice(-4)
        setAnswer(nextAnswer.answer)
        setTarget(nextAnswer)
        optionsRef.current.onTarget(nextAnswer)

        const speechResponse = await fetch('/api/grandkids/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: nextAnswer.answer }),
          signal: session.abortController.signal,
        })
        if (!speechResponse.ok) {
          setStatus('error')
          setErrorMessage('I can show you, but I can’t speak just now.')
          active.current = null
          return
        }
        const speech = await speechResponse.blob()
        if (active.current?.id !== session.id) return
        session.objectUrl = URL.createObjectURL(speech)
        const audio = new Audio(session.objectUrl)
        session.audio = audio
        audio.onended = () => {
          if (active.current?.id !== session.id) return
          if (session.objectUrl) URL.revokeObjectURL(session.objectUrl)
          session.objectUrl = null
          active.current = null
          setStatus('idle')
        }
        audio.onerror = () => {
          if (active.current?.id !== session.id) return
          if (session.objectUrl) URL.revokeObjectURL(session.objectUrl)
          session.objectUrl = null
          active.current = null
          setStatus('error')
          setErrorMessage('I can show you, but I can’t speak just now.')
        }
        setStatus('speaking')
        try {
          await audio.play()
        } catch {
          if (session.objectUrl) URL.revokeObjectURL(session.objectUrl)
          session.objectUrl = null
          active.current = null
          setStatus('error')
          setErrorMessage('I can show you, but I can’t speak just now.')
        }
      } catch (error) {
        if (session.abortController.signal.aborted || active.current?.id !== session.id) return
        active.current = null
        setStatus('error')
        setErrorMessage('I couldn’t answer just now.')
      }
    }

    recorder.start()
    setStatus('listening')
    session.timer = setTimeout(() => {
      if (active.current?.id === session.id && recorder.state === 'recording') recorder.stop()
    }, optionsRef.current.recordingDurationMs)
  }, [])

  useEffect(() => () => {
    const session = active.current
    active.current = null
    if (session) stopSession(session)
  }, [])

  return { status, answer, target, errorMessage, start, cancel }
}
