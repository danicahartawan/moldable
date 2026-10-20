'use client'

import { KitchenMockup } from '../kitchen/KitchenMockup'
import { GrandmaMinimalPage } from './GrandmaMinimalPage'
import '../kitchen/type-scale.css'

// The kitchen with the minimal grandma screen; Tidy takes the recipe straight to the Grandkids view.
export function GrandmaMinimalKitchen() {
  return (
    <div className="gm-kitchen">
      <KitchenMockup fridge grandmaScreen={({ showRecipe }) => <GrandmaMinimalPage onTidy={showRecipe} />} />
    </div>
  )
}
