import type { Metadata } from 'next'
import { ScreenNav } from '@/boards/ScreenNav'
import { StoryBoard } from '@/boards/Story'

export const metadata: Metadata = {
  title: 'Oma’s story · Moldable',
}

export default function StoryPage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/story" />
      <StoryBoard />
    </div>
  )
}
