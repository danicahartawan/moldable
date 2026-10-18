import type { Metadata } from 'next'
import { ExploreBoard } from '@/boards/Explore'
import { ScreenNav } from '@/boards/ScreenNav'

export const metadata: Metadata = {
  title: 'Explore recipes · Moldable',
}

export default function ExplorePage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/explore" />
      <ExploreBoard />
    </div>
  )
}
