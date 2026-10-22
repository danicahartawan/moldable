import { GrandmaMinimalKitchen } from '@/grandma/GrandmaMinimalKitchen'
import '@/kitchen/kitchen.css'

// The first thing anyone opens is the Grandma and Grandkids kitchen: the same screens as /grandma/blank, with no path.
export default function Home() {
  return <GrandmaMinimalKitchen />
}
