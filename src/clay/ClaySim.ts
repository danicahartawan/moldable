// Soft clay as a small spring system: a head and a tail, an outline of 12 points, and a squash spring.
// The head leads and the tail lags, so a stretch comes from one end pulling and the other catching up.
// The outline keeps its area (thinner as it gets longer), necks in the middle, and keeps the leading end fatter.
// Pure maths, no DOM: ClayBody draws it.

export type Vec = { x: number; y: number }
export type Spring = { k: number; c: number }

export type ClayTuning = {
  /** The leading end. */
  head: Spring
  /** The trailing end: softer, so it lags a beat behind. */
  tail: Spring
  /** Both ends when letting go: stiffer, so snapping back is quicker than stretching. */
  snap: Spring
  /** Each outline point following the body's shape. */
  point: Spring
  /** Contact squash: flatten on the contact side, bulge sideways, then recover. */
  squash: Spring
  /** How much each outline point is pulled along by its neighbours (0–1). */
  coupling: number
  /** Area kept while stretching: width = R · (R / length)^volume. 1 keeps it exactly; a little less feels softer. */
  volume: number
  /** How much the middle thins while pulled. */
  neck: number
  /** How much fatter the leading end stays while pulled. */
  lead: number
  /** Surface ripple, in px, while moving or hearing voice. */
  wobble: number
  /** How far it stretches before the back is dragged along, in body radii. */
  maxStretch: number
}

export const DEFAULT_TUNING: ClayTuning = {
  head: { k: 210, c: 15 },
  tail: { k: 150, c: 17 },
  snap: { k: 260, c: 14 },
  point: { k: 340, c: 21 },
  squash: { k: 240, c: 11 },
  coupling: 0.35,
  volume: 0.9,
  neck: 0.17,
  lead: 0.13,
  wobble: 1.4,
  maxStretch: 1.8,
}

export const OUTLINE_POINTS = 12

type Particle = { x: number; y: number; vx: number; vy: number }
type Task = { at: number; run: () => void }

const DOWN: Vec = { x: 0, y: 1 }
const len = (x: number, y: number) => Math.hypot(x, y)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Smooth 1D value noise for the surface ripple.
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
const noise = (t: number) => {
  const i = Math.floor(t)
  const u = (1 - Math.cos((t - i) * Math.PI)) / 2
  return hash(i) * (1 - u) + hash(i + 1) * u
}

function springStep(p: Particle, target: Vec, s: Spring, dt: number) {
  p.vx += (-s.k * (p.x - target.x) - s.c * p.vx) * dt
  p.vy += (-s.k * (p.y - target.y) - s.c * p.vy) * dt
  p.x += p.vx * dt
  p.y += p.vy * dt
}

export class ClaySim {
  readonly radius: number
  tuning: ClayTuning
  reduced: boolean

  home: Vec
  private head: Particle
  private tail: Particle
  private headT: Vec
  private tailT: Vec
  private axis: Vec = { x: 1, y: 0 }
  private snapping = false
  private scripted = false
  private manual: { dir: Vec; amount: number } | null = null
  private landing: { to: Vec; normal: Vec; strength: number } | null = null

  private q = 0
  private qv = 0
  private qT = 0
  private qn: Vec = DOWN
  // Free-air jiggle along the stretch axis: as the ends spring back together, their speed squashes the body the other way.
  private j = 0
  private jv = 0
  private lastD = 0
  private jiggled = false

  private level: (() => number) | null = null
  private levelSmooth = 0
  private voiceDir: Vec = { x: 1, y: 0 }
  knead = false

  private pts: Particle[]
  private targets: Vec[]
  private t = 0
  private tasks: Task[] = []
  private quiet = 0

  constructor(home: Vec, radius: number, opts: { tuning?: Partial<ClayTuning>; reduced?: boolean } = {}) {
    this.radius = radius
    this.tuning = { ...DEFAULT_TUNING, ...opts.tuning }
    this.reduced = opts.reduced ?? false
    this.home = { ...home }
    this.head = { ...home, vx: 0, vy: 0 }
    this.tail = { ...home, vx: 0, vy: 0 }
    this.headT = { ...home }
    this.tailT = { ...home }
    this.targets = this.shape(0)
    this.pts = this.targets.map((p) => ({ ...p, vx: 0, vy: 0 }))
  }

  // ——— Commands ———

  /** Put it somewhere instantly, at rest. */
  place(p: Vec) {
    this.home = { ...p }
    Object.assign(this.head, { ...p, vx: 0, vy: 0 })
    Object.assign(this.tail, { ...p, vx: 0, vy: 0 })
    this.headT = { ...p }
    this.tailT = { ...p }
    this.tasks = []
    this.scripted = false
    this.landing = null
    this.targets = this.shape(0)
    this.pts.forEach((pt, i) => Object.assign(pt, { ...this.targets[i], vx: 0, vy: 0 }))
  }

