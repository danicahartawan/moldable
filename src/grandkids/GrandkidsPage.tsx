const ingredients = [
  '700 g chicken thighs',
  '2 stalks lemongrass',
  '3 daun salam leaves',
  '4 makrut lime leaves',
  '30 g fresh turmeric',
  '25 g ginger',
  '5 garlic cloves',
  '5 candlenuts',
  '1 tsp ground coriander',
  '200 g rice noodles',
  '150 g bean sprouts',
  '4 eggs',
  '2 limes',
  '4 tbsp fried shallots',
]

export function GrandkidsPage() {
  return (
    <main aria-labelledby="grandkids-recipe-title">
      <header>
        <p>Grandma’s recipe · Serves 4</p>
        <h1 id="grandkids-recipe-title">Soto Ayam</h1>
      </header>

      <section aria-labelledby="grandkids-ingredients-title">
        <h2 id="grandkids-ingredients-title">Ingredients</h2>
        <ul>
          {ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
        </ul>
      </section>
    </main>
  )
}
