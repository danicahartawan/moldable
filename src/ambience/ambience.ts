/* Kitchen ambience: rain and soft jazz, quietly, as if you're in the kitchen. Optional and off until switched on.
   One player for the whole app, so it carries on across screens. It fades in low, starts somewhere different each
   time, and loops its 10 minutes by crossfading two copies of the track, so there's never a seam. */

const SRC = '/audio/kitchen-rain-jazz.m4a'
// Background, not music: low, and slow to arrive and leave.
const LEVEL = 0.2
const FADE_IN = 2.5
const FADE_OUT = 1.2
const CROSSFADE = 4
const KEY = 'moldable-ambience'

type Deck = { el: HTMLAudioElement; gain: GainNode }
type Player = { ac: AudioContext; master: GainNode; decks: [Deck, Deck] }

let player: Player | null = null
let current = 0
let on = false
let seeded = false
let watch: number | undefined
let stopTimer: number | undefined
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((fn) => fn())

function build(): Player | null {
  if (player) return player
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  const ac = new Ctor()
  const master = ac.createGain()
  master.gain.value = 0
  master.connect(ac.destination)
  // Volume goes through Web Audio gains, not the element's own volume, which iOS ignores.
  const deck = (): Deck => {
    const el = new Audio(SRC)
    el.preload = 'auto'
    const gain = ac.createGain()
    gain.gain.value = 0
    ac.createMediaElementSource(el).connect(gain).connect(master)
    return { el, gain }
  }
  player = { ac, master, decks: [deck(), deck()] }
  return player
}

const ramp = (g: GainNode, ac: AudioContext, to: number, seconds: number) => {
  const now = ac.currentTime
  g.gain.cancelScheduledValues(now)
  g.gain.setValueAtTime(g.gain.value, now)
  g.gain.linearRampToValueAtTime(to, now + seconds)
}

// Near the end of the playing copy, the other one starts from the top and the two crossfade.
function keepLooping() {
  window.clearInterval(watch)
  watch = window.setInterval(() => {
    const p = player
    if (!p || !on) return
    const a = p.decks[current]
    if (!a.el.duration || a.el.duration - a.el.currentTime > CROSSFADE) return
    const b = p.decks[1 - current]
    b.el.currentTime = 0
    void b.el.play().catch(() => {})
    ramp(b.gain, p.ac, 1, CROSSFADE)
    ramp(a.gain, p.ac, 0, CROSSFADE)
    window.setTimeout(() => a.el.pause(), CROSSFADE * 1000 + 100)
    current = 1 - current
  }, 250)
}

function start() {
  const p = build()
  if (!p) return
  window.clearTimeout(stopTimer)
  void p.ac.resume().catch(() => {})
  const d = p.decks[current]
  const begin = () => {
    // The first time, somewhere new in the 10 minutes (never so close to the end that it crossfades at once);
    // after that it carries on where it was.
    if (!seeded && d.el.duration) { d.el.currentTime = Math.random() * Math.max(0, d.el.duration - 60); seeded = true }
    void d.el.play().catch(() => {})
  }
  if (d.el.readyState >= 1) begin()
  else d.el.addEventListener('loadedmetadata', begin, { once: true })
  ramp(d.gain, p.ac, 1, 0.05)
  ramp(p.master, p.ac, LEVEL, FADE_IN)
  keepLooping()
}

function stop() {
  const p = player
  window.clearInterval(watch)
  if (!p) return
  ramp(p.master, p.ac, 0, FADE_OUT)
  window.clearTimeout(stopTimer)
  stopTimer = window.setTimeout(() => p.decks.forEach((d) => d.el.pause()), FADE_OUT * 1000 + 100)
}

/** Switches the ambience on or off, and remembers the choice. Call it from a press (browsers need a gesture to play). */
export function setAmbience(next: boolean) {
  if (next === on) return
  on = next
  try { window.localStorage.setItem(KEY, next ? 'on' : 'off') } catch {}
  if (on) start()
  else stop()
  emit()
}

export const ambienceOn = () => on

export function subscribeAmbience(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

let restored = false
/** If it was on last time, it comes back on with the first press (audio can't start before one). Quiet while the tab is hidden. */
export function restoreAmbience() {
  if (restored || typeof window === 'undefined') return
  restored = true
  let wanted = false
  try { wanted = window.localStorage.getItem(KEY) === 'on' } catch {}
  if (wanted) {
    on = true
    emit()
    const resume = () => { if (on) start() }
    window.addEventListener('pointerdown', resume, { once: true, capture: true })
    window.addEventListener('keydown', resume, { once: true, capture: true })
  }
  document.addEventListener('visibilitychange', () => {
    if (!on) return
    if (document.hidden) stop()
    else start()
  })
}
