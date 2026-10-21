/* Tiny damped springs for the goo pieces, stepped by requestAnimationFrame (no spring library in the project). */

export type Spring = { x: number; v: number; to: number; k: number; c: number }
export type Params = { k: number; c: number }

export const spring = (x: number, p: Params = { k: 380, c: 32 }): Spring => ({ x, v: 0, to: x, k: p.k, c: p.c })
export const aim = (s: Spring, to: number, p: Params) => { s.to = to; s.k = p.k; s.c = p.c }
export const snap = (s: Spring, x: number) => { s.x = x; s.v = 0; s.to = x }
export const settled = (s: Spring) => Math.abs(s.x - s.to) < 0.25 && Math.abs(s.v) < 4

/** Advances the springs by `dt` seconds, in small fixed steps so the stiffer ones stay stable. */
export function stepSprings(all: Spring[], dt: number) {
  for (let t = 0; t < dt; t += 1 / 240) {
    const h = Math.min(1 / 240, dt - t)
    for (const s of all) {
      const a = -s.k * (s.x - s.to) - s.c * s.v
      s.v += a * h
      s.x += s.v * h
    }
  }
}

export const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
