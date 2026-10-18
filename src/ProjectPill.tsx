import './styles.css';

const foods = [
  ['Bean pancakes', '/assets/food-01-bean-pancakes.png'],
  ['Colorful rice cakes', '/assets/food-02-colorful-rice-cakes.png'],
  ['Brown layered cakes', '/assets/food-03-brown-layered-cakes.png'],
  ['Banana leaf cakes', '/assets/food-04-banana-leaf-cakes.png'],
  ['Green coconut cakes', '/assets/food-05-green-coconut-cakes.png'],
  ['Sesame balls', '/assets/food-06-sesame-balls.png'],
  ['Steamed cupcakes', '/assets/food-07-steamed-cupcakes.png'],
  ['Wrapped rice cakes', '/assets/food-08-wrapped-rice-cakes.png'],
  ['Red rice rolls', '/assets/food-09-red-rice-rolls.png'],
  ['Striped layer cake', '/assets/food-10-striped-layer-cake.png'],
] as const;

export function ProjectPill() {
  return (
    <section className="project-pill" aria-label="Groth project chooser">
      <h1>Groth</h1>
      <div className="project-pill__divider" aria-hidden="true" />
      <div className="project-pill__rail" role="group" aria-label="Food illustrations">
        {foods.map(([label, src]) => (
          <button className="food-button" type="button" aria-label={label} key={label}>
            <img src={src} alt="" role="img" />
          </button>
        ))}
      </div>
      <div className="project-pill__divider" aria-hidden="true" />
    </section>
  );
}
