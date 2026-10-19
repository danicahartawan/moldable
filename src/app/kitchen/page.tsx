import type { Metadata } from 'next'
import { KitchenMockup } from '@/kitchen/KitchenMockup'
import '@/kitchen/kitchen.css'

export const metadata: Metadata = {
  title: 'Moldable kitchen',
}

export default function KitchenPage() {
  return <KitchenMockup />
}
