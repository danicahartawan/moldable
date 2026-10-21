import type { Metadata } from 'next'
import { ScreenNav } from '@/boards/ScreenNav'
import { FridgeScreen } from '@/kitchen/FridgeScreen'

export const metadata: Metadata = {
  title: 'Fridge cookbooks · Moldable',
}

export default function FridgePage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/fridge" />
      <div className="hv-stage">
        <div className="st-screen"><FridgeScreen /></div>
        <p className="hv-caption">Fridge cookbooks, 640 × 640 for the 5.73 in display. Swipe between fridges, drag the notes, tap one to open it.</p>
      </div>
    </div>
  )
}
