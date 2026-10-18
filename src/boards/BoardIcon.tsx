// Line icons from the Moldable board wireframes, all on a 20×20 grid.
const PATHS = {
  mic: ['M10 3a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 10 3z', 'M5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v3'],
  scan: ['M3.5 7V3.5H7M13 3.5h3.5V7M16.5 13v3.5H13M7 16.5H3.5V13'],
  chat: ['M4 4.5h12v8.5H9l-3.5 3v-3H4z'],
  plus: ['M10 4.5v11M4.5 10h11'],
  up: ['M5 12l5-5 5 5'],
  down: ['M5 8l5 5 5-5'],
  chevDown: ['M6 8l4 4 4-4'],
  chevUp: ['M6 12l4-4 4 4'],
  left: ['M12 5l-5 5 5 5'],
  right: ['M8 5l5 5-5 5'],
  list: ['M7 5h9M7 10h9M7 15h9', 'M3.5 5h.01M3.5 10h.01M3.5 15h.01'],
  flame: ['M10 17c-2.9 0-5-2-5-4.7 0-2.7 2.1-4 2.6-6.6 1 1.1 1.5 2.1 1.5 3.4C10.3 7.4 11.3 5.2 10.8 3c2.7 1.7 4.2 4.6 4.2 7.4C15 14.6 13 17 10 17z'],
  check: ['M5 10.5l3.2 3.2L15 6.8'],
  scale: ['M3 15h14M5 15l1.5-8h7L15 15', 'M10 7V4.5'],
  cup: ['M4 6h10v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z', 'M14 8h1.5a2 2 0 0 1 0 4H14'],
  eye: ['M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z', 'M10 7.8a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z'],
  knife: ['M3.5 16.5L14.6 5.4a2.8 2.8 0 0 1 0 4L9.5 14.5z', 'M11.5 11.5l1.3 1.3'],
  next: ['M4 10h11M11 6l4 4-4 4'],
  folder: ['M3 6h5l2 2h7v8H3z'],
  family: ['M7 9a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM2 17c0-3 2.5-5 5-5s5 2 5 5M13 4a3 3 0 0 1 0 6M18 17c0-2-1-3.5-3-4.5'],
  book: ['M15.5 13.5H6a1.5 1.5 0 0 0 0 3h9.5v-13H6A1.5 1.5 0 0 0 4.5 5v10'],
  arc: ['M10 3a7 7 0 1 0 7 7'],
} as const

export type BoardIconName = keyof typeof PATHS

type Props = {
  name: BoardIconName
  size?: number
  stroke?: number
  className?: string
  style?: React.CSSProperties
}

export function BoardIcon({ name, size = 20, stroke = 1.6, className, style }: Props) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
