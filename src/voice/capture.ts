'use client'

const MAX_LISTEN_MS = 9000
const NO_SPEECH_MS = 5000
const SILENCE_MS = 1200
const SPEECH_LEVEL = 0.035

export async function transcribe(audio: Blob) {
  const form = new FormData()
  form.append('audio', audio, `speech.${audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'}`)
  const response = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
  if (response.status === 422) return ''
  if (!response.ok) throw new Error('Audio transcription failed')
  const result = await response.json() as { transcript?: string }
  return result.transcript?.trim() ?? ''
}

// Records until she has spoken and then paused; null if she never said anything.
export async function listen(): Promise<Blob | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }

  const audio = new AudioContext()
  const analyser = audio.createAnalyser()
  analyser.fftSize = 512
  audio.createMediaStreamSource(stream).connect(analyser)
  const samples = new Uint8Array(analyser.fftSize)

  return new Promise<Blob | null>((resolve) => {
    let heard = false
    let lastVoice = performance.now()
    const begun = performance.now()
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearInterval(watch)
      if (recorder.state === 'recording') recorder.stop()
    }
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      void audio.close()
      resolve(heard ? new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' }) : null)
    }
    const watch = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples)
      let peak = 0
      for (const value of samples) peak = Math.max(peak, Math.abs(value - 128) / 128)
      const now = performance.now()
      if (peak > SPEECH_LEVEL * 2) { heard = true; lastVoice = now }
      if (now - begun > MAX_LISTEN_MS) finish()
      else if (heard && now - lastVoice > SILENCE_MS) finish()
      else if (!heard && now - begun > NO_SPEECH_MS) finish()
    }, 100)
    recorder.start()
  })
}

