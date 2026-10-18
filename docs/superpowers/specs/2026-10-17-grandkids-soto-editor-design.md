# Grandkids Soto Ayam Editor Design

## Purpose

Create a separate `/grandkids` interface that helps a grandchild adapt and cook Grandma's Soto Ayam recipe. The experience should feel like an expressive editorial cookbook page rather than a conventional recipe app. It must preserve Grandma's original recipe while making ingredients, quantities, and substitutions tactile and understandable.

## Experience Principles

- Preserve the spacious, asymmetrical structure of the supplied editorial cookbook references.
- Make the recipe feel moldable without allowing interactions to destroy readability.
- Show the original recipe and every adaptation clearly.
- Keep the first version focused entirely on Soto Ayam.
- Treat the existing root interface as separate and unchanged.

## Route and Page Structure

The application will choose the rendered experience from `window.location.pathname`:

- `/grandkids` renders the new Soto Ayam editor.
- All other paths continue to render the existing project bar and ginger interface.

The Grandkids page uses a full-width warm-white editorial canvas with a subtle paper texture. Its visual structure follows the supplied references:

1. Small recipe number and oversized serif title.
2. Short passages placed across a spacious page rather than in one narrow article column.
3. A small documentary-style cooking image.
4. A circular audio control representing Grandma's recorded explanation.
5. A persistent centered ingredient toolbox.
6. Large ingredient illustrations placed among the writing.
7. A quiet natural-language command bar.

The desktop composition should retain substantial negative space. On narrow screens, the same content becomes a single readable editorial stream while the toolbox remains horizontally scrollable.

## Ingredient Toolbox

The toolbox contains the complete ingredient set needed for the displayed Soto Ayam recipe:

- Chicken thighs — 700 g
- Lemongrass — 2 stalks
- Daun salam — 2 leaves
- Makrut lime leaves — 4 leaves
- Fresh turmeric — 3 cm
- Ginger — 3 cm
- Garlic — 4 cloves
- Candlenuts — 3 nuts
- Ground coriander — 1 teaspoon
- Rice noodles — 200 g
- Bean sprouts — 150 g
- Eggs — 3
- Limes — 2
- Fried shallots — 4 tablespoons

Each item appears as an illustrated or cutout-style object rather than a conventional card. Hovering or keyboard-focusing an item displays a compact tooltip containing its name and current quantity. Toolbox items remain available after use: dragging creates a copy on the page rather than removing the source.

The toolbox also includes a finished Soto Ayam bowl object so the grandchild can place the completed dish within the composition.

## Dragging and Text Wrapping

Dragging should feel freeform, but the underlying layout uses invisible wrap lanes to keep the recipe legible.

- A dropped object resolves to the nearest valid left or right wrap lane and vertical recipe section.
- The placed ingredient uses a floated layout with an appropriate `shape-outside` contour so surrounding text wraps around the visible object.
- The object animates gently from the pointer's drop position into the resolved lane.
- Placed objects can be dragged again, moved between lanes, or removed.
- The current lane is previewed during dragging.
- Keyboard users can add an ingredient, switch its left/right alignment, move it between recipe sections, and remove it.

The first version intentionally avoids arbitrary pixel positioning. Exact freeform placement would make responsive text reflow unpredictable and conflict with the reference's deliberate editorial structure.

## Natural-Language Editing

A command bar accepts two demonstrated command types locally, without requiring a backend:

### Serving-size adaptation

Example: `I'm making this for six people.`

- The base recipe serves four.
- Recognized serving counts rescale every ingredient quantity from the unchanged base values.
- Updated quantities appear in the toolbox, ingredient list, and any relevant method text.
- Changed values receive a short visual highlight.
- A small adaptation note states that quantities were scaled from Grandma's four-serving original.

### Ingredient substitution

Example: `I can't find daun salam in Berkeley.`

- The page proposes bay leaf as the locally accessible substitute.
- The response explains the tradeoff: bay leaf adds a similar herbal backbone but lacks daun salam's softer, slightly citrusy warmth.
- The user can apply or dismiss the substitution.
- Applying it updates the toolbox and recipe annotations while retaining a visible reference to Grandma's original ingredient.
- DoorDash is represented as a clearly labeled discovery action in this prototype; it does not place an order or call a real CLI.

Commands outside the supported demonstration set receive a gentle message explaining the examples the prototype understands. The original recipe data is never destructively overwritten.

## State Model

The Grandkids interface owns local React state for:

- Current serving count.
- Active substitutions.
- Placed ingredient instances and their section/lane assignments.
- Natural-language command text and most recent result.
- Audio playback state for the demonstrative Grandma control.

Canonical recipe data remains immutable. Displayed recipe values are derived from that data plus the current adaptation state. No persistence or backend is required for this first version.

## Components

- `GrandkidsPage`: owns adaptation and placement state and assembles the page.
- `IngredientToolbox`: renders draggable sources and accessible tooltips.
- `IngredientObject`: renders a placed ingredient with drag and keyboard controls.
- `EditorialRecipe`: renders the title, story, method, image, audio control, and wrap lanes.
- `RecipeCommandBar`: parses supported commands and presents proposed changes.
- `recipeData`: contains immutable Soto Ayam ingredient, serving, substitution, and method data.

The components should stay independent: the toolbox emits an ingredient identifier, the recipe resolves placement, and the command bar emits a structured proposed adaptation.

## Assets and Visual Language

Use warm white, charcoal, and muted food colors. Typography pairs an expressive high-contrast serif for editorial content with a quiet sans serif for controls. Controls use translucent white surfaces and soft shadows so they remain distinct without making the page resemble a dashboard.

Ingredient imagery should have transparent backgrounds and a consistent tactile, photographed-collage character. If final cutout assets are unavailable, the implementation may use carefully styled illustrative placeholders, but each ingredient must remain immediately recognizable.

## Responsive Behavior

- Desktop: asymmetrical multi-zone editorial composition with left/right wrap lanes.
- Tablet: reduced negative space with the same lane behavior.
- Mobile: single content stream; placed objects alternate left and right within the stream, and the toolbox becomes a bottom horizontal tray.
- Dragging uses Pointer Events so mouse and touch share one interaction model.
- All essential actions have click and keyboard equivalents.

## Error and Edge Handling

- Dropping outside the recipe returns the object to the toolbox with no state change.
- A lane that cannot fit an object resolves to the next available section.
- Invalid or empty commands do not modify recipe state.
- Serving values are constrained to a practical range of 1–20.
- Missing imagery falls back to a labeled ingredient silhouette.
- Reduced-motion preferences remove snapping and highlight animations.

## Verification

Automated component tests should verify:

- `/grandkids` renders independently from the root experience.
- All Soto Ayam ingredients appear with accessible names and quantities.
- Hover and keyboard focus expose quantity tooltips.
- Dragging or its accessible equivalent places a copied ingredient in a wrap lane.
- A placed object can change lanes and be removed.
- A six-person command rescales quantities from four servings.
- The daun salam command proposes and applies bay leaf without deleting the original record.
- Unsupported commands leave state unchanged.

Browser tests should verify the principal desktop drag path, responsive mobile composition, visible text reflow, and absence of overlap between core recipe text and placed objects.

## Out of Scope

- Real DoorDash ordering or CLI integration.
- General-purpose recipes beyond Soto Ayam.
- Arbitrary freeform pixel positioning.
- Multi-user editing, accounts, or cloud persistence.
- Vision-based cooking checkpoints.
- Generative recipe or substitution services.
