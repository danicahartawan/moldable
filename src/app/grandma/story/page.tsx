import type { Metadata } from 'next'
import { StoredGrandmaWritingScreen } from '@/grandma/GrandmaWritingScreen'

export const metadata: Metadata = {
  title: 'Grandma’s Story — Moldable',
}

export default function GrandmaStoryRoute() {
  return <StoredGrandmaWritingScreen />
}