  /** Voice loudness (0–1), read every step. It's smoothed, small changes are ignored, and it pulls the clay longer. */
  setLevel(level: (() => number) | null, direction: Vec = { x: 1, y: 0 }) {
    this.level = level
    this.voiceDir = norm(direction)
  }

  /** Pull the clay in a direction; `amount` is in body radii. The front moves first, the back follows. */
  stretch(direction: Vec, amount = 1) {
    this.manual = { dir: norm(direction), amount }
    this.snapping = false
  }

  /** Let go: both ends spring back home, quicker than the stretch, with a soft jiggle. */
  release() {
    this.manual = null
    this.snapping = true
    this.jiggled = false
  }

  /** Something touched it: it flattens on that side, bulges sideways, then recovers. `normal` points from the clay to the surface. */
  touch(normal: Vec = DOWN, strength = 1) {
    if (this.reduced) return
    this.qn = norm(normal)
    this.qv += 3.4 * strength
  }

  /** Squash down, leap in an arc, and land with a squash. */
  jump(to: Vec, landingNormal: Vec = DOWN) {
    const from = { ...this.home }
    this.home = { ...to }
    if (this.reduced) {
      this.headT = { ...to }
      this.tailT = { ...to }
      return
    }
    this.manual = null
    this.scripted = true
    this.snapping = false
    const dist = len(to.x - from.x, to.y - from.y)
    // A flatter arc for longer leaps, so it never sails far off the screen.
    const apex = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - clamp(dist * 0.2, this.radius, this.radius * 4) }
    // Anticipation: squash down ~9% first.
    this.qn = DOWN
    this.qT = 0.09
    this.headT = from
    this.tailT = from
    this.after(140, () => { this.qT = 0; this.qv -= 1.6; this.headT = apex })
    this.after(300, () => { this.headT = { ...to }; this.tailT = apex })
    this.after(380, () => { this.tailT = { ...to }; this.snapping = true })
    this.landing = { to: { ...to }, normal: norm(landingNormal), strength: 1 }
  }

  /** Inch over to a new spot: reach with the front while the back stays put, touch down, then pull the back along. */
  crawl(to: Vec, contactNormal: Vec = DOWN) {
    const from = { ...this.home }
    this.home = { ...to }
    if (this.reduced) {
      this.headT = { ...to }
      this.tailT = { ...to }
      return
    }
    this.manual = null
    this.scripted = true
    this.snapping = false
    this.qn = norm(contactNormal)
    this.qT = 0.06
    this.headT = from
    this.tailT = from
    this.after(100, () => { this.qT = 0; this.headT = { ...to }; this.tailT = from })
    this.landing = { to: { ...to }, normal: norm(contactNormal), strength: 0.45 }
  }

  /** Move home without any of the theatre (springs still carry it). */
  moveTo(p: Vec) {
    this.home = { ...p }
  }

  // ——— Simulation ———

  /** True when nothing is moving and there's no voice, so drawing can be skipped. */
  get settled() {
    return this.quiet > 20
  }

  /** The outline, 12 points clockwise from the leading end. */
  get outline(): readonly Vec[] {
    return this.pts
  }

  /** Middle of the body, for lighting. */
  get center(): Vec {
    return { x: (this.head.x + this.tail.x) / 2, y: (this.head.y + this.tail.y) / 2 }
  }

  /** Current length ÷ width, 1 when round (for tests and debugging). */
  get aspect() {
    const d = len(this.head.x - this.tail.x, this.head.y - this.tail.y)
    const a = this.radius + d / 2
    return a / (this.radius * (this.radius / a) ** this.tuning.volume)
  }

  step(dtSeconds: number) {
    const dt = Math.min(0.05, Math.max(0, dtSeconds))
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    for (let s = 0; s < steps; s++) this.substep(dt / steps)
  }

  private after(ms: number, run: () => void) {
    this.tasks.push({ at: this.t + ms / 1000, run })
  }

  private springs() {
    const crit = (s: Spring): Spring => (this.reduced ? { k: s.k, c: 2 * Math.sqrt(s.k) } : s)
    const T = this.tuning
    // Stretching takes effort: the leading end is a little softer while being pulled.
    const head = this.snapping ? T.snap : this.manual ? { k: T.head.k * 0.7, c: T.head.c } : T.head
    const tail = this.snapping ? T.snap : T.tail
    return { head: crit(head), tail: crit(tail), point: crit(T.point), squash: crit(T.squash) }
  }

  private substep(dt: number) {
    this.t += dt
    if (this.tasks.length) {
      const due = this.tasks.filter((task) => task.at <= this.t)
      this.tasks = this.tasks.filter((task) => task.at > this.t)
      due.forEach((task) => task.run())
    }

    // Voice: smoothed, a small deadband so it ignores murmurs.
    const raw = this.level ? clamp(this.level(), 0, 1) : 0
    this.levelSmooth += (raw - this.levelSmooth) * (1 - Math.exp(-dt / 0.15))
    const voice = this.reduced ? 0 : Math.max(0, (this.levelSmooth - 0.08) / 0.92)

    if (!this.scripted) {
      const R = this.radius
      let hx = this.home.x, hy = this.home.y, tx = this.home.x, ty = this.home.y
      if (this.manual) {
        const { dir, amount } = this.manual
        hx += dir.x * amount * R * 1.1; hy += dir.y * amount * R * 1.1
        tx -= dir.x * amount * R * 0.18; ty -= dir.y * amount * R * 0.18
      } else if (voice > 0) {
        // Loud words pull the front out; the back gives a little.
        hx += this.voiceDir.x * voice * R * 0.95; hy += this.voiceDir.y * voice * R * 0.95
        tx -= this.voiceDir.x * voice * R * 0.2; ty -= this.voiceDir.y * voice * R * 0.2
      }
      if (this.knead && !this.reduced) {
        // Being worked: the front circles, the back answers.
        const w = this.t * Math.PI * 2 * 1.3
        const kx = Math.cos(w) * R * 0.24, ky = Math.sin(w) * R * 0.16
        hx += kx; hy += ky; tx -= kx * 0.5; ty -= ky * 0.5
      }
      this.headT = { x: hx, y: hy }
      this.tailT = { x: tx, y: ty }
    }

    // Clay only stretches so far: past maxStretch radii the back is dragged along behind the front.
    const maxSep = this.radius * this.tuning.maxStretch
    const sx = this.head.x - this.tailT.x, sy = this.head.y - this.tailT.y
    const sl = len(sx, sy)
    if (sl > maxSep) this.tailT = { x: this.head.x - (sx / sl) * maxSep, y: this.head.y - (sy / sl) * maxSep }

    const sp = this.springs()
    springStep(this.head, this.headT, sp.head, dt)
    springStep(this.tail, this.tailT, sp.tail, dt)

    // Contact squash spring.
    this.qv += (-sp.squash.k * (this.q - this.qT) - sp.squash.c * this.qv) * dt
    this.q = clamp(this.q + this.qv * dt, -0.22, 0.3)

    // Snapping back: when the ends close in fast, carry that speed into a squash along the axis, then let it jiggle out.
    const d = len(this.head.x - this.tail.x, this.head.y - this.tail.y)
    const closing = (this.lastD - d) / dt
    if (this.snapping && !this.jiggled && !this.reduced && d < this.radius * 0.35 && closing > 0) {
      this.jv += Math.min(4, closing / this.radius) * 0.9
      this.jiggled = true
    }
    this.lastD = d
    this.jv += (-sp.squash.k * this.j - sp.squash.c * this.jv) * dt
    this.j = clamp(this.j + this.jv * dt, -0.22, 0.3)

    // Landing: when the front arrives, it touches down and the back is pulled in.
    if (this.landing && len(this.head.x - this.landing.to.x, this.head.y - this.landing.to.y) < Math.max(1.5, this.radius * 0.12)) {
      this.touch(this.landing.normal, this.landing.strength)
      this.tailT = { ...this.landing.to }
      this.snapping = true
      this.landing = null
      this.after(160, () => { this.scripted = false })
    }

    // The outline follows the target shape point by point, each linked to its neighbours.
    const activity = (len(this.head.vx, this.head.vy) + len(this.tail.vx, this.tail.vy)) / (this.radius * 6) + voice * 0.8 + Math.abs(this.qv) * 0.25 + (this.knead ? 0.5 : 0)
    this.targets = this.shape(this.reduced ? 0 : this.tuning.wobble * clamp(activity, 0, 1))
    const n = this.pts.length
    const k = sp.point.k, c = sp.point.c, link = this.tuning.coupling
    const dx = this.pts.map((p, i) => p.x - this.targets[i].x)
    const dy = this.pts.map((p, i) => p.y - this.targets[i].y)
    let motion = 0
    this.pts.forEach((p, i) => {
      const prev = (i - 1 + n) % n, next = (i + 1) % n
      const ax = -k * dx[i] - c * p.vx + link * k * ((dx[prev] + dx[next]) / 2 - dx[i])
      const ay = -k * dy[i] - c * p.vy + link * k * ((dy[prev] + dy[next]) / 2 - dy[i])
      p.vx += ax * dt
      p.vy += ay * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      motion += Math.abs(p.vx) + Math.abs(p.vy)
    })

    // Snapping ends once it's home and still.
    const restLen = len(this.head.x - this.tail.x, this.head.y - this.tail.y)
    if (this.snapping && !this.scripted && restLen < 0.5 && motion < 2) this.snapping = false

    const still = motion < 0.5 && Math.abs(this.qv) < 0.01 && Math.abs(this.jv) < 0.01 && Math.abs(this.j) < 0.002 && Math.abs(this.q - this.qT) < 0.002 && raw === 0 && !this.knead && !this.tasks.length && !this.landing
    this.quiet = still ? this.quiet + 1 : 0
  }

  /** The target outline right now: an area-keeping, necked, front-heavy ellipse between head and tail. */
  private shape(wobble: number): Vec[] {
    const R = this.radius
    const T = this.tuning
    const cx = (this.head.x + this.tail.x) / 2
    const cy = (this.head.y + this.tail.y) / 2
    const ddx = this.head.x - this.tail.x
    const ddy = this.head.y - this.tail.y
    const d = Math.min(len(ddx, ddy), R * (this.tuning.maxStretch + 0.2))
    if (d > 0.5) {
      // Turn smoothly toward the current pull; when round, keep the last direction.
      const real = len(ddx, ddy)
      const ux = ddx / real, uy = ddy / real
      const mix = Math.min(1, d / R)
      const ax = this.axis.x + (ux - this.axis.x) * mix
      const ay = this.axis.y + (uy - this.axis.y) * mix
      const al = len(ax, ay) || 1
      this.axis = { x: ax / al, y: ay / al }
    }
    const { x: ux, y: uy } = this.axis
    const px = -uy, py = ux
    const a = R + d / 2
    const pulled = clamp((a - R) / R, 0, 1)
    const neck = T.neck * pulled
    const lead = T.lead * pulled
    // Keeping the area: thinner as it gets longer; the neck takes a little more, so give that back.
    const b = R * (R / a) ** T.volume * (1 + neck * 0.45)

    // Contact squash, anchored on the contact side so it stays touching the surface.
    const q = this.q
    const qn = this.qn
    const reach = len(a * (qn.x * ux + qn.y * uy), b * (qn.x * px + qn.y * py))
    const anchorX = cx + qn.x * reach
    const anchorY = cy + qn.y * reach

    const out: Vec[] = []
    for (let i = 0; i < OUTLINE_POINTS; i++) {
      const th = (i / OUTLINE_POINTS) * Math.PI * 2
      const co = Math.cos(th), si = Math.sin(th)
      const lx = a * co
      const ly = b * si * (1 - neck * Math.exp(-((co / 0.5) ** 2))) * (1 + lead * co)
      let x = cx + ux * lx + px * ly
      let y = cy + uy * lx + py * ly
      if (this.j !== 0) {
        // Centred jiggle: shorter along the axis, wider across it (and the other way on the rebound).
        const rx = x - cx, ry = y - cy
        const along = rx * ux + ry * uy
        const across = rx * px + ry * py
        x = cx + ux * along * (1 - this.j) + px * across * (1 + 0.85 * this.j)
        y = cy + uy * along * (1 - this.j) + py * across * (1 + 0.85 * this.j)
      }
      if (q !== 0) {
        const rx = x - anchorX, ry = y - anchorY
        const along = rx * qn.x + ry * qn.y
        const perX = rx - qn.x * along, perY = ry - qn.y * along
        x = anchorX + qn.x * along * (1 - q) + perX * (1 + 0.85 * q)
        y = anchorY + qn.y * along * (1 - q) + perY * (1 + 0.85 * q)
      }
      if (wobble > 0) {
        const ox = x - cx, oy = y - cy
        const ol = len(ox, oy) || 1
        const r = wobble * (noise(this.t * 0.9 + i * 1.37) * 2 - 1)
        x += (ox / ol) * r
        y += (oy / ol) * r
      }
      out.push({ x, y })
    }
    return out
  }
}

function norm(v: Vec): Vec {
  const l = len(v.x, v.y) || 1
  return { x: v.x / l, y: v.y / l }
}

/** Area of a closed polygon (for tests: the clay should keep its volume). */
export function polygonArea(points: readonly Vec[]) {
  let s = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length]
    s += p.x * q.y - q.x * p.y
  }
  return Math.abs(s) / 2
}
