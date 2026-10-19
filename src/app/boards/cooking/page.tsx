import type { Metadata } from 'next'
import { CookingStepBoard } from '@/boards/CookingStep'
import { ScreenNav } from '@/boards/ScreenNav'

export const metadata: Metadata = {
  title: 'Cooking step · Moldable',
}

export default function CookingStepPage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/cooking" />
      <CookingStepBoard />
    </div>
  )
}
