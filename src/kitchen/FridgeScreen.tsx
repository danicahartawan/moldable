'use client'

import './fridge.css'

// The first Grandkids screen: a fridge door with magnets, Popo's Lelawar Bali recipe the one that matters.
export function FridgeScreen({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="fr-screen" aria-label="Fridge">
      <div className="fr-door" aria-hidden="true">
        <span className="fr-handle fr-handle--top" />
        <span className="fr-handle fr-handle--bottom" />
      </div>

      <span className="fr-note" aria-hidden="true">pork → beef</span>
      <img className="fr-photo fr-photo--one" src="/assets/food-02-colorful-rice-cakes.png" alt="" draggable={false} />
      <img className="fr-photo fr-photo--two" src="/assets/food-07-steamed-cupcakes.png" alt="" draggable={false} />
      <span className="fr-magnet fr-magnet--loose" aria-hidden="true" />

      <button type="button" className="fr-card" aria-label="Open Popo’s Lelawar Bali recipe" onClick={onOpen}>
        <span className="fr-magnet fr-magnet--left" aria-hidden="true" />
        <span className="fr-magnet fr-magnet--right" aria-hidden="true" />
        <img className="fr-card__photo" src="/assets/lelawar-oma.png" alt="" draggable={false} />
        <span className="fr-card__title">Lelawar Bali</span>
        <span className="fr-card__sub">Popo’s recipe</span>
        <span className="fr-card__hint">Tap to open</span>
      </button>
    </div>
  )
}
