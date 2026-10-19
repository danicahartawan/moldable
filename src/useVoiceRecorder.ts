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

type VoiceRecorderOptions = {
  transcribeAudio?: (audio: Blob) => Promise<string>
  // Keep the session running without a microphone so scripted demos work anywhere.
  allowWithoutMicrophone?: boolean
}

export function useVoiceRecorder({ transcribeAudio, allowWithoutMicrophone = false }: VoiceRecorderOptions = {}) {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [hasCompletedRecording, setHasCompletedRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  // Live microphone loudness 0..1, or null when there is no real input to measure.
  const levelRef = useRef<number | null>(null)
  const meterRef = useRef<{ frame: number; context: AudioContext } | null>(null)
  const statusRef = useRef<VoiceRecorderStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const transcriptionRequestRef = useRef(0)
  const appliedTranscriptionRef = useRef(0)

  const updateStatus = useCallback((nextStatus: VoiceRecorderStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  const stopMeter = useCallback(() => {
    const meter = meterRef.current
    meterRef.current = null
    levelRef.current = null
    if (!meter) return
    window.cancelAnimationFrame(meter.frame)
    void meter.context.close().catch(() => {})
  }, [])

  const startMeter = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    try {
      const context = new AudioContextClass()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const meter = { frame: 0, context }
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (const sample of samples) sum += ((sample - 128) / 128) ** 2
        levelRef.current = Math.min(1, Math.sqrt(sum / samples.length) * 4)
        meter.frame = window.requestAnimationFrame(tick)
      }
      meter.frame = window.requestAnimationFrame(tick)
      meterRef.current = meter
    } catch {
      levelRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    stopMeter()
    setIsPaused(false)
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
  }, [stopMeter, updateStatus])

  const start = useCallback(async () => {
    const Recognition = getSpeechRecognitionConstructor()

    if ((!Recognition && !transcribeAudio) || !('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      if (allowWithoutMicrophone) {
        setErrorMessage(null)
        updateStatus('recording')
        return
      }
      updateStatus('unsupported')
      setErrorMessage(unsupportedMessage)
      return
    }

    updateStatus('requesting')
    setErrorMessage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const recognition = Recognition ? new Recognition() : null
      audioChunksRef.current = []
      transcriptionRequestRef.current = 0
      appliedTranscriptionRef.current = 0
      setAiTranscript('')
      streamRef.current = stream
      recorderRef.current = recorder
      recognitionRef.current = recognition
      if (recognition) {
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
      }
      if (transcribeAudio) {
        recorder.ondataavailable = (event) => {
          if (!event.data.size) return
          audioChunksRef.current.push(event.data)
          const requestId = ++transcriptionRequestRef.current
          const audio = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || event.data.type || 'audio/webm',
          })
          void transcribeAudio(audio)
            .then((spokenWords) => {
              if (requestId > appliedTranscriptionRef.current && spokenWords) {
                appliedTranscriptionRef.current = requestId
                setAiTranscript(spokenWords)
              }
            })
            .catch(() => {})
        }
      }
      recorder.start(transcribeAudio ? 3000 : undefined)
      startMeter(stream)
      recognition?.start()
      updateStatus('recording')
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (allowWithoutMicrophone) {
        setErrorMessage(null)
        updateStatus('recording')
        return
      }
      updateStatus('error')
      setErrorMessage('Microphone access was denied.')
    }
  }, [allowWithoutMicrophone, startMeter, transcribeAudio, updateStatus])

  const togglePause = useCallback(() => {
    if (statusRef.current !== 'recording') return
    setIsPaused((paused) => {
      const next = !paused
      const recorder = recorderRef.current
      if (next) {
        if (recorder?.state === 'recording') recorder.pause()
        recognitionRef.current?.stop()
      } else {
        if (recorder?.state === 'paused') recorder.resume()
        try { recognitionRef.current?.start() } catch { /* already running */ }
      }
      return next
    })
  }, [])

  const toggle = useCallback(() => {
    if (statusRef.current === 'recording') stop()
    else if (statusRef.current === 'idle' || statusRef.current === 'unsupported' || statusRef.current === 'error') void start()
  }, [start, stop])

  useEffect(() => stop, [stop])

  return {
    status,
    transcript: aiTranscript || transcript,
    interimTranscript: aiTranscript ? '' : interimTranscript,
    errorMessage,
    hasCompletedRecording,
    isPaused,
    levelRef,
    togglePause,
    toggle,
  }
}
