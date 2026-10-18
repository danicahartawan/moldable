function SotoIllustration() {
  return (
    <svg
      className="recipe-article__illustration"
      role="img"
      aria-label="An illustrated bowl of Soto Ayam"
      viewBox="0 0 260 190"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 78c6 61 34 91 92 91s87-30 93-91H38Z" strokeWidth="3" />
        <ellipse cx="130" cy="78" rx="93" ry="28" strokeWidth="3" />
        <path d="M52 77c17 16 50 21 78 21s62-5 79-21" strokeWidth="1.5" />
        <path d="M72 66c19-20 42 21 61-2s39 18 58-3M80 82c16-18 36 13 52-5s32 12 48-5" strokeWidth="2" />
        <ellipse cx="105" cy="68" rx="20" ry="13" transform="rotate(-18 105 68)" strokeWidth="2" />
        <path d="M105 56v24M93 69h24" strokeWidth="1" />
        <path d="M145 58c7-12 17-16 27-10-2 13-11 20-27 10ZM147 59l21-8" strokeWidth="2" />
        <path d="M55 122c48 13 102 13 151 0M65 139c42 10 86 10 129 0M83 156c31 5 63 5 94 0" opacity=".45" />
        <path d="m204 47 31-25M213 58l33-17M222 68l31-8" strokeWidth="2" />
      </g>
    </svg>
  )
}

export function RecipeBook() {
  return (
    <article className="recipe-article" aria-label="Soto Ayam recipe">
      <header className="recipe-article__header">
        <span className="recipe-article__eyebrow">Dapur notes · 01</span>
        <h1>Soto Ayam</h1>
        <p className="recipe-article__dek">A golden chicken soup brightened with lime, herbs, and the warmth of turmeric.</p>
      </header>

      <section className="recipe-article__section">
        <h2>For the table</h2>
        <ul>
          <li>700 g chicken thighs</li>
          <li>2 stalks lemongrass, bruised</li>
          <li>4 lime leaves</li>
          <li>Turmeric, ginger &amp; garlic</li>
          <li>Rice noodles and bean sprouts</li>
          <li>Eggs, lime and fried shallots</li>
        </ul>
        <p className="recipe-article__note">The broth should taste gently earthy first, then clean and citrusy at the finish.</p>
      </section>

      <section className="recipe-article__section">
        <h2>The method</h2>
        <SotoIllustration />
        <p>
          Begin by pounding garlic, ginger, turmeric, coriander and candlenut into a fragrant paste. Warm a little oil in a deep pot and cook the paste slowly, until its raw edge gives way to a mellow, golden perfume.
        </p>
        <p>
          Add the chicken with lemongrass and lime leaves, then cover with water. Simmer without hurry until the meat is tender and the broth has taken on its clear yellow colour. Lift out the chicken, shred it finely, and return the bones to the pot for a final ten minutes.
        </p>
        <p>
          Divide softened noodles, sprouts and chicken among warm bowls. Ladle over the strained broth. Finish each serving with half an egg, celery leaves, fried shallots, sambal and a squeeze of lime. Serve while the herbs are still vivid.
        </p>
        <blockquote>“A bowl built in layers: warm spice, soft chicken, then a bright last word of lime.”</blockquote>
      </section>
    </article>
  )
}
