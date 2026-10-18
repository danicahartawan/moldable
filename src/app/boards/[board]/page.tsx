import { notFound } from 'next/navigation'
import { BoardShell } from '@/boards/BoardShell'
import { BOARDS, type BoardSlug } from '@/boards/boards'
import { AnatomyBoard } from '@/boards/Anatomy'
import { HomeViewBoard } from '@/boards/HomeView'
import { RecordBoard } from '@/boards/Record'
import { RecipeBoard } from '@/boards/Recipe'
import { StepBoard } from '@/boards/Step'
import { WeighBoard } from '@/boards/Weigh'

const VIEWS: Record<BoardSlug, () => React.JSX.Element> = {
  recipe: RecipeBoard,
  step: StepBoard,
  weigh: WeighBoard,
  record: RecordBoard,
  anatomy: AnatomyBoard,
  home: HomeViewBoard,
}

export const dynamicParams = false

export function generateStaticParams() {
  return BOARDS.map((b) => ({ board: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params
  const found = BOARDS.find((b) => b.slug === board)
  return { title: found ? `${found.number} ${found.title} · Moldable` : 'Moldable' }
}

export default async function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params
  if (!BOARDS.some((b) => b.slug === board)) notFound()
  const View = VIEWS[board as BoardSlug]
  return (
    <BoardShell current={board as BoardSlug}>
      <View />
    </BoardShell>
  )
}
