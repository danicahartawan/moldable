'use client'

import { type MutableRefObject, type ReactNode, useEffect, useRef, useState } from 'react'
import { CookingStepBoard } from '@/boards/CookingStep'
import { HomeViewBoard, type HomeViewHandle } from '@/boards/HomeView'
import { GrandmaPage } from '@/grandma/GrandmaPage'
import { FridgeScreen } from './FridgeScreen'
import { AmbienceToggle } from '@/ambience/AmbienceToggle'

type Perspective = 'grandma' | 'grandkids'

type KitchenControls = { showGrandkids: () => void; showRecipe: () => void; prepareRipple: () => void }

/** What a voice host can do to the Grandkids side: reach the recipe screen's island and move through the cooking steps. */
export type KitchenVoiceBridge = {
  home: () => HomeViewHandle | null
  /** The cooking step on screen (1-based), or null on the recipe. */
  stepNow: () => number | null
  startCooking: () => void
  goToStep: (step: number) => void
  leaveSteps: () => void
}

// `grandmaScreen` can be a render function so the grandma display can hand off to the Grandkids view.
export function KitchenMockup({ grandmaScreen = <GrandmaPage />, fridge = false, voiceBridge, startOnRecipe = false }: { grandmaScreen?: ReactNode | ((controls: KitchenControls) => ReactNode); fridge?: boolean; voiceBridge?: MutableRefObject<KitchenVoiceBridge | null>; startOnRecipe?: boolean } = {}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<number | null>(null)
  const perspectiveRef = useRef<Perspective>(startOnRecipe ? 'grandkids' : 'grandma')
  const [perspective, setPerspectiveState] = useState<Perspective>(startOnRecipe ? 'grandkids' : 'grandma')
  const [instructionStep, setInstructionStep] = useState<number | null>(null)
  // With `fridge`, Grandkids starts on the fridge cookbooks; tapping Lawar Bali dives into the recipe.
  // The grandma screen can hand over straight to the recipe: the fridge is rebuilt already open on it.
  const [recipeHandover, setRecipeHandover] = useState(startOnRecipe ? 1 : 0)
  // Done at the end of cooking closes the recipe back onto the fridge door.
  const [fridgeClose, setFridgeClose] = useState(0)
  const [leavingStep, setLeavingStep] = useState<number | null>(null)
  // Tidy hands over with a ripple dissolve instead of the sideways slide.
  const [isRippleSwap, setIsRippleSwap] = useState(false)
  // The swipe moves the Grandkids host straight through its style, so a drag doesn't re-render the kitchen on every move.
  const host = useRef<HTMLDivElement>(null)
  const grandmaHost = useRef<HTMLDivElement>(null)
  const dragEl = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const goToStep = (next: number | null) => {
    setLeavingStep(instructionStep)
    setInstructionStep(next)
    window.setTimeout(() => setLeavingStep(null), 940)
  }

  const homeRef = useRef<HomeViewHandle>(null)
  const stepRef = useRef<number | null>(null)
  stepRef.current = instructionStep
  useEffect(() => {
    if (!voiceBridge) return
    voiceBridge.current = {
      home: () => homeRef.current,
      stepNow: () => stepRef.current,
      startCooking: () => goToStep(stepRef.current ?? 1),
      goToStep: (step) => goToStep(Math.min(8, Math.max(1, step))),
      leaveSteps: () => goToStep(null),
    }
    return () => { voiceBridge.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceBridge])

  const setPerspective = (next: Perspective) => {
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
    if (swipeStart.current === null) return
    const onGrandma = perspectiveRef.current === 'grandma'
    const distance = event.clientX - swipeStart.current
    if (Math.abs(distance) < 8) return
    const scale = (screen.current?.getBoundingClientRect().width ?? 640) / 640 || 1
    const el = onGrandma ? grandmaHost.current : host.current
    if (!el) return
    if (!draggingRef.current) {
      draggingRef.current = true
      dragEl.current = el
      el.classList.add('is-dragging')
      if (!onGrandma) setDragging(true)
    }
    // Grandma slides away to the left toward Grandkids, whichever way the swipe goes.
    el.style.transform = `translateX(${(onGrandma ? -Math.abs(distance) : distance) / scale}px)`
  }

  // Class and transform go together, so the host glides back with its transition on.
  const clearDrag = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    dragEl.current?.classList.remove('is-dragging')
    if (dragEl.current) dragEl.current.style.transform = ''
    dragEl.current = null
    setDragging(false)
  }

  const endSwipe = (event: React.PointerEvent<HTMLElement>) => {
    if (swipeStart.current === null) return
    const distance = event.clientX - swipeStart.current
    swipeStart.current = null
    clearDrag()
    if (perspective === 'grandkids' && instructionStep !== null) {
      // The step screen moves between steps itself (up and down); a swipe to the right goes back to the recipe.
      if (distance > 56) goToStep(null)
      return
    }
    if (perspective === 'grandkids' && distance < -56 && !fridge) {
      goToStep(1)
      return
    }
    if (perspective === 'grandma') {
      if (Math.abs(distance) > 56) setPerspective('grandkids')
      return
    }
    if (distance > 56) setPerspective('grandma')
  }

  return (
    <div
      className="kitchen"
      data-testid="kitchen-perspective-stage"
      data-perspective={perspective}
      data-transition={isRippleSwap ? 'ripple' : 'slow-slide'}
      onPointerDown={beginSwipe}
      onPointerMove={moveSwipe}
      onPointerUp={endSwipe}
      onPointerCancel={() => { swipeStart.current = null; clearDrag() }}
    >
      <canvas ref={canvas} className="kitchen__gl" aria-hidden="true" />
      <div className="kitchen__css">
        <div ref={screen} className="kitchen__screen">
          <div ref={grandmaHost} data-testid="kitchen-grandma" className={`kitchen__host kitchen__host--grandma${perspective === 'grandma' ? '' : ' is-off'}`} aria-hidden={perspective !== 'grandma'} inert={perspective !== 'grandma'}>
            {typeof grandmaScreen === 'function' ? grandmaScreen({ showGrandkids: () => setPerspective('grandkids'), showRecipe: () => { setIsRippleSwap(true); window.setTimeout(() => setIsRippleSwap(false), 2400); setPerspective('grandkids'); setRecipeHandover((n) => n + 1) }, prepareRipple: () => setIsRippleSwap(true) }) : grandmaScreen}
          </div>
          <div ref={host} data-testid="kitchen-grandkids" className={`kitchen__host kitchen__host--grandkids${perspective === 'grandkids' ? '' : ' is-off'}${dragging ? ' is-dragging' : ''}`} aria-hidden={perspective !== 'grandkids'} inert={perspective !== 'grandkids'}>
            <div className={`kitchen__grandkids-view${instructionStep === null ? '' : ' is-off'}`} inert={instructionStep !== null}>
              {fridge ? (
                <FridgeScreen homeRef={homeRef} key={recipeHandover} startOpen={recipeHandover > 0} active={perspective === 'grandkids'} closeRequest={fridgeClose}
                  onStartCooking={() => goToStep(1)} onRecord={() => setPerspective('grandma')} />
              ) : (
                <HomeViewBoard ref={homeRef} onStartCooking={() => goToStep(1)} />
              )}
            </div>
            {leavingStep !== null && (
              <div className="kitchen__grandkids-view kitchen__grandkids-view--out" key={`out-${leavingStep}`} aria-hidden="true">
                <CookingStepBoard embedded step={leavingStep - 1} enter={false} />
              </div>
            )}
            {instructionStep !== null && (
              <div className="kitchen__grandkids-view kitchen__grandkids-view--in" key="steps">
                <CookingStepBoard embedded step={instructionStep - 1} onStepChange={(n) => setInstructionStep(n + 1)}
                  onDone={() => { goToStep(null); if (fridge) setFridgeClose((n) => n + 1) }} />
              </div>
            )}
            {instructionStep === null && !fridge && (
              <button type="button" className="kitchen__edge-next" aria-label="Open step 1" onClick={() => goToStep(1)} />
            )}
          </div>
          <div className="kitchen__glare" aria-hidden="true" />
        </div>
      </div>

      <div className="kitchen__dock">
        <div className="kitchen__dock-row">
          <div className="kitchen__bar" role="toolbar" aria-label="Choose a point of view">
            <button type="button" aria-pressed={perspective === 'grandma'} onClick={() => setPerspective('grandma')}>Grandma</button>
            <span aria-hidden="true" />
            <button type="button" aria-pressed={perspective === 'grandkids'} onClick={() => setPerspective('grandkids')}>Grandkids</button>
          </div>
          {/* Optional rain and soft jazz in the background, as if you're in the kitchen. */}
          <div className="kitchen__pill"><AmbienceToggle /></div>
        </div>
      </div>

      <div className={`kitchen__loading${ready ? ' is-gone' : ''}`}>
        {failed ? <p>The table could not be set. Reload the page to try again.</p> : null}
      </div>
    </div>
  )
}
