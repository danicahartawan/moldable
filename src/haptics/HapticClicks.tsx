'use client'

import { useEffect } from 'react'
import { tap } from './haptics'

/* Every button press taps: on the way down (with the visual press), not on release. Keyboard presses tap too.
   Skips disabled buttons, and anything inside data-haptics="off". Dark primary pills get the fuller tap. */

const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], summary, label:has(input[type="checkbox"], input[type="radio"])'
const PRIMARY = '.hm-go, .cs-done, .cs-pop__done, .hm-done--centre'

function target(event: Event) {
  const el = (event.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null
  if (!el || el.closest('[data-haptics="off"]')) return null
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null
  return el
}

export function HapticClicks() {
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const el = target(event)
      if (el) tap(el.matches(PRIMARY) ? 'medium' : 'light')
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
      const el = target(event)
      if (el) tap(el.matches(PRIMARY) ? 'medium' : 'light')
    }
    document.addEventListener('pointerdown', onDown, { capture: true, passive: true })
    document.addEventListener('keydown', onKey, { capture: true })
    return () => {
      document.removeEventListener('pointerdown', onDown, { capture: true })
      document.removeEventListener('keydown', onKey, { capture: true })
    }
  }, [])
  return null
}
