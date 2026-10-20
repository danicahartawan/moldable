import type { Metadata } from 'next'
import { GrandmaMinimalKitchen } from '@/grandma/GrandmaMinimalKitchen'
import '@/kitchen/kitchen.css'

export const metadata: Metadata = {
  title: 'Grandma | Moldable',
}

export default function GrandmaBlankRoute() {
  return <GrandmaMinimalKitchen />
}
