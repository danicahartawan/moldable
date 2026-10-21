import { describe, expect, it } from 'vitest'
import { ClaySim, polygonArea, type Vec } from './ClaySim'

const R = 20
const run = (sim: ClaySim, ms: number) => {
  for (let t = 0; t < ms; t += 1000 / 60) sim.step(1 / 60)
}
// Extent of the outline along a direction, measured from the body's centre.
const extent = (pts: readonly Vec[], c: Vec, dir: Vec) => Math.max(...pts.map((p) => (p.x - c.x) * dir.x + (p.y - c.y) * dir.y))
const width = (pts: readonly Vec[]) => Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))
const length = (pts: readonly Vec[]) => Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x))

describe('ClaySim', () => {
  it('keeps its volume: a stretch makes it thinner, not just longer', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    const restArea = polygonArea(sim.outline)
    const restWidth = width(sim.outline)
    sim.stretch({ x: 1, y: 0 }, 1.2)
    run(sim, 1500)
    expect(length(sim.outline)).toBeGreaterThan(restWidth * 1.5)
    expect(width(sim.outline)).toBeLessThan(restWidth * 0.85)
    // Within ~15% of the resting area (a little loss is the softer feel, and the neck).
    expect(polygonArea(sim.outline) / restArea).toBeGreaterThan(0.85)
    expect(polygonArea(sim.outline) / restArea).toBeLessThan(1.15)
  })

  it('leads with the front: early in a stretch the front has moved much further than the back', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    const c0 = { x: 100, y: 100 }
    const front0 = extent(sim.outline, c0, { x: 1, y: 0 })
    const back0 = extent(sim.outline, c0, { x: -1, y: 0 })
    sim.stretch({ x: 1, y: 0 }, 1)
    run(sim, 100)
    const frontMoved = extent(sim.outline, c0, { x: 1, y: 0 }) - front0
    const backMoved = back0 - extent(sim.outline, c0, { x: -1, y: 0 })
    expect(frontMoved).toBeGreaterThan(3)
    expect(frontMoved).toBeGreaterThan(Math.abs(backMoved) * 2)
  })

  it('snaps back on release, overshoots a little and settles round', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    sim.stretch({ x: 1, y: 0 }, 1.2)
    run(sim, 1200)
    sim.release()
    let minAspect = Infinity
    for (let t = 0; t < 1200; t += 1000 / 60) {
      sim.step(1 / 60)
      minAspect = Math.min(minAspect, length(sim.outline) / width(sim.outline))
    }
    // It passes round (overshoot) on the way back…
    expect(minAspect).toBeLessThan(0.99)
    // …and settles round.
    run(sim, 2500)
    expect(length(sim.outline) / width(sim.outline)).toBeCloseTo(1, 1)
  })

  it('flattens on the contact side and bulges sideways when touched', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    const restWidth = width(sim.outline)
    sim.touch({ x: 0, y: 1 }, 1)
    let minHeight = Infinity
    let maxWidth = 0
    for (let t = 0; t < 300; t += 1000 / 60) {
      sim.step(1 / 60)
      const ys = sim.outline.map((p) => p.y)
      minHeight = Math.min(minHeight, Math.max(...ys) - Math.min(...ys))
      maxWidth = Math.max(maxWidth, length(sim.outline))
    }
    expect(minHeight).toBeLessThan(restWidth * 0.9)
    expect(maxWidth).toBeGreaterThan(restWidth * 1.08)
  })

  it('follows the voice level on a spring, and relaxes when it goes quiet', () => {
    let level = 0
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    sim.setLevel(() => level)
    level = 1
    run(sim, 1200)
    const loud = length(sim.outline) / width(sim.outline)
    expect(loud).toBeGreaterThan(1.5)
    level = 0
    run(sim, 2500)
    expect(length(sim.outline) / width(sim.outline)).toBeCloseTo(1, 1)
  })

  it('lands where it jumped to', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    sim.jump({ x: 200, y: 140 })
    run(sim, 2500)
    expect(sim.center.x).toBeCloseTo(200, 0)
    expect(sim.center.y).toBeCloseTo(140, 0)
    expect(sim.settled).toBe(true)
  })

  it('with reduced motion, never overshoots or ripples', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R, { reduced: true })
    sim.stretch({ x: 1, y: 0 }, 1)
    run(sim, 1500)
    sim.release()
    let minAspect = Infinity
    for (let t = 0; t < 2000; t += 1000 / 60) {
      sim.step(1 / 60)
      minAspect = Math.min(minAspect, length(sim.outline) / width(sim.outline))
    }
    expect(minAspect).toBeGreaterThan(0.985)
  })

  it('pops in from a dot to full size with a little overshoot, then lands with a squash', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    sim.vanish('quick')
    run(sim, 600)
    expect(sim.gone).toBe(true)
    sim.appear()
    let peak = 0
    let squashed = false
    for (let t = 0; t < 700; t += 1000 / 60) {
      sim.step(1 / 60)
      peak = Math.max(peak, length(sim.outline))
      const ys = sim.outline.map((p) => p.y)
      if (Math.max(...ys) - Math.min(...ys) < length(sim.outline) * 0.93) squashed = true
    }
    expect(peak).toBeGreaterThan(R * 2)        // overshoots full size a little…
    expect(peak).toBeLessThan(R * 2 * 1.25)    // …but only a little
    expect(squashed).toBe(true)                // and lands with a squash
    run(sim, 1500)
    expect(length(sim.outline)).toBeCloseTo(R * 2, 0)
  })

  it('shrinks away (soft or quick) and reports when it is gone', () => {
    const soft = new ClaySim({ x: 100, y: 100 }, R)
    soft.vanish('soft')
    run(soft, 100)
    expect(soft.gone).toBe(false)
    run(soft, 900)
    expect(soft.gone).toBe(true)

    const quick = new ClaySim({ x: 100, y: 100 }, R)
    quick.vanish('quick')
    run(quick, 300)
    expect(quick.gone).toBe(true)
  })

  it('reverses mid-exit when it is wanted again, without going back to a dot', () => {
    const sim = new ClaySim({ x: 100, y: 100 }, R)
    sim.vanish('soft')
    run(sim, 220)
    const midway = length(sim.outline)
    expect(midway).toBeLessThan(R * 2)
    expect(midway).toBeGreaterThan(R * 0.3)
    sim.appear()
    let smallest = midway
    for (let t = 0; t < 1200; t += 1000 / 60) {
      sim.step(1 / 60)
      smallest = Math.min(smallest, length(sim.outline))
    }
    expect(smallest).toBeGreaterThan(R * 0.15)
    expect(length(sim.outline)).toBeCloseTo(R * 2, 0)
  })
})
