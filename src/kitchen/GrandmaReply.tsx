'use client'

import { useEffect, useState } from 'react'
import { speakReply, stopSpeaking } from '@/grandma/speakReply'

type ReplyLine = { text: string; at: number }

const TYPE_MS = 32

/** Grandma's lines, each typed out and spoken once its start time passes; the latest line replaces the one before. */
export function GrandmaReply({ lines }: { lines: readonly ReplyLine[] }) {
  const [typed, setTyped] = useState<string[]>(() => lines.map(() => ''))

  useEffect(() => {
    const timers: number[] = []
    lines.forEach((line, index) => {
      timers.push(window.setTimeout(() => {
        void speakReply(line.text)
        let count = 0
        const typing = window.setInterval(() => {
          count += 1
          setTyped((current) => current.map((value, i) => (i === index ? line.text.slice(0, count) : value)))
          if (count >= line.text.length) window.clearInterval(typing)
        }, TYPE_MS)
        timers.push(typing)
      }, line.at))
    })
    return () => {
      timers.forEach((timer) => { window.clearTimeout(timer); window.clearInterval(timer) })
      stopSpeaking()
    }
  }, [lines])

  const latest = typed.reduce((found, value, index) => (value ? index : found), -1)
  if (latest < 0) return null
  return (
    <div className="instruction-reply" role="status" aria-live="polite">
      <p key={latest}>{typed[latest]}</p>
    </div>
  )
}
