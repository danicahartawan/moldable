'use client'

import { useEffect, useRef } from 'react'
import { KitchenMockup, type KitchenVoiceBridge } from '@/kitchen/KitchenMockup'
import { useHeyPopo } from './useHeyPopo'
import { useVoiceAssistant } from './useVoiceAssistant'
import '@/kitchen/kitchen.css'
import '@/kitchen/type-scale.css'
import './voice-kitchen.css'

// The Grandkids kitchen you can talk to: say “Hey Popo”, then ask for a change, a step or an answer.
export function VoiceKitchen() {
  const bridge = useRef<KitchenVoiceBridge | null>(null)
  const assistant = useVoiceAssistant(bridge)
  const wake = useHeyPopo({ onWake: () => { void assistant.run() }, paused: assistant.status !== 'idle' })

  // Listening starts on its own; if the browser wants a tap before it lets us hear, the button below does it.
  const arm = wake.arm
  useEffect(() => { arm() }, [arm])

  // Space is a fallback for “Hey Popo”.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || (event.target as HTMLElement).closest('input, textarea, button')) return
      event.preventDefault()
      void assistant.run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assistant])

  const hint = wake.error ?? assistant.error
    ?? (assistant.status === 'listening' ? 'Listening…'
      : assistant.status === 'thinking' ? 'Thinking…'
      : assistant.status === 'speaking' ? 'Popo is speaking…'
      : wake.armed ? 'Say “Hey Popo”' : null)

  return (
    <div className="gm-kitchen vk">
      <KitchenMockup fridge startOnRecipe voiceBridge={bridge} />
      <div className="vk__bar" role="status">
        {wake.armed ? (
          <span className="vk__hint" data-status={assistant.status}>{hint}</span>
        ) : (
          <button type="button" className="vk__arm" onClick={wake.arm}>
            <span className="vk__dot" aria-hidden="true" /> {wake.error ?? 'Tap to turn on “Hey Popo”'}
          </button>
        )}
        {wake.armed ? <button type="button" className="vk__mic" aria-label="Talk to Popo now" onClick={() => void assistant.run()}>Talk</button> : null}
      </div>
    </div>
  )
}
