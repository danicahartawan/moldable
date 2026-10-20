'use client'

import './clay-mix.css'

// The orange clay with teal poured in: three drops swirl through it until it's one teal ball.
export function ClayMix() {
  return (
    <span className="cm" role="img" aria-label="Mixing teal into the clay">
      <span className="cm__lump">
        <span className="cm__stir">
          <span className="cm__teal cm__teal--a" />
          <span className="cm__teal cm__teal--b" />
          <span className="cm__teal cm__teal--c" />
        </span>
        <span className="cm__wash" />
      </span>
    </span>
  )
}

// A little orange clay blob, the icon inside the Adjust chip.
export function ClayBlob() {
  return <span className="hv-adjust__blob" aria-hidden="true" />
}
