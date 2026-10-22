// The Grandkids chip icons: a 20px grid, round caps and joins, drawn in currentColor.
const PATHS = {
  pause: 'M7 4.5v11M13 4.5v11',
  stop: 'M5.5 5.5h9v9h-9z',
  play: 'M7 4.5l8 5.5-8 5.5z',
  camera: 'M3 7h2.5l1.2-2h6.6l1.2 2H17v9H3z M10 13.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z',
} as const

export function LineIcon({ name, size = 22, width = 1.8 }: { name: keyof typeof PATHS; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
