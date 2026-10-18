import { useEffect, useRef } from 'react'

// Ported from the Moldable design system's ThermalWave: a heat wave of stepped
// thermal pixels that burns away to reveal the container it sits in.
// Put it as the last child of a `position: relative; overflow: hidden` container.

const THERMAL_TOKENS = ['--thermal-violet', '--thermal-magenta', '--thermal-ember', '--thermal-flare']

type ThermalWaveProps = {
  cell?: number
  duration?: number
  originX?: number
  originY?: number
  onDone?: () => void
}

function rgbOf(value: string): [number, number, number] {
  const s = value.trim()
  if (s.startsWith('#')) {
    const hex = s.length === 4 ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
  }
  const m = s.match(/\d+(\.\d+)?/g)
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [128, 128, 128]
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function ThermalWave({ cell = 10, duration = 560, originX = 0, originY = 0, onDone }: ThermalWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || prefersReducedMotion()) {
      onDone?.()
      return
    }

    const dpr = window.devicePixelRatio || 1
    const styles = getComputedStyle(canvas)
    const palette = THERMAL_TOKENS.map((token) => rgbOf(styles.getPropertyValue(token)))
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const columns = Math.ceil(width / cell)
    const rows = Math.ceil(height / cell)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const s1 = Math.random() * 6
    const s2 = Math.random() * 6
    const s3 = Math.random() * 6
    const cells: { x: number; y: number; d: number; n: number }[] = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const u = x / columns
        const v = y / rows
        const dx = u - originX
        const dy = v - originY
        const n = (Math.sin(u * 7.1 + s1) * Math.cos(v * 5.3 + s2) + Math.sin((u + v) * 11.7 + s3) * 0.6 + (Math.random() - 0.5) * 0.5) / 2.1
        cells.push({ x: x * cell, y: y * cell, d: Math.sqrt(dx * dx * 0.55 + dy * dy) / 1.05 + n * 0.14, n })
      }
    }

    const start = performance.now()
    let frameId = 0
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const front = t * 1.45 - 0.15
      ctx.clearRect(0, 0, width, height)
      for (const q of cells) {
        const age = front - q.d
        let temp: number
        let alpha: number
        if (age < 0) {
          const near = Math.max(0, 1 + age * 7)
          temp = 0.1 + q.n * 0.08 + near * near * 0.85
          alpha = 1
        } else {
          temp = Math.max(0.04, 0.97 - age * 4.2) + q.n * 0.06
          alpha = Math.max(0, 1 - Math.max(0, age - 0.14) * 4.2)
        }
        if (alpha <= 0.01) continue
        const [r, g, b] = palette[Math.max(0, Math.min(3, Math.floor(temp * 4)))]
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.fillRect(q.x, q.y, cell - 1, cell - 1)
      }
      if (t < 1) {
        frameId = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, width, height)
        onDone?.()
      }
    }
    frameId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameId)
    // The wave plays once per mount; remount with a new key to play it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} className="thermal-wave" aria-hidden="true" />
}
