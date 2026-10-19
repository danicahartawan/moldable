// Moldable line icons: 20px grid, 1.6 stroke, round caps and joins, currentColor.
// Paths are copied from the design system's Icon component; `chat` is drawn on the
// same grid because the system has no speech-bubble glyph yet.

const CIRCLE = 'M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14z'

const PATHS = {
  scan: ['M3.5 7V3.5H7M13 3.5h3.5V7M16.5 13v3.5H13M7 16.5H3.5V13', 'M3.5 10h13'],
  mic: ['M10 3a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 10 3z', 'M5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v3'],
  chat: ['M5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H10l-3.5 3.2V13h-1A1.5 1.5 0 0 1 4 11.5v-6A1.5 1.5 0 0 1 5.5 4z'],
  alert: ['M7 3.5h6l3.5 6.5-3.5 6.5H7L3.5 10z', 'M10 7v3.4', 'M10 13.2v.1'],
  'x-circle': [CIRCLE, 'M7.8 7.8l4.4 4.4M12.2 7.8l-4.4 4.4'],
} as const

export type IconName = keyof typeof PATHS

type IconProps = { name: IconName; size?: number; className?: string }

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className ? `md-icon ${className}` : 'md-icon'}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

// Dot spinner from the design system's Button "working" state (3x3 grid).
export function DotSpinner() {
  return (
    <svg className="md-dots" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <circle
          key={i}
          cx={4 + (i % 3) * 6}
          cy={4 + Math.floor(i / 3) * 6}
          r="1.4"
          style={{ animationDelay: `${((i % 3) + Math.floor(i / 3)) * 90}ms` }}
        />
      ))}
    </svg>
  )
}

// Record glyph: outlined ring with a solid coral core.
export function RecordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg className="md-icon md-icon--record" width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="4.6" fill="#df7774" />
    </svg>
  )
}
