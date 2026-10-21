'use client'

import { useEffect } from 'react'
import { play, type Haptic } from './haptics'

/* Every button press plays the haptic for what it does, on the way down (with the visual press), not on release.
   Keyboard presses play too. Disabled buttons and anything inside data-haptics="off" stay quiet, and any element can
   choose its own with data-haptics="open" (or tap, nav, close, on, off, confirm, paper, wake). */

const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], summary, label:has(input[type="checkbox"], input[type="radio"])'
const KINDS: readonly Haptic[] = ['tap', 'nav', 'open', 'close', 'on', 'off', 'confirm', 'paper', 'wake']

// The screen's main actions, its dark pills.
const CONFIRM = '.hm-go, .cs-done'
// Finishing with something: Done in a card, the frosted backdrop, Back.
const CLOSE = '.hm-done, .cs-pop__done, .hm-frost, .cs-pop__backdrop'
const CLOSE_LABEL = /^(close|back|hide|done)\b/i
const WAKE = '.hv-talk'
const PAPER = '.fz-note'
// Moving around: steps, cookbooks, pages.
const NAV = 'a[href], .cs-bar, .cs-jump, nav button, [aria-current]'

export function hapticFor(el: HTMLElement): Haptic | null {
  const chosen = el.closest<HTMLElement>('[data-haptics]')?.dataset.haptics
  if (chosen === 'off') return null
  if (chosen && (KINDS as readonly string[]).includes(chosen)) return chosen as Haptic
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null
  if (el.matches(WAKE)) return 'wake'
  if (el.matches(CONFIRM)) return 'confirm'
  const label = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? ''
  if (el.matches(CLOSE) || CLOSE_LABEL.test(label)) return 'close'
  if (el.hasAttribute('aria-haspopup') || el.getAttribute('aria-expanded') === 'false') return 'open'
  const pressed = el.getAttribute('aria-pressed')
  if (pressed !== null) {
    // In a switch, picking the other option turns it on; pressing the one already on does nothing much.
    if (el.closest('.goo-seg, .kitchen__bar, [role="radiogroup"]')) return pressed === 'true' ? 'tap' : 'on'
    return pressed === 'true' ? 'off' : 'on'
  }
  if (el.matches(PAPER)) return 'paper'
  if (el.matches(NAV)) return 'nav'
  return 'tap'
}

function pressed(event: Event) {
  return (event.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null
}

export function HapticClicks() {
  useEffect(() => {
    const fire = (el: HTMLElement | null) => {
      const kind = el && hapticFor(el)
      if (kind) play(kind)
    }
    const onDown = (event: PointerEvent) => { if (event.button === 0) fire(pressed(event)) }
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
      fire(pressed(event))
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
