import { BoardIcon } from './BoardIcon'

export function HoldToAsk({ label = 'Hold to ask' }: { label?: string }) {
  return (
    <button type="button" className="b-btn b-press">
      <BoardIcon name="mic" />
      {label}
    </button>
  )
}
