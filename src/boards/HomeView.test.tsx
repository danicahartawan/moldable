import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GRANDKIDS_RECIPE_CONTEXT } from '@/grandkids/recipeContext'
import { HomeViewBoard } from './HomeView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const talk = () => screen.getByRole('button', { name: 'Talk to Moldable' })
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const island = () => document.querySelector('.vn') as HTMLElement
const glow = () => document.querySelector('.sg')
const tag = (name: RegExp) => screen.getByText(name, { selector: '.hm-tag' })
const openIngredients = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }))
  return screen.getByRole('dialog', { name: 'Ingredients' })
}
const amountOf = (card: HTMLElement, name: string) => within(card).getByText(name).closest('li')?.querySelector('.hm-ingr__amt')

describe('HomeViewBoard 07b layout', () => {
  it('shows the title, the sentence, the tags and the photo with Adjust, Ingredients and Start cooking', () => {
    render(<HomeViewBoard autoVoice={false} />)
    expect(screen.getByRole('heading', { name: 'Lelawar Bali' })).toBeInTheDocument()
    expect(screen.getByText(/Balinese minced/)).toHaveTextContent('Balinese minced pork with toasted coconut, fried in a fresh spice paste and served on pandan rice.')
    expect(screen.getByRole('button', { name: /8 steps/ })).toBeInTheDocument()
    expect(tag(/40 min/)).toBeInTheDocument()
    expect(tag(/Serves 4/)).toBeInTheDocument()
    expect(tag(/Hot/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'See the whole photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adjust' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start cooking' })).toHaveAttribute('href', '/boards/cooking')
    // The old card layout is gone.
    expect(document.querySelector('.hv-card, .vh, .hv-menu')).not.toBeInTheDocument()
  })

  it('opens the steps card with all 8 steps and their verb tags, and Done closes it', () => {
    render(<HomeViewBoard autoVoice={false} />)
    fireEvent.click(screen.getByRole('button', { name: /8 steps/ }))
    const card = screen.getByRole('dialog', { name: 'Steps' })
    expect(card).toHaveTextContent('8 steps · about 40 min')
    expect(card.querySelectorAll('li')).toHaveLength(8)
    expect([...card.querySelectorAll('.hm-verb')].map((v) => v.textContent)).toEqual(['Blend', 'Toast', 'Fry', 'Cook', 'Add', 'Stir', 'Squeeze', 'Serve'])
    fireEvent.click(within(card).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Adjust updates the sentence, the tags, the steps and the ingredients, underlining what changed', () => {
    render(<HomeViewBoard autoVoice={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }))
    const adjust = screen.getByRole('dialog', { name: 'Adjust the recipe' })
    fireEvent.click(within(adjust).getByRole('button', { name: /Less spicy/ }))
    fireEvent.click(within(adjust).getByRole('button', { name: /Serves 2/ }))
    fireEvent.click(within(adjust).getByRole('button', { name: /Chicken/ }))
    expect(within(adjust).getByRole('button', { name: /Chicken/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.getByText('gentle spice paste')).toHaveClass('hm-mark')
    expect(screen.getByText('chicken', { selector: '.hm-sentence strong' })).toHaveClass('hm-mark')
    expect(tag(/25 min/)).toBeInTheDocument()
    expect(tag(/Serves 2/)).toBeInTheDocument()
    expect(tag(/Mild/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /8 steps/ }))
    const steps = screen.getByRole('dialog', { name: 'Steps' })
    expect(steps).toHaveTextContent('8 steps · about 25 min')
    expect(within(steps).getByText('a little sambal')).toHaveClass('hm-mark')
    expect(within(steps).getByText('chicken')).toHaveClass('hm-mark')
    fireEvent.click(within(steps).getByRole('button', { name: 'Done' }))

    const ingr = openIngredients()
    expect(ingr).toHaveTextContent('Ingredients · serves 2')
    expect(amountOf(ingr, 'Sambal')).toHaveTextContent('¼ tbsp')
    expect(amountOf(ingr, 'Sambal')?.querySelector('.hm-mark')).toBeInTheDocument()
    expect(amountOf(ingr, 'Coconut')).toHaveTextContent('40 g')
    expect(within(ingr).getByText('Chicken')).toHaveClass('hm-mark')
  })

  it('Ingredients switches between tidy amounts and Oma’s words, with the tools underneath', () => {
    render(<HomeViewBoard autoVoice={false} />)
    const ingr = openIngredients()
    expect(ingr.querySelectorAll('li')).toHaveLength(11)
    expect(amountOf(ingr, 'Pork')).toHaveTextContent('500 g')
    fireEvent.click(within(ingr).getByRole('button', { name: 'Oma’s words' }))
    expect(amountOf(ingr, 'Pork')).toHaveTextContent('½ kilo')
    expect(amountOf(ingr, 'Pork')).toHaveClass('is-raw')
    expect(ingr).toHaveTextContent('You’ll need a bowl, dry pan, blender, spatula and rice pot.')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps visible family ingredient wording aligned with the grounding context', () => {
    render(<HomeViewBoard autoVoice={false} />)
    const ingr = openIngredients()
    for (const ingredient of GRANDKIDS_RECIPE_CONTEXT.ingredients) {
      expect(within(ingr).getByText(ingredient.name).closest('li')).toHaveAttribute('data-family-amount', ingredient.familyAmount)
    }
  })

  it('has a version button next to the tags that opens the history; each Adjust change adds a version', () => {
    render(<HomeViewBoard autoVoice={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Version history, version 3' }))
    const history = screen.getByRole('dialog', { name: 'Version history' })
    expect(history.querySelectorAll('li')).toHaveLength(3)
    expect(history.querySelector('li.is-current')).toHaveTextContent('Oma Lien Tidied into clean steps')
    fireEvent.click(within(history).getByRole('button', { name: 'Done' }))

    fireEvent.click(screen.getByRole('button', { name: 'Adjust' }))
    fireEvent.click(screen.getByRole('button', { name: /Less spicy/ }))
    fireEvent.click(screen.getByRole('button', { name: /Less spicy/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Version history, version 5' }))
    const items = [...screen.getByRole('dialog', { name: 'Version history' }).querySelectorAll('li')].map((li) => li.querySelector('.hm-versions__what')?.textContent)
    expect(items.slice(0, 2)).toEqual(['Grandkid Spicy again', 'Grandkid Less spicy'])
  })

  it('opens the whole photo, and Start cooking leads to the cooking step', () => {
    const start = vi.fn()
    render(<HomeViewBoard autoVoice={false} onStartCooking={start} />)
    fireEvent.click(screen.getByRole('button', { name: 'See the whole photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    expect(screen.queryByRole('button', { name: 'Close photo' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start cooking' }))
    expect(start).toHaveBeenCalledTimes(1)
  })
})

describe('HomeViewBoard voice view', () => {
  beforeEach(() => vi.useFakeTimers())

  it('plays once 3 s after the screen opens, with the clay, and makes the change mid-way', () => {
    render(<HomeViewBoard />)
    expect(document.querySelector('.hm-voice')).not.toBeInTheDocument()
    advance(3000)
    const view = () => document.querySelector('.hm-voice') as HTMLElement
    expect(view()).toHaveTextContent('Listening…')
    // The existing clay, not a gradient orb.
    expect(view().querySelector('.hm-voice__clay svg')).toBeInTheDocument()
    expect(document.querySelector('.orb')).not.toBeInTheDocument()
    advance(1400)
    expect(view()).toHaveTextContent('“Make it less spicy for Oma”')
    advance(1500)
    expect(view()).toHaveTextContent('Sambal is down to half a spoon.')
    expect(tag(/Mild/)).toBeInTheDocument()
    advance(1400)
    expect(document.querySelector('.hm-voice')).not.toBeInTheDocument()
    advance(10000)
    expect(document.querySelector('.hm-voice')).not.toBeInTheDocument()
  })

  it('replays from the hidden spot', () => {
    render(<HomeViewBoard autoVoice={false} />)
    fireEvent.click(screen.getByRole('button', { name: /replay the speaking view/ }))
    expect(document.querySelector('.hm-voice')).toHaveTextContent('Listening…')
  })
})

describe('HomeViewBoard talk corner (speaking glow, island and clay)', () => {
  beforeEach(() => vi.useFakeTimers())

  it('listens, hears, thinks, then halves the servings and says so in the island', () => {
    render(<HomeViewBoard autoVoice={false} />)
    expect(glow()).toHaveAttribute('data-state', 'idle')

    fireEvent.click(talk())
    expect(glow()).toHaveAttribute('data-state', 'listening')
    expect(island()).toHaveTextContent('Listening…')
    advance(1500)
    expect(screen.getByText('“Actually, I just want two servings.”')).toBeInTheDocument()
    expect(glow()).toHaveAttribute('data-state', 'hearing')
    advance(3600)
    expect(glow()).toHaveAttribute('data-state', 'thinking')
    advance(800)
    expect(glow()).toHaveAttribute('data-state', 'done')
    expect(island()).toHaveTextContent('Halved everything for 2 servings.')
    expect(tag(/Serves 2/)).toBeInTheDocument()
    expect(tag(/30 min/)).toBeInTheDocument()
    advance(1300)
    expect(island()).toHaveAttribute('data-state', 'idle')
  })

  it('swaps kencur for ginger and lime zest on the second request', () => {
    render(<HomeViewBoard autoVoice={false} />)
    fireEvent.click(talk())
    advance(5800 + 1200 + 520 + 10 * 450 + 300)
    fireEvent.click(talk())
    advance(1500)
    expect(screen.getByText('“What can I use instead of kencur?”')).toBeInTheDocument()
    advance(4300 + 1200 + 520 + 800)
    const ingr = screen.getByRole('dialog', { name: 'Ingredients' })
    expect(within(ingr).getByText('Ginger + lime zest')).toHaveClass('hm-mark')
    expect(within(ingr).queryByText('Kencur')).not.toBeInTheDocument()
  })

  it('with the clay look, has no clay until voice starts, keeps one clay through it, and lets it go after', () => {
    render(<HomeViewBoard clay autoVoice={false} />)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
    fireEvent.click(talk())
    const clay = document.querySelector('.voice-clay')
    expect(clay).toBeInTheDocument()
    expect(clay).toHaveAttribute('aria-hidden', 'true')
    advance(5800 + 1000)
    expect(document.querySelector('.voice-clay')).toBe(clay)
    // After "Done" the same clay hops onto each changed amount, then fades where it is and is removed.
    advance(200 + 520 + 10 * 450 + 300)
    expect(document.querySelector('.voice-clay')).toBe(clay)
    advance(100)
    advance(800)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
  })

  it('after "Done", opens the ingredients and the clay hops onto each amount, rewriting it as it lands', () => {
    render(<HomeViewBoard clay autoVoice={false} />)
    fireEvent.click(talk())
    advance(5800 + 1200)
    const ingr = screen.getByRole('dialog', { name: 'Ingredients' })
    expect(amountOf(ingr, 'Pork')).toHaveTextContent('500 g')
    advance(520)
    expect(document.querySelector('.hm-ingr li.is-hop')).toHaveTextContent('Pork')
    advance(250)
    expect(amountOf(ingr, 'Pork')).toHaveTextContent('250 g')
    expect(amountOf(ingr, 'Coconut')).toHaveTextContent('80 g')
    advance(450)
    expect(document.querySelector('.hm-ingr li.is-hop')).toHaveTextContent('Coconut')
    expect(amountOf(ingr, 'Coconut')).toHaveTextContent('40 g')
    // Lime stays 1, so the clay skips it; the change lands in the version history at the end.
    advance(10 * 450)
    expect(document.querySelector('.hm-ingr li.is-hop')).not.toBeInTheDocument()
    expect(amountOf(ingr, 'Rice')).toHaveTextContent('1 cup')
    expect(screen.getByRole('button', { name: 'Version history, version 4' })).toHaveClass('is-changed')
  })

  it('with the clay look, tapping away cancels: the clay leaves at once with no done step', () => {
    render(<HomeViewBoard clay autoVoice={false} />)
    fireEvent.click(talk())
    advance(2000)
    fireEvent.pointerDown(screen.getByRole('heading', { name: 'Lelawar Bali' }))
    expect(glow()).toHaveAttribute('data-state', 'idle')
    expect(island()).toHaveAttribute('data-state', 'idle')
    advance(320)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
    expect(tag(/Serves 4/)).toBeInTheDocument()
  })

  it('with the clay look and no speech, gives up after about 6 s', () => {
    render(<HomeViewBoard clay noSpeech autoVoice={false} />)
    fireEvent.click(talk())
    advance(5900)
    expect(island()).toHaveAttribute('data-state', 'listening')
    advance(200)
    expect(island()).toHaveAttribute('data-state', 'idle')
    advance(320)
    expect(document.querySelector('.voice-clay')).not.toBeInTheDocument()
  })
})
