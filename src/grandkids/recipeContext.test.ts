import { describe, expect, it } from 'vitest'

import {
  GRANDKIDS_INGREDIENT_TARGETS,
  GRANDKIDS_RECIPE_CONTEXT,
  GRANDKIDS_STEP_TARGETS,
  formatRecipeGrounding,
} from './recipeContext'

describe('grandkids recipe context', () => {
  it("keeps Oma's original measurement grammar beside tidy amounts", () => {
    expect(GRANDKIDS_RECIPE_CONTEXT.ingredients.map((ingredient) => ingredient.familyAmount)).toEqual([
      '½ kilo',
      'segenggam',
      '6 butir',
      '4 siung',
      '1 sendok',
      '2 ruas',
      'sejumput',
      '4 lembar',
      '1 buah',
      '1 ikat',
      '2 gelas',
    ])
    expect(GRANDKIDS_RECIPE_CONTEXT.ingredients[0]).toMatchObject({ tidyAmount4: '500 g', tidyAmount2: '250 g' })
  })

  it('defines all eight numbered cooking steps and allowed UI targets', () => {
    expect(GRANDKIDS_RECIPE_CONTEXT.steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(GRANDKIDS_STEP_TARGETS).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(GRANDKIDS_INGREDIENT_TARGETS).toContain('kencur')
  })

  it('formats the current serving and kencur substitution state for grounding', () => {
    const grounding = formatRecipeGrounding({
      servings: 2,
      activeStep: 2,
      versionLabel: 'Nevan + Fred · 2 servings',
      kencurSubstitution: true,
    })

    expect(grounding).toContain('Nevan + Fred · 2 servings')
    expect(grounding).toContain('Ginger + lime zest')
    expect(grounding).toContain('Active walkthrough step: 2')
    expect(grounding).toContain('segenggam')
  })
})
