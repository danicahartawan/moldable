import type { Metadata } from 'next'
import { GrandmaPage } from '@/grandma/GrandmaPage'

export const metadata: Metadata = {
  title: 'Record Grandma — Moldable',
}

export default function GrandmaRoute() {
  return <GrandmaPage />
}
