'use client'

import { useEffect, useRef } from 'react'
import { KitchenMockup, type KitchenVoiceBridge } from '@/kitchen/KitchenMockup'
import { RecipeSync } from '@/recipe/RecipeSync'
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

  // The Recipe change button on the recipe starts the same listening as “Hey Popo”.
  useEffect(() => {
    const onRequest = (event: Event) => {
      event.preventDefault()
      void assistant.run()
    }
    window.addEventListener('moldable:recipe-change', onRequest)
    return () => window.removeEventListener('moldable:recipe-change', onRequest)
  }, [assistant])

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
      <RecipeSync />
      <KitchenMockup fridge startOnRecipe voiceBridge={bridge} />
      <div className="vk__bar" role="status">
        {wake.armed ? (
          <span className="vk__hint" data-status={assistant.status}>
            {hint}
            {assistant.lastHeard ? <small className="vk__trace">You: “{assistant.lastHeard}”{assistant.lastReply ? ` → ${assistant.lastReply}` : ''}</small> : wake.heard ? <small className="vk__trace">Hearing: “{wake.heard}”</small> : null}
          </span>
        ) : (
          <button type="button" className="vk__arm" onClick={wake.arm}>
            <span className="vk__dot" aria-hidden="true" /> {wake.error ?? 'Tap to turn on “Hey Popo”'}
          </button>
        )}
        {wake.armed ? <button type="button" className="vk__mic" aria-label="Talk to Popo now" onClick={() => void assistant.run()}>Talk</button> : null}
        <form className="vk__type" onSubmit={(event) => {
          event.preventDefault()
          const field = event.currentTarget.elements.namedItem('request') as HTMLInputElement
          const text = field.value.trim()
          if (!text) return
          field.value = ''
          void assistant.run(text)
        }}>
          <input name="request" type="text" autoComplete="off" placeholder="or type a change…" aria-label="Type a change for Popo" disabled={assistant.status !== 'idle'} />
        </form>
      </div>
    </div>
  )
}
