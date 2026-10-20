'use client'

import { KitchenMockup } from '../kitchen/KitchenMockup'
import { GrandmaMinimalPage } from './GrandmaMinimalPage'

// The kitchen with the minimal grandma screen; Tidy hands the recipe over to the Grandkids view.
export function GrandmaMinimalKitchen() {
  return (
    <div className="gm-kitchen">
      <KitchenMockup fridge grandmaScreen={({ showGrandkids }) => <GrandmaMinimalPage onTidy={showGrandkids} />} />
    </div>
  )
}
