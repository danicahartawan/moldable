import type { Metadata } from 'next'
import { RecipeBook } from '@/RecipeBook'

export const metadata: Metadata = {
  title: 'Grandma’s Story | Moldable',
}

export default function GrandmaStoryRoute() {
  return <RecipeBook />
}
