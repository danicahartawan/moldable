'use client'

import './clay-mix.css'

// The orange clay sits alone, then one drop of teal lands. The whole ball is stretched and pulled about while the teal spreads, until it's all teal.
export function ClayMix() {
  return (
    <span className="cm" role="img" aria-label="Mixing teal into the clay">
      <span className="cm__fall" />
      <span className="cm__stretch">
        <span className="cm__lump">
          <span className="cm__smear" />
          <span className="cm__wash" />
        </span>
      </span>
    </span>
  )
}

// A little clay blob, the icon inside the Adjust chip. It turns teal once the clay has been mixed.
export function ClayBlob({ teal = false }: { teal?: boolean }) {
  return <span className={`hv-adjust__blob${teal ? ' is-teal' : ''}`} aria-hidden="true" />
}
