'use client'

import { useCallback, useRef, useState, type MutableRefObject } from 'react'
import type { KitchenVoiceBridge } from '@/kitchen/KitchenMockup'
import { requestChange } from '@/recipe/client'
import type { RecipeOp } from '@/recipe/model'
import { speakReply, stopSpeaking } from '@/grandma/speakReply'
import { listen, transcribe } from './capture'

export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

/**
 * Hey Popo → she speaks → it is transcribed → the assistant (AI) decides what to do → the kitchen does it and the answer is
 * spoken back in the Grandkids ElevenLabs voice. Nothing here is scripted: the wording and the action come from the model.
 */
export function useVoiceAssistant(bridge: MutableRefObject<KitchenVoiceBridge | null>) {
  const [status, setStatus] = useState<AssistantStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  // The last thing it heard and answered, shown on the page so a missed request can be seen.
  const [lastHeard, setLastHeard] = useState('')
  const [lastReply, setLastReply] = useState('')
  const busy = useRef(false)

  // A change the assistant has asked about and is waiting to hear “yes” for.
  const pending = useRef<RecipeOp[]>([])

  // `typed` is a request typed instead of spoken: it skips the microphone and everything after is the same. After a question the
  // assistant listens again by itself (for a spoken request), so “yes” or “no” needs no wake word.
  const run = useCallback(async (typed?: string) => {
    if (busy.current) return
    busy.current = true
    setError(null)
    stopSpeaking()
    const kitchen = bridge.current
    const home = () => kitchen?.home() ?? null
    try {
      let next: string | undefined = typed
      for (let round = 0; round < 3; round++) {
        setStatus('listening')
        home()?.voiceListen()
        let transcript: string
        if (next !== undefined) {
          transcript = next.trim()
        } else {
          const recording = await listen()
          if (!recording) {
            pending.current = []
            home()?.cancelVoice()
            setError('I didn’t hear anything. Is the microphone on and not muted?')
            return
          }
          setStatus('thinking')
          transcript = await transcribe(recording)
        }
        setStatus('thinking')
        if (!transcript) {
          home()?.cancelVoice()
          setError('I didn’t catch that.')
          return
        }
        setLastHeard(transcript)
        home()?.voiceHeard(transcript)
        home()?.voiceThinking()

        // The assistant decides. A change is only made once it has asked and heard a yes; then it is made on the shared recipe.
        const command = await requestChange({ transcript, from: 'grandkid', activeStep: kitchen?.stepNow() ?? null, pending: pending.current })
        setLastReply(command.reply)

        if (command.action === 'confirm') {
          pending.current = command.ops
          home()?.voiceAsk()
          setStatus('speaking')
          await speakReply(command.reply)
          // Typed requests wait for a typed answer; a spoken one is listened for straight away.
          if (typed !== undefined) return
          next = undefined
          continue
        }

        pending.current = []
        if (command.action === 'change_recipe' && command.change) home()?.voiceResult(command.change, command.reply)
        else {
          home()?.voiceResult(null, command.reply)
          if (command.action === 'start_cooking') kitchen?.startCooking()
          else if (command.action === 'go_to_step' && command.step) kitchen?.goToStep(command.step)
          else if (command.action === 'next_step') kitchen?.goToStep((kitchen.stepNow() ?? 0) + 1)
          else if (command.action === 'previous_step') kitchen?.goToStep((kitchen.stepNow() ?? 2) - 1)
          else if (command.action === 'stop_cooking') kitchen?.leaveSteps()
        }
        setStatus('speaking')
        await speakReply(command.reply)
        return
      }
    } catch {
      pending.current = []
      home()?.cancelVoice()
      setError('That didn’t go through. Say “Hey Popo” to try again.')
    } finally {
      busy.current = false
      setStatus('idle')
    }
  }, [bridge])

  return { status, error, run, lastHeard, lastReply }
}
