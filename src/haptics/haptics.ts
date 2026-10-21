/* Haptic taps: a short, soft sound made on the fly with Web Audio (no audio files), like a phone's taptic tick:
   a low thump for the body of the press and a tiny bright click for its edge. Where the device can, it also buzzes. */

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function audio() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  // Browsers start audio suspended until a gesture; a press is one.
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  if (!noise) {
    noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.02), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return ctx
}

export type TapWeight = 'light' | 'medium'

/** Plays one tap. `medium` is a little deeper and fuller, for the screen's main (dark) actions. */
export function tap(weight: TapWeight = 'light') {
  const ac = audio()
  const t = ac?.currentTime ?? 0
  if (ac && noise) {
    const out = ac.createGain()
    out.gain.value = weight === 'medium' ? 0.32 : 0.24
    out.connect(ac.destination)

    // The thump: a low sine that drops in pitch and dies away in ~40ms.
    const body = ac.createOscillator()
    const bodyGain = ac.createGain()
    body.type = 'sine'
    body.frequency.setValueAtTime(weight === 'medium' ? 170 : 220, t)
    body.frequency.exponentialRampToValueAtTime(weight === 'medium' ? 70 : 95, t + 0.04)
    bodyGain.gain.setValueAtTime(0.0001, t)
    bodyGain.gain.exponentialRampToValueAtTime(1, t + 0.002)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + (weight === 'medium' ? 0.06 : 0.045))
    body.connect(bodyGain).connect(out)
    body.start(t)
    body.stop(t + 0.07)

    // The click: a few milliseconds of bright noise on top.
    const click = ac.createBufferSource()
    const hp = ac.createBiquadFilter()
    const clickGain = ac.createGain()
    click.buffer = noise
    hp.type = 'highpass'
    hp.frequency.value = 2600
    clickGain.gain.setValueAtTime(0.35, t)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
    click.connect(hp).connect(clickGain).connect(out)
    click.start(t)
    click.stop(t + 0.02)
  }
  // A real haptic where there is one (Android browsers; iOS Safari has no vibration API).
  try { navigator.vibrate?.(weight === 'medium' ? 12 : 8) } catch {}
}
