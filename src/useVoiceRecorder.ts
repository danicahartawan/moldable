import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceRecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'unsupported' | 'error'

const unsupportedMessage = 'Live voice recording is not supported in this browser.'

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  onresult: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechResult = { isFinal: boolean; 0: { transcript: string } }
type SpeechResultEvent = Event & { resultIndex: number; results: ArrayLike<SpeechResult> }

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [hasCompletedRecording, setHasCompletedRecording] = useState(false)
  const statusRef = useRef<VoiceRecorderStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const updateStatus = useCallback((nextStatus: VoiceRecorderStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  const stop = useCallback(() => {
    const completedRecording = statusRef.current === 'recording'
    updateStatus('stopping')
    recognitionRef.current?.stop()
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    recognitionRef.current = null
    recorderRef.current = null
    streamRef.current = null
    if (completedRecording) setHasCompletedRecording(true)
    updateStatus('idle')
  }, [updateStatus])

  const start = useCallback(async () => {
    const Recognition = getSpeechRecognitionConstructor()

    if (!Recognition || !('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      updateStatus('unsupported')
      setErrorMessage(unsupportedMessage)
      return
    }

    updateStatus('requesting')
    setErrorMessage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const recognition = new Recognition()
      streamRef.current = stream
      recorderRef.current = recorder
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (rawEvent) => {
        const event = rawEvent as SpeechResultEvent
        let finalText = ''
        let interimText = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          if (result.isFinal) finalText += result[0].transcript
          else interimText += result[0].transcript
        }
        if (finalText) setTranscript((current) => `${current}${finalText}`)
        setInterimTranscript(interimText)
      }
      recorder.start()
      recognition.start()
      updateStatus('recording')
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      updateStatus('error')
      setErrorMessage('Microphone access was denied.')
    }
  }, [updateStatus])

  const toggle = useCallback(() => {
    if (statusRef.current === 'recording') stop()
    else if (statusRef.current === 'idle' || statusRef.current === 'unsupported' || statusRef.current === 'error') void start()
  }, [start, stop])

  useEffect(() => stop, [stop])

  return {
    status,
    transcript,
    interimTranscript,
    errorMessage,
    hasCompletedRecording,
    toggle,
  }
}
