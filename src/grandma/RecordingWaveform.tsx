import { useEffect, useRef, useState, type RefObject } from 'react'

type RecordingWaveformProps = {
  levelRef: RefObject<number | null>
  name: string | null
  isNaming?: boolean
  isPaused?: boolean
  onTogglePause: () => void
  onStop: () => void
}

const BAR_COUNT = 44
const FRAME_MS = 55

// Gentle stand-in loudness for demos with no microphone: a slow swell plus jitter.
function simulatedLevel(seconds: number) {
  const swell = 0.5 + 0.5 * Math.sin(seconds * 1.7) * Math.sin(seconds * 0.45)
  return Math.min(1, Math.max(0.08, 0.18 + swell * 0.5 + Math.random() * 0.3))
}

export function RecordingWaveform({ levelRef, name, isNaming = false, isPaused = false, onTogglePause, onStop }: RecordingWaveformProps) {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0.06))
  const [seconds, setSeconds] = useState(0)
  const activeMs = useRef(0)

  // New loudness enters on the right and drifts left, so louder speech makes taller bars.
  // While paused the bars and timer hold still.
  useEffect(() => {
    if (isPaused) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      activeMs.current += now - last
      last = now
      const elapsed = activeMs.current / 1000
      const live = levelRef.current
      const level = live === null ? simulatedLevel(elapsed) : Math.max(0.06, live)
      setBars((current) => [...current.slice(1), level])
      setSeconds(Math.floor(elapsed))
    }, FRAME_MS)
    return () => window.clearInterval(timer)
  }, [levelRef, isPaused])

  return (
    <div className={`grandma-waveform${isPaused ? ' is-paused' : ''}`} data-testid="grandma-waveform">
      <div className="grandma-waveform__head">
        <button className="grandma-waveform__pause" type="button" aria-label={isPaused ? 'Resume recording' : 'Pause recording'} aria-pressed={isPaused} onClick={onTogglePause}>
          {isPaused ? <span className="grandma-waveform__play" /> : <><span /><span /></>}
        </button>
        {name ? (
          <h1 className="grandma-generated-title grandma-waveform__name" key={name}>{name}</h1>
        ) : (
          <p className="grandma-waveform__name grandma-waveform__name--pending" aria-live="polite">{isNaming ? 'Naming this story…' : isPaused ? 'Paused' : 'Listening'}</p>
        )}
        <span className="grandma-waveform__time">{seconds}s</span>
        <button className="grandma-waveform__stop" type="button" aria-label="Stop recording" aria-pressed="true" onClick={onStop}>
          <span />
        </button>
      </div>
      <div className="grandma-waveform__bars" aria-hidden="true">
        {bars.map((level, index) => (
          <span key={index} style={{ height: `${Math.round(6 + level * 88)}%` }} />
        ))}
      </div>
    </div>
  )
}
