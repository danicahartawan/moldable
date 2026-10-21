/* Haptic sounds, made on the fly with Web Audio (no audio files). Each purpose has its own: soft sine tones with a
   gentle attack and a natural decay, a little lowpass so nothing is sharp, a faint room behind them, and a touch of
   variation every time so a repeated press never sounds mechanical. Where the device can, each also buzzes. */

export type Haptic = 'tap' | 'nav' | 'open' | 'close' | 'on' | 'off' | 'confirm' | 'paper' | 'wake'

type Engine = { ac: AudioContext; dry: GainNode; send: GainNode; noise: AudioBuffer }
let engine: Engine | null = null

// A short, soft room: decaying noise as the reverb's impulse response.
function room(ac: AudioContext, seconds: number) {
  const len = Math.round(ac.sampleRate * seconds)
  const ir = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  return ir
}

function setup(): Engine | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!engine) {
    const ac = new Ctor()
    // Everything meets in a gentle compressor, so stacked sounds never jump out.
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -24
    comp.ratio.value = 3
    comp.attack.value = 0.003
    comp.release.value = 0.2
    const master = ac.createGain()
    master.gain.value = 0.5
    comp.connect(master).connect(ac.destination)
    const dry = ac.createGain()
    dry.connect(comp)
    const verb = ac.createConvolver()
    verb.buffer = room(ac, 0.9)
    const send = ac.createGain()
    send.gain.value = 0.16
    send.connect(verb).connect(comp)
    const noise = ac.createBuffer(1, Math.round(ac.sampleRate * 0.08), ac.sampleRate)
    const n = noise.getChannelData(0)
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1
    engine = { ac, dry, send, noise }
  }
  // Browsers start audio suspended until a gesture; a press is one.
  if (engine.ac.state === 'suspended') void engine.ac.resume().catch(() => {})
  return engine
}

const vary = (x: number, by: number) => x * (1 + (Math.random() * 2 - 1) * by)

type Tone = { f: number; to?: number; at?: number; attack?: number; decay: number; gain: number; lp?: number; type?: OscillatorType; wet?: number }

// One soft voice: a pitch (gliding if asked), a gentle swell in, a long exponential fade out.
function tone(e: Engine, t0: number, { f, to, at = 0, attack = 0.006, decay, gain, lp = 2400, type = 'sine', wet = 1 }: Tone) {
  const { ac } = e
  const t = t0 + at
  const osc = ac.createOscillator()
  const filter = ac.createBiquadFilter()
  const env = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + Math.min(decay, 0.12))
  filter.type = 'lowpass'
  filter.frequency.value = lp
  filter.Q.value = 0.4
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  osc.connect(filter).connect(env)
  env.connect(e.dry)
  if (wet > 0) {
    const s = ac.createGain()
    s.gain.value = wet
    env.connect(s).connect(e.send)
  }
  osc.start(t)
  osc.stop(t + attack + decay + 0.05)
}

// A puff of air or paper: soft filtered noise.
function puff(e: Engine, t0: number, { at = 0, decay, gain, band, q = 0.8 }: { at?: number; decay: number; gain: number; band: number; q?: number }) {
  const { ac } = e
  const t = t0 + at
  const src = ac.createBufferSource()
  const filter = ac.createBiquadFilter()
  const env = ac.createGain()
  src.buffer = e.noise
  filter.type = 'bandpass'
  filter.frequency.value = band
  filter.Q.value = q
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + decay)
  src.connect(filter).connect(env).connect(e.dry)
  src.start(t)
  src.stop(t + decay + 0.02)
}

// Notes, in Hz: a calm pentatonic set (C, D, E, G, A), so any two sound well together.
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, G4 = 392, A4 = 440

const SOUNDS: Record<Haptic, (e: Engine, t: number) => void> = {
  // A soft wooden tok: a low tone that settles as it fades, with a breath of air on the front.
  tap: (e, t) => {
    tone(e, t, { f: vary(480, 0.03), to: vary(300, 0.03), decay: 0.07, gain: vary(0.5, 0.1), lp: 1600, wet: 0.5 })
    puff(e, t, { decay: 0.018, gain: 0.05, band: 1400 })
  },
  // Lighter and airier, for moving between steps, cookbooks and pages.
  nav: (e, t) => {
    tone(e, t, { f: vary(720, 0.03), to: vary(560, 0.03), decay: 0.06, gain: vary(0.32, 0.1), lp: 2600, wet: 0.6 })
  },
  // Something opens: a gentle bloop that rises a fifth.
  open: (e, t) => {
    tone(e, t, { f: vary(G4, 0.015), to: vary(D5, 0.015), attack: 0.01, decay: 0.16, gain: 0.38, lp: 2200 })
  },
  // And closes: the same bloop, falling back.
  close: (e, t) => {
    tone(e, t, { f: vary(D5, 0.015), to: vary(G4, 0.015), attack: 0.008, decay: 0.13, gain: 0.32, lp: 2000 })
  },
  // A toggle turning on: two soft notes going up; off: going down.
  on: (e, t) => {
    tone(e, t, { f: vary(C5, 0.01), decay: 0.11, gain: 0.3 })
    tone(e, t, { f: vary(G5, 0.01), at: 0.065, decay: 0.2, gain: 0.26 })
  },
  off: (e, t) => {
    tone(e, t, { f: vary(G5, 0.01), decay: 0.11, gain: 0.26 })
    tone(e, t, { f: vary(C5, 0.01), at: 0.065, decay: 0.18, gain: 0.28 })
  },
  // The main actions (Start cooking, the last Done): a warm two-note chime with a faint shimmer on top.
  confirm: (e, t) => {
    tone(e, t, { f: C5, attack: 0.01, decay: 0.55, gain: 0.3, lp: 3000 })
    tone(e, t, { f: E5, at: 0.06, attack: 0.01, decay: 0.6, gain: 0.26, lp: 3000 })
    tone(e, t, { f: C5 * 2, at: 0.06, attack: 0.02, decay: 0.3, gain: 0.05, lp: 4000 })
  },
  // A fridge note: a soft papery tap, low and close.
  paper: (e, t) => {
    puff(e, t, { decay: 0.05, gain: 0.22, band: 700, q: 0.6 })
    tone(e, t, { f: vary(200, 0.04), to: 130, decay: 0.05, gain: 0.22, lp: 900, wet: 0.2 })
  },
  // Talk to Moldable: three quiet rising notes, like something waking up.
  wake: (e, t) => {
    ;[A4, D5, E5].forEach((f, i) => tone(e, t, { f, at: i * 0.07, attack: 0.02, decay: 0.45, gain: 0.16, lp: 2600 }))
  },
}

const BUZZ: Record<Haptic, number | number[]> = {
  tap: 6, nav: 4, open: 8, close: 6, on: [6, 40, 6], off: 6, confirm: [10, 60, 14], paper: 10, wake: [4, 30, 4, 30, 4],
}

let lastAt = 0
let lastKind: Haptic | null = null

/** Plays the haptic for one press. Turned off by localStorage `moldable-sound` = `off`. */
export function play(kind: Haptic = 'tap') {
  try { if (window.localStorage.getItem('moldable-sound') === 'off') return } catch {}
  const now = performance.now()
  // The same sound twice within a blink would only smear; keep the first.
  if (kind === lastKind && now - lastAt < 40) return
  lastAt = now
  lastKind = kind
  const e = setup()
  if (e) SOUNDS[kind](e, e.ac.currentTime + 0.005)
  try { navigator.vibrate?.(BUZZ[kind]) } catch {}
}
