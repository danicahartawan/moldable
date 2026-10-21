import type { Metadata } from 'next'
import { ScreenNav } from '@/boards/ScreenNav'
import { GooDemo } from '@/goo/GooDemo'
import '@/goo/goo-demo.css'

export const metadata: Metadata = {
  title: 'Goo tooltip · Moldable',
}

export default function GooPage() {
  return (
    <div className="boards">
      <ScreenNav current="/boards/goo" />
      <GooDemo />
    </div>
  )
}
