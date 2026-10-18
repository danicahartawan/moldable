'use client'

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode, type WheelEvent } from 'react'
import { DotSpinner, Icon, type IconName } from './Icon'
import { useVoiceRecorder } from './useVoiceRecorder'
import { RecipeBook } from './RecipeBook'

type Project = {
  label: string
  artwork: ReactNode
}

const projects: Project[] = [
  {
    label: 'Mobility',
    artwork: (
      <svg viewBox="0 0 42 32" aria-hidden="true">
        <path d="M11 21h19l-3.5-10H17l-6 10Z" fill="#1f2021" />
        <path d="M19 11 24 5h4l-1.5 6" fill="none" stroke="#1f2021" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="12" cy="24" r="4.2" fill="#969a9c" />
        <circle cx="30" cy="24" r="4.2" fill="#969a9c" />
        <circle cx="12" cy="24" r="2" fill="#292b2c" />
        <circle cx="30" cy="24" r="2" fill="#292b2c" />
      </svg>
    ),
  },
  {
    label: 'Mobile',
    artwork: (
      <svg viewBox="0 0 28 40" aria-hidden="true">
        <rect x="5" y="2" width="18" height="36" rx="4" fill="#1f2021" />
        <rect x="7" y="5" width="14" height="29" rx="2" fill="#f4f1e8" />
        <rect x="9" y="9" width="10" height="10" rx="2" fill="#b8dcbf" />
        <path d="M10 25h8M10 28h6" stroke="#ef8561" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="14" cy="36" r="1" fill="#bfc0bd" />
      </svg>
    ),
  },
  {
    label: 'Tolan',
    artwork: (
      <svg viewBox="0 0 40 32" aria-hidden="true">
        <defs>
          <linearGradient id="tolan-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="#ffd865" />
            <stop offset=".48" stopColor="#ff7da9" />
            <stop offset="1" stopColor="#61c7f3" />
          </linearGradient>
        </defs>
        <rect x="2" y="4" width="36" height="25" rx="4" fill="url(#tolan-gradient)" />
        <circle cx="28" cy="12" r="7" fill="#7665e8" opacity=".9" />
        <text x="6" y="22" fontSize="10" fontWeight="800" fill="#222">To</text>
      </svg>
    ),
  },
  {
    label: 'OpenAI',
    artwork: (
      <svg viewBox="0 0 34 34" aria-hidden="true">
        <g fill="none" stroke="#777b7d" strokeWidth="2.7">
          <ellipse cx="17" cy="17" rx="6" ry="13" transform="rotate(0 17 17)" />
          <ellipse cx="17" cy="17" rx="6" ry="13" transform="rotate(60 17 17)" />
          <ellipse cx="17" cy="17" rx="6" ry="13" transform="rotate(120 17 17)" />
        </g>
      </svg>
    ),
  },
  {
    label: 'Groth',
    artwork: (
      <svg viewBox="0 0 48 28" aria-hidden="true">
        <text x="1" y="19" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="800" fill="#111">Groth</text>
      </svg>
    ),
  },
  {
    label: 'Editorial',
    artwork: (
      <svg viewBox="0 0 28 38" aria-hidden="true">
        <rect x="3" y="2" width="22" height="34" rx="2" fill="#222526" />
        <rect x="7" y="7" width="14" height="8" rx="1" fill="#383c3d" />
        <path d="M7 21h12M7 24h9M7 27h11" stroke="#ecece8" strokeWidth="1.1" opacity=".8" />
        <circle cx="19" cy="31" r="1.8" fill="#d1d0c8" />
      </svg>
    ),
  },
  {
    label: 'Orbit',
    artwork: (
      <svg viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="12" fill="#eee" stroke="#b5b8b9" strokeWidth="1.6" />
        <circle cx="17" cy="17" r="9" fill="none" stroke="#1f2223" strokeWidth="2.7" />
        <path d="M9.5 11.5c5-5 12-4 15.5 1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".75" />
      </svg>
    ),
  },
  {
    label: 'Object',
    artwork: (
      <svg viewBox="0 0 30 38" aria-hidden="true">
        <defs>
          <linearGradient id="object-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#f1eadb" />
            <stop offset="1" stopColor="#a9aa9f" />
          </linearGradient>
        </defs>
        <rect x="4" y="2" width="22" height="34" rx="10" fill="url(#object-gradient)" stroke="#d4d1c8" />
        <ellipse cx="15" cy="12" rx="5.5" ry="7" fill="#e2c991" />
        <ellipse cx="15" cy="12" rx="3.3" ry="5" fill="#f6eac9" opacity=".8" />
      </svg>
    ),
  },
]

const foodProjects = [
  ['Bean pancakes', '/assets/food-01-bean-pancakes.png'],
  ['Colorful rice cakes', '/assets/food-02-colorful-rice-cakes.png'],
  ['Brown layered cakes', '/assets/food-03-brown-layered-cakes.png'],
  ['Banana leaf cakes', '/assets/food-04-banana-leaf-cakes.png'],
  ['Green coconut cakes', '/assets/food-05-green-coconut-cakes.png'],
  ['Sesame balls', '/assets/food-06-sesame-balls.png'],
  ['Steamed cupcakes', '/assets/food-07-steamed-cupcakes.png'],
  ['Wrapped rice cakes', '/assets/food-08-wrapped-rice-cakes.png'],
  ['Red rice rolls', '/assets/food-09-red-rice-rolls.png'],
  ['Striped layer cake', '/assets/food-10-striped-layer-cake.png'],
] as const

