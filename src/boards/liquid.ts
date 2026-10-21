/* A liquid morph: one shape (the "blob") pours out of a pill into a card and back.
   It stretches past the card, pulls back a little, then settles, with the radius and fill changing on the way. */

export type Rect = { x: number; y: number; w: number; h: number }

/** An element's box inside `root`, in root's own (unscaled) px. */
export function rectIn(el: HTMLElement, root: HTMLElement): Rect {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

type Look = { radius: number; fill: string; shadow: string }

const box = (r: Rect, look: Look) => ({
  left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`,
  borderRadius: `${look.radius}px`, backgroundColor: look.fill, boxShadow: look.shadow,
})

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Whether a pour will play: not under reduced motion, and only where the Web Animations API exists (not in tests). */
export const canPour = () => !reduced() && typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function'

/** Pours the blob from `from` (the pill) into `to` (the card). Returns null where it can't animate (tests, reduced motion). */
export function pourOpen(blob: HTMLElement, from: Rect, to: Rect, pill: Look, card: Look): Animation | null {
  Object.assign(blob.style, box(to, card))
  if (reduced() || typeof blob.animate !== 'function') return null
  // Past the card, then a little short, then home: the overshoot is what reads as liquid.
  const over: Rect = { x: to.x - 6, y: to.y - 10, w: to.w + 12, h: to.h + 18 }
  const under: Rect = { x: to.x + 2, y: to.y + 3, w: to.w - 4, h: to.h - 5 }
  return blob.animate(
    [
      { ...box(from, pill), offset: 0 },
      { ...box({ x: from.x - 4, y: from.y - 22, w: from.w + 8, h: from.h + 26 }, { ...pill, radius: pill.radius + 6 }), offset: 0.16 },
      { ...box(over, { ...card, radius: card.radius + 10 }), offset: 0.58 },
      { ...box(under, { ...card, radius: card.radius - 2 }), offset: 0.8 },
      { ...box(to, card), offset: 1 },
    ],
    { duration: 720, easing: 'cubic-bezier(.3, .7, .4, 1)' },
  )
}

/** Pours the blob back from the card into the pill. */
export function pourClose(blob: HTMLElement, from: Rect, to: Rect, card: Look, pill: Look): Animation | null {
  if (reduced() || typeof blob.animate !== 'function') return null
  return blob.animate(
    [
      { ...box(from, card), offset: 0 },
      { ...box({ x: from.x + 6, y: from.y + 14, w: from.w - 12, h: from.h - 10 }, { ...card, radius: card.radius + 8 }), offset: 0.35 },
      { ...box({ x: to.x - 4, y: to.y - 16, w: to.w + 8, h: to.h + 20 }, { ...pill, radius: pill.radius + 6 }), offset: 0.8 },
      { ...box(to, pill), offset: 1 },
    ],
    { duration: 440, easing: 'cubic-bezier(.5, 0, .3, 1)', delay: 90, fill: 'forwards' },
  )
}
