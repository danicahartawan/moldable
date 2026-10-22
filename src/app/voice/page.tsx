import type { Metadata } from 'next'
import { VoiceKitchen } from '@/voice/VoiceKitchen'

export const metadata: Metadata = {
  title: 'Voice | Moldable',
}

export default function VoiceRoute() {
  return <VoiceKitchen />
}
