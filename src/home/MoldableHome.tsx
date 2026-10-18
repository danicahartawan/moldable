import { HomeViewFrame } from './HomeViewFrame'
import { ToolRail } from './ToolRail'

export function MoldableHome() {
  return (
    <HomeViewFrame label="Moldable HomeView">
      <ToolRail />
      <img
        className="moldable-mascot"
        src="/assets/grandma-character.png"
        alt="Moldable companion"
        draggable={false}
      />
    </HomeViewFrame>
  )
}