const actions: { label: string; icon: IconName }[] = [
  { label: 'Open camera', icon: 'scan' },
  { label: 'Open chat', icon: 'chat' },
]

export function ProjectPill() {
  const voiceRecorder = useVoiceRecorder()
  const railRef = useRef<HTMLDivElement>(null)
  const scrollTargetRef = useRef(0)
  const scrollFrameRef = useRef<number | null>(null)
  const isRecording = voiceRecorder.status === 'recording'
  const isWorking = isRecording || voiceRecorder.status === 'stopping'
  const recordLabel = isRecording ? 'Recording' : voiceRecorder.status === 'stopping' ? 'Saving' : 'Record'
  const isBusy = voiceRecorder.status === 'requesting' || voiceRecorder.status === 'stopping'

  const updateOrbit = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const railBox = rail.getBoundingClientRect()
    const center = railBox.left + railBox.width / 2
    rail.querySelectorAll<HTMLElement>('.project-pill__item').forEach((item) => {
      const itemBox = item.getBoundingClientRect()
      const distance = (itemBox.left + itemBox.width / 2 - center) / (railBox.width / 2)
      const amount = Math.min(1, Math.abs(distance))
      item.style.setProperty('--orbit-scale', String(1 - amount * 0.18))
      item.style.setProperty('--orbit-y', `${amount * 9}px`)
      item.style.setProperty('--orbit-turn', `${distance * -22}deg`)
      item.style.setProperty('--orbit-opacity', String(1 - amount * 0.56))
    })
  }, [])

  useEffect(() => {
    updateOrbit()
    window.addEventListener('resize', updateOrbit)
    return () => window.removeEventListener('resize', updateOrbit)
  }, [updateOrbit])

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
  }, [])

  const animateScroll = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const distance = scrollTargetRef.current - rail.scrollLeft
    if (Math.abs(distance) < 0.5) {
      rail.scrollLeft = scrollTargetRef.current
      scrollFrameRef.current = null
      return
    }
    rail.scrollLeft += distance * 0.14
    scrollFrameRef.current = requestAnimationFrame(animateScroll)
  }, [])

  const handleProjectWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta === 0) return
    event.preventDefault()
    const rail = event.currentTarget
    const maximum = rail.scrollWidth - rail.clientWidth
    if (scrollFrameRef.current === null) scrollTargetRef.current = rail.scrollLeft
    scrollTargetRef.current = Math.max(0, Math.min(maximum, scrollTargetRef.current + delta * 0.3))
    if (scrollFrameRef.current === null) scrollFrameRef.current = requestAnimationFrame(animateScroll)
  }, [animateScroll])

  return (
    <div className="project-bar-stack">
      <div className="project-bar">
        <img className="project-bar__brand" src="/assets/moldable-logo.png" alt="Moldable" />
        <div
          className="project-pill"
          role="group"
          aria-label="Choose a project"
          ref={railRef}
          onScroll={updateOrbit}
          onWheel={handleProjectWheel}
        >
          {foodProjects.map(([label, src], index) => (
            <button
              className="project-pill__item"
              type="button"
              aria-label={label}
              key={label}
              style={{
                '--orbit-opacity': index === 0 || index === 3 ? 0.55 : 1,
                '--orbit-scale': index === 0 || index === 3 ? 0.84 : 1,
                '--orbit-y': index === 0 || index === 3 ? '8px' : '0px',
                '--orbit-turn': `${(index - 1.5) * -14}deg`,
              } as CSSProperties}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
        <div className="project-pill__actions" role="group" aria-label="Quick actions">
          {actions.map(({ label, icon }) => (
            <button className="project-pill__action" type="button" aria-label={label} key={label}>
              <Icon name={icon} />
            </button>
          ))}
          <button
            className="project-pill__record"
            type="button"
            aria-label="Record"
            aria-pressed={isRecording}
            disabled={isBusy}
            onClick={voiceRecorder.toggle}
          >
            {isWorking ? <DotSpinner /> : <Icon name="mic" />}
            <span className="project-pill__record-label" key={recordLabel}>{recordLabel}</span>
          </button>
        </div>
      </div>
      {voiceRecorder.errorMessage ? (
        <p className="voice-transcript voice-transcript--error" role="status">
          <Icon name="x-circle" size={18} className="voice-transcript__icon" />
          {voiceRecorder.errorMessage}
        </p>
      ) : voiceRecorder.transcript || voiceRecorder.interimTranscript ? (
        <p className="voice-transcript" aria-live="polite">
          {voiceRecorder.transcript}
          <span className="voice-transcript__interim">{voiceRecorder.interimTranscript}</span>
        </p>
      ) : null}
      {voiceRecorder.hasCompletedRecording ? <RecipeBook /> : null}
    </div>
  )
}
