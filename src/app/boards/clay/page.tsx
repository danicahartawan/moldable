import type { Metadata } from 'next'
import { ScreenNav } from '@/boards/ScreenNav'
import { ClayLab } from '@/clay/ClayLab'

export const metadata: Metadata = {
  title: 'Clay · Moldable',
}

export default function ClayLabPage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/clay" />
      <ClayLab />
    </div>
  )
}
