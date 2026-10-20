export type GrandkidsRecipeState = {
  servings: 2 | 4
  activeStep: number | null
  versionLabel: string | null
  kencurSubstitution: boolean
}

export const GRANDKIDS_RECIPE_CONTEXT = {
  title: 'Lawar Bali',
  attribution: "Oma Lien's recipe",
  cookingTimeMinutes: 40,
  tools: ['Bowl', 'Dry pan', 'Blender', 'Spatula', 'Rice pot'],
  ingredients: [
    { key: 'pork', name: 'Pork', familyAmount: '½ kilo', tidyAmount4: '500 g', tidyAmount2: '250 g' },
    { key: 'coconut', name: 'Coconut', familyAmount: 'segenggam', tidyAmount4: '80 g', tidyAmount2: '40 g' },
    { key: 'shallots', name: 'Shallots', familyAmount: '6 butir', tidyAmount4: '6', tidyAmount2: '3' },
    { key: 'garlic', name: 'Garlic', familyAmount: '4 siung', tidyAmount4: '4', tidyAmount2: '2' },
    { key: 'sambal', name: 'Sambal', familyAmount: '1 sendok', tidyAmount4: '1 tbsp', tidyAmount2: '½ tbsp' },
    { key: 'kencur', name: 'Kencur', familyAmount: '2 ruas', tidyAmount4: '2 cm', tidyAmount2: '1 cm' },
    { key: 'pepper', name: 'Pepper', familyAmount: 'sejumput', tidyAmount4: '½ tsp', tidyAmount2: '¼ tsp' },
    { key: 'lime-leaves', name: 'Lime leaves', familyAmount: '4 lembar', tidyAmount4: '4', tidyAmount2: '2' },
    { key: 'lime', name: 'Lime', familyAmount: '1 buah', tidyAmount4: '1', tidyAmount2: '1' },
    { key: 'chives', name: 'Chives', familyAmount: '1 ikat', tidyAmount4: '1 bunch', tidyAmount2: '½ bunch' },
    { key: 'rice', name: 'Rice', familyAmount: '2 gelas', tidyAmount4: '2 cups', tidyAmount2: '1 cup' },
  ],
  steps: [
    { number: 1, text: 'Toast the coconut in a dry pan until golden.' },
    { number: 2, text: 'Grind half the shallots and garlic with the sambal, kencur, pepper and lime leaves.' },
    { number: 3, text: 'Heat the oil and fry the rest of the shallots and garlic.' },
    { number: 4, text: 'Add the paste and cook until it smells sweet.' },
    { number: 5, text: 'Add the pork and the toasted coconut.' },
    { number: 6, text: 'Keep stirring until no pink is left.' },
    { number: 7, text: 'Squeeze in the lime and add the chives.' },
    { number: 8, text: 'Serve on pandan rice.' },
  ],
  substitutions: {
    kencur: 'Ginger + lime zest',
  },
} as const

export const GRANDKIDS_INGREDIENT_TARGETS = GRANDKIDS_RECIPE_CONTEXT.ingredients.map(({ key }) => key)
export const GRANDKIDS_STEP_TARGETS = GRANDKIDS_RECIPE_CONTEXT.steps.map(({ number }) => number)

export type GrandkidsIngredientTarget = (typeof GRANDKIDS_INGREDIENT_TARGETS)[number]

export function formatRecipeGrounding(state: GrandkidsRecipeState): string {
  const ingredientLines = GRANDKIDS_RECIPE_CONTEXT.ingredients.map((ingredient) => {
    const shownName = ingredient.key === 'kencur' && state.kencurSubstitution
      ? GRANDKIDS_RECIPE_CONTEXT.substitutions.kencur
      : ingredient.name
    const tidyAmount = state.servings === 2 ? ingredient.tidyAmount2 : ingredient.tidyAmount4
    return `- ${ingredient.key}: ${shownName}: Oma says ${ingredient.familyAmount}; tidy amount for ${state.servings}: ${tidyAmount}`
  })
  const stepLines = GRANDKIDS_RECIPE_CONTEXT.steps.map((step) => `${step.number}. ${step.text}`)

  return [
    `Recipe: ${GRANDKIDS_RECIPE_CONTEXT.title}`,
    `Family attribution: ${GRANDKIDS_RECIPE_CONTEXT.attribution}`,
    `Current version: ${state.versionLabel ?? GRANDKIDS_RECIPE_CONTEXT.attribution}`,
    `Current servings: ${state.servings}`,
    `Active walkthrough step: ${state.activeStep ?? 'none'}`,
    `Kencur substitution: ${state.kencurSubstitution ? GRANDKIDS_RECIPE_CONTEXT.substitutions.kencur : 'none'}`,
    `Cooking time: ${GRANDKIDS_RECIPE_CONTEXT.cookingTimeMinutes} minutes`,
    `Tools: ${GRANDKIDS_RECIPE_CONTEXT.tools.join(', ')}`,
    'Ingredients (family wording first; tidy amounts are only a visual aid):',
    ...ingredientLines,
    'Method:',
    ...stepLines,
  ].join('\n')
}
