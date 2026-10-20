'use client'

import { BowlFood, Drop, Grains, Jar, JarLabel, Leaf, Orange, OrangeSlice, Pepper, PiggyBank, Plant, TreePalm, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ExploreBoard } from '@/boards/Explore'
import { COOKING_STEP_COUNT, CookingStepBoard } from '@/boards/CookingStep'
import { HomeViewBoard } from '@/boards/HomeView'
import { GrandmaPage } from '@/grandma/GrandmaPage'
import { FridgeScreen } from './FridgeScreen'
import { GrandmaReply } from './GrandmaReply'

type Perspective = 'grandma' | 'grandkids' | 'explore'

type Instruction = {
  step: number
  tool?: 'Blender' | 'Dry pan' | 'Sauté pan'
  // The cooking verb is shown as the chip, so the sentence continues without repeating it.
  verb?: string
  text: string
  ingredients: string[]
}

const INSTRUCTIONS: Instruction[] = [
  { step: 1, tool: 'Blender', verb: 'Blend', text: 'half the onions, garlic, sambal, kencur, pepper, and lime leaves into a fine paste.', ingredients: ['Onion', 'Garlic', 'Sambal', 'Pepper', 'Lime leaves'] },
  { step: 2, tool: 'Dry pan', verb: 'Toast', text: 'the coconut flour in a dry pan until golden brown.', ingredients: ['Coconut flour'] },
  { step: 3, tool: 'Sauté pan', verb: 'Sauté', text: 'the remaining onions, garlic, and the spice paste in a little oil until fragrant. Add the ground pork and roasted coconut, cooking thoroughly until the meat is done. Stir in lime juice and fresh chives.', ingredients: ['Onion', 'Garlic', 'Spice paste', 'Oil', 'Pork', 'Coconut', 'Lime', 'Chives'] },
  { step: 4, text: 'Serve over white pandan rice.', ingredients: ['Pandan rice'] },
]

function ToolIcon({ tool }: { tool: NonNullable<Instruction['tool']> }) {
  if (tool === 'Blender') return <path d="M16.13 15.13 18 3h-4V2h-4v1H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2.23l.64 4.13A4.96 4.96 0 0 0 6 19v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4.96 4.96 0 0 0-1.87-3.87ZM5 9V5h1.31l.62 4Zm10.67-4-1.38 9H9.72L8.33 5ZM16 20H8v-1a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3Zm-4-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
  if (tool === 'Dry pan') return <><path d="M3 12h14a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M17 13h4v2h-5M7 9c-1-1-1-2 0-3m4 3c-1-1-1-2 0-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>
  return <><path d="M3 12h14a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm14 1h4v2h-5" /><path d="m8 4 6 6m-4-7 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>
}

const INGREDIENT_DETAILS: Record<string, { Icon: PhosphorIcon; amount: string }> = {
  Onion: { Icon: Orange, amount: '3 shallots' },
  Garlic: { Icon: Plant, amount: '2 cloves' },
  Sambal: { Icon: Jar, amount: '1 tbsp' },
  Pepper: { Icon: Pepper, amount: '½ tsp' },
  'Lime leaves': { Icon: Leaf, amount: '4' },
  'Coconut flour': { Icon: TreePalm, amount: '80 g' },
  Coconut: { Icon: TreePalm, amount: '80 g' },
  'Spice paste': { Icon: JarLabel, amount: 'all of it' },
  Oil: { Icon: Drop, amount: 'a little' },
  Pork: { Icon: PiggyBank, amount: '500 g' },
  Lime: { Icon: OrangeSlice, amount: '1' },
  Chives: { Icon: Grains, amount: '1 bunch' },
  'Pandan rice': { Icon: BowlFood, amount: '2 cups' },
}

// Grandma talks on every slide as soon as it arrives. Step two also holds the pause for "do you remember when I cut my finger?".
const GRANDMA_LINES: Record<number, readonly { text: string; at: number }[]> = {
  1: [{ text: 'Blend the aromatics first, little one. Don’t make it watery; you should still see a little texture.', at: 800 }],
  2: [
    { text: 'Keep the coconut moving. It burns very quickly, so trust the color more than the clock.', at: 800 },
    { text: 'No, you didn’t!', at: 11_000 },
    { text: 'No, you didn’t! You were just so eager to cut the onions. Grandma said, “Slow down, little one. The knife has more patience than you do.”', at: 14_000 },
  ],
  3: [{ text: 'Listen to the pan. When the sound turns sharp and the oil begins to separate, the spices are cooked.', at: 800 }],
  4: [{ text: 'Serve it while it is still warm. Put everything in the middle of the table and let everyone take what they want.', at: 800 }],
}

