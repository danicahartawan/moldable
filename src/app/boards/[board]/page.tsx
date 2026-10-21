import { notFound } from 'next/navigation'
import { BoardShell } from '@/boards/BoardShell'
import { BOARDS, type BoardSlug } from '@/boards/boards'
import { AnatomyBoard } from '@/boards/Anatomy'
import { RecordBoard } from '@/boards/Record'
import { RecipeBoard } from '@/boards/Recipe'
import { StepBoard } from '@/boards/Step'
import { WeighBoard } from '@/boards/Weigh'

// /boards/home has its own route (app/boards/home), which wins over this one, so the home view isn't listed here:
// importing it would ship its client code with every other board for nothing.
type Slug = Exclude<BoardSlug, 'home'>
const VIEWS: Record<Slug, React.ComponentType> = {
  recipe: RecipeBoard,
  step: StepBoard,
  weigh: WeighBoard,
  record: RecordBoard,
  anatomy: AnatomyBoard,
}
const isSlug = (s: string): s is Slug => Object.prototype.hasOwnProperty.call(VIEWS, s)

export const dynamicParams = false

export function generateStaticParams() {
  return BOARDS.filter((b) => isSlug(b.slug)).map((b) => ({ board: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params
  const found = BOARDS.find((b) => b.slug === board)
  return { title: found ? `${found.number} ${found.title} · Moldable` : 'Moldable' }
}

export default async function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params
  if (!isSlug(board)) notFound()
  const View = VIEWS[board]
  return (
    <BoardShell current={board}>
      <View />
    </BoardShell>
  )
}
