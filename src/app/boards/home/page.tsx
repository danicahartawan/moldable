import type { Metadata } from 'next'
import { HomeViewBoard } from '@/boards/HomeView'

export const metadata: Metadata = {
  title: 'Grandkid home view · Moldable',
}

export default function HomeViewPage() {
  return (
    <div className="boards">
      <HomeViewBoard />
    </div>
  )
}