function InstructionCard({ instruction, live = false }: { instruction: Instruction; live?: boolean }) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false)

  return (
    <section className="instruction-screen" aria-label={`Recipe instruction step ${instruction.step}`}>
      <article className="instruction-card">
        <p className="instruction-card__label">Step {instruction.step}</p>
        <div className={`instruction-card__copy${instruction.step === 3 ? ' is-long' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="instruction-card__mascot-row">
            <img className="instruction-card__mascot" src="/assets/mascot-gradient.png" alt="Moldable mascot" />
            {live && <GrandmaReply lines={GRANDMA_LINES[instruction.step]} />}
          </div>
          <p>
            {instruction.tool && <><span className="instruction-chip" data-tool={instruction.tool}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                <ToolIcon tool={instruction.tool} />
              </svg>
              {instruction.verb ?? instruction.tool}
            </span>{' '}</>}
            <span>{instruction.text}</span>
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="instruction-card__art" src={`/assets/steps/step-${instruction.step}.svg`} alt="" draggable={false} />
        <div className="instruction-ingredients" role="group" aria-label={`Ingredients used in step ${instruction.step}`} data-open={ingredientsOpen}>
          <button type="button" className="instruction-ingredients__toggle" aria-label={ingredientsOpen ? 'Hide step ingredients' : 'Show step ingredients'} aria-expanded={ingredientsOpen} onClick={() => setIngredientsOpen((open) => !open)}>
            <Grains size={24} weight="regular" aria-hidden="true" />
          </button>
          <div className="instruction-ingredients__items">
            {instruction.ingredients.map((ingredient) => {
              const detail = INGREDIENT_DETAILS[ingredient]
              const DetailIcon = detail?.Icon ?? Leaf
              return (
                <span key={ingredient} className="instruction-ingredient" role="img" aria-label={ingredient} aria-hidden={!ingredientsOpen} tabIndex={ingredientsOpen ? 0 : -1}>
                  <DetailIcon size={26} weight="regular" aria-hidden="true" />
                  <small>{ingredient}{detail ? <> · {detail.amount}</> : null}</small>
                </span>
              )
            })}
          </div>
        </div>
      </article>
    </section>
  )
}

type KitchenControls = { showGrandkids: () => void; showRecipe: () => void }

// `grandmaScreen` can be a render function so the grandma display can hand off to the Grandkids view.
export function KitchenMockup({ grandmaScreen = <GrandmaPage />, fridge = false }: { grandmaScreen?: ReactNode | ((controls: KitchenControls) => ReactNode); fridge?: boolean } = {}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<number | null>(null)
  const perspectiveRef = useRef<Perspective>('grandma')
  const [perspective, setPerspectiveState] = useState<Perspective>('grandma')
  const [instructionStep, setInstructionStep] = useState<number | null>(null)
  // With `fridge`, Grandkids starts on a fridge door; tapping Popo's recipe card opens the recipe.
  const [isFridgeOpen, setIsFridgeOpen] = useState(false)
  const [isFridgeLeaving, setIsFridgeLeaving] = useState(false)
  const showFridge = fridge && !isFridgeOpen
  // Opening the recipe turns the fridge over like a page, with the recipe already underneath.
  const openFridge = () => {
    setIsFridgeOpen(true)
    setIsFridgeLeaving(true)
    window.setTimeout(() => setIsFridgeLeaving(false), 740)
  }
  const [leavingStep, setLeavingStep] = useState<number | null>(null)
  const [slideBack, setSlideBack] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const goToStep = (next: number | null, back = false) => {
    setSlideBack(back)
    setLeavingStep(instructionStep)
    setInstructionStep(next)
    window.setTimeout(() => setLeavingStep(null), 940)
  }

  const setPerspective = (next: Perspective) => {
    if (next !== 'grandkids') {
      setIsFridgeOpen(false)
      setIsFridgeLeaving(false)
    }
    perspectiveRef.current = next
    setPerspectiveState(next)
  }

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    import('./buildScene')
      .then(({ buildScene }) => {
        if (cancelled || !canvas.current || !screen.current) return
        cleanup = buildScene(canvas.current, screen.current, () => (perspectiveRef.current === 'grandma' ? 'grandma' : 'grandkids'))
        setReady(true)
      })
      .catch((err) => {
        console.error(err)
        setFailed(true)
      })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  const beginSwipe = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, [role="button"]')) return
    swipeStart.current = event.clientX
  }

  const moveSwipe = (event: React.PointerEvent<HTMLElement>) => {
    if (swipeStart.current === null || perspectiveRef.current !== 'grandkids') return
    const distance = event.clientX - swipeStart.current
    if (Math.abs(distance) < 8) return
    const scale = (screen.current?.getBoundingClientRect().width ?? 640) / 640 || 1
    setDragX(distance / scale)
  }

  const endSwipe = (event: React.PointerEvent<HTMLElement>) => {
    if (swipeStart.current === null) return
    const distance = event.clientX - swipeStart.current
    swipeStart.current = null
    setDragX(0)
    if (perspective === 'grandkids' && instructionStep !== null) {
      if (distance > 56) goToStep(instructionStep > 1 ? instructionStep - 1 : null, true)
      if (distance < -56 && instructionStep < COOKING_STEP_COUNT) goToStep(instructionStep + 1)
      return
    }
    if (perspective === 'grandkids' && distance < -56 && !showFridge) {
      goToStep(1)
      return
    }
    if (distance < -56) setPerspective('grandkids')
    if (distance > 56) setPerspective('grandma')
  }

  return (
    <div
      className="kitchen"
      data-testid="kitchen-perspective-stage"
      data-perspective={perspective}
      onPointerDown={beginSwipe}
      onPointerMove={moveSwipe}
      onPointerUp={endSwipe}
      onPointerCancel={() => { swipeStart.current = null; setDragX(0) }}
    >
      <canvas ref={canvas} className="kitchen__gl" aria-hidden="true" />
      <div className="kitchen__css">
        <div ref={screen} className="kitchen__screen">
          <div data-testid="kitchen-grandma" className={`kitchen__host kitchen__host--grandma${perspective === 'grandma' ? '' : ' is-off'}`} aria-hidden={perspective !== 'grandma'} inert={perspective !== 'grandma'}>
            {typeof grandmaScreen === 'function' ? grandmaScreen({ showGrandkids: () => setPerspective('grandkids'), showRecipe: () => { setPerspective('grandkids'); setIsFridgeOpen(true) } }) : grandmaScreen}
          </div>
          <div data-testid="kitchen-grandkids" className={`kitchen__host kitchen__host--grandkids${perspective === 'grandkids' ? '' : ' is-off'}${dragX ? ' is-dragging' : ''}`} style={dragX ? { transform: `translateX(${dragX}px)` } : undefined} aria-hidden={perspective !== 'grandkids'} inert={perspective !== 'grandkids'}>
            <div className={`kitchen__grandkids-view${instructionStep === null ? '' : ' is-off'}${fridge ? ' kitchen__grandkids-view--fridge' : ''}`} inert={instructionStep !== null}>
              {(!fridge || isFridgeOpen) && <HomeViewBoard clay={fridge} />}
              {fridge && (!isFridgeOpen || isFridgeLeaving) && (
                <div className={`kitchen__fridge-layer${isFridgeLeaving ? ' is-leaving' : ''}`}>
                  <FridgeScreen onOpen={openFridge} />
                </div>
              )}
            </div>
            {leavingStep !== null && (
              <div className={`kitchen__grandkids-view kitchen__grandkids-view--out${slideBack ? ' is-back' : ''}`} key={`out-${leavingStep}`} aria-hidden="true">
                <CookingStepBoard embedded clay={fridge} step={leavingStep - 1} />
              </div>
            )}
            {instructionStep !== null && (
              <div className={`kitchen__grandkids-view kitchen__grandkids-view--in${slideBack ? ' is-back' : ''}`} key={instructionStep}>
                <CookingStepBoard embedded clay={fridge} step={instructionStep - 1} onStepTap={() => instructionStep < COOKING_STEP_COUNT && goToStep(instructionStep + 1)} />
              </div>
            )}
            {instructionStep !== null && (
              <button type="button" className="kitchen__edge-prev" aria-label="Previous" onClick={() => goToStep(instructionStep > 1 ? instructionStep - 1 : null, true)} />
            )}
            {instructionStep === null ? (
              !showFridge && <button type="button" className="kitchen__edge-next" aria-label="Open step 1" onClick={() => goToStep(1)} />
            ) : instructionStep < COOKING_STEP_COUNT && (
              <button type="button" className="kitchen__edge-next kitchen__edge-next--wide" aria-label="Next instruction" onClick={() => goToStep((instructionStep ?? 0) + 1)} />
            )}
          </div>
          <div data-testid="kitchen-explore" className={`kitchen__host kitchen__host--explore${perspective === 'explore' ? '' : ' is-off'}`} aria-hidden={perspective !== 'explore'} inert={perspective !== 'explore'}>
            <ExploreBoard onOpenRecipe={() => { setInstructionStep(null); setLeavingStep(null); setPerspective('grandkids') }} />
          </div>
          <div className="kitchen__glare" aria-hidden="true" />
        </div>
      </div>

      <div className="kitchen__dock">
        <div className="kitchen__bar" role="toolbar" aria-label="Choose a point of view">
          <button type="button" aria-pressed={perspective === 'grandma'} onClick={() => setPerspective('grandma')}>Grandma</button>
          <span aria-hidden="true" />
          <button type="button" aria-pressed={perspective === 'grandkids'} onClick={() => setPerspective('grandkids')}>Grandkids</button>
          <span aria-hidden="true" />
          <button type="button" aria-pressed={perspective === 'explore'} onClick={() => setPerspective('explore')}>Explore</button>
        </div>
      </div>

      <div className={`kitchen__loading${ready ? ' is-gone' : ''}`}>
        <p>{failed ? 'The table could not be set. Reload the page to try again.' : 'Setting the table…'}</p>
      </div>
    </div>
  )
}
