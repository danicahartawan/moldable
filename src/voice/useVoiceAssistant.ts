'use client'

import { useCallback, useRef, useState, type MutableRefObject } from 'react'
import type { KitchenVoiceBridge } from '@/kitchen/KitchenMockup'
import type { VoiceCommand } from '@/app/api/voice/command/route'
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
  const busy = useRef(false)

  const run = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setError(null)
    stopSpeaking()
    const kitchen = bridge.current
    const home = () => kitchen?.home() ?? null
    try {
      setStatus('listening')
      home()?.voiceListen()
      const recording = await listen()
      if (!recording) {
        home()?.cancelVoice()
        return
      }

      setStatus('thinking')
      const transcript = await transcribe(recording)
      if (!transcript) {
        home()?.cancelVoice()
        setError('I didn’t catch that.')
        return
      }
      home()?.voiceHeard(transcript)
      home()?.voiceThinking()

      const recipeNow = home()?.recipeNow() ?? { servings: 4, mild: false, chicken: false, kencurSwapped: false }
      const response = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, recipeNow, activeStep: kitchen?.stepNow() ?? null }),
      })
      if (!response.ok) throw new Error('The assistant could not answer')
      const command = await response.json() as VoiceCommand

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
    } catch {
      home()?.cancelVoice()
      setError('Something went wrong. Say “Hey Popo” to try again.')
    } finally {
      busy.current = false
      setStatus('idle')
    }
  }, [bridge])

  return { status, error, run }
}
