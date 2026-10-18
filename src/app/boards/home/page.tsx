import type { Metadata } from 'next'
import { HomeViewBoard } from '@/boards/HomeView'
import { ScreenNav } from '@/boards/ScreenNav'

export const metadata: Metadata = {
  title: 'Grandkid home view · Moldable',
}

export default function HomeViewPage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/home" />
      <HomeViewBoard />
    </div>
  )
}
