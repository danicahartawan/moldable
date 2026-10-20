import type { Metadata } from 'next'
import { ScreenNav } from '@/boards/ScreenNav'
import { GlowDemo } from '@/voice/GlowDemo'

export const metadata: Metadata = {
  title: 'Speaking glow · Moldable',
}

export default function GlowDemoPage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/glow" />
      <GlowDemo />
    </div>
  )
}
