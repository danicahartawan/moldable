'use client'

import { Camera, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { renderTranscriptText } from './RollingTranscript'

export type StoryPhoto = { id: number; at: number; src: string }
export type StoryChange = { find: string; replace: string }

// Marks each requested change in orange: the old word struck through, the new one beside it.
function renderWithChanges(text: string, changes: StoryChange[]): ReactNode[] {
  return renderTranscriptText(text, 'fill').flatMap((node, index) => {
    if (typeof node !== 'string' || !changes.length) return [node]
    const pattern = new RegExp(`\\b(${changes.map((change) => change.find).join('|')})\\b`, 'g')
    return node.split(pattern).map((part, partIndex) => {
      const change = changes.find((candidate) => candidate.find === part)
      if (!change) return part
      return (
        <mark className="gm-change" key={`change-${index}-${partIndex}`}>
          <s>{change.find}</s><span className="gm-change__new"> {change.replace}</span>
        </mark>
      )
    })
  })
}

const TYPING_MS_PER_CHAR = 28
const DEMO_PHOTO = '/assets/grandma-wok-photo.jpg'
const SHUTTER_MS = 520

// Types toward the target one character at a time; a tool marker like [Blend] lands whole, so a chip never shows half-typed.
export function useTypedLength(target: string) {
  const [length, setLength] = useState(0)
  const visible = Math.min(length, target.length)

  useEffect(() => {
    if (visible >= target.length) {
      if (length !== visible) setLength(visible)
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setLength(target.length)
      return
    }
    const typing = window.setTimeout(() => {
      const close = target[visible] === '[' ? target.indexOf(']', visible) : -1
      setLength(close === -1 ? visible + 1 : close + 1)
    }, TYPING_MS_PER_CHAR)
    return () => window.clearTimeout(typing)
  }, [length, target, visible])

  return visible
}

// The story as typed so far, with a numbered [Image n] marker wherever a photo was taken.
export function NoteStory({ text, visibleLength, interimText, photos, changes = [] }: { text: string; visibleLength: number; interimText: string; photos: StoryPhoto[]; changes?: StoryChange[] }) {
  const pieces: ReactNode[] = []
  let cursor = 0
  for (const photo of [...photos].sort((a, b) => a.at - b.at)) {
    const at = Math.min(photo.at, visibleLength)
    if (at > cursor) pieces.push(<span key={`text-${cursor}`}>{renderWithChanges(text.slice(cursor, at), changes)}</span>)
    pieces.push(
      <span key={`photo-${photo.id}`} className="gm-image-chip">[Image {photo.id}]</span>,
    )
    cursor = Math.max(cursor, at)
  }
  if (visibleLength > cursor) pieces.push(<span key={`text-${cursor}`}>{renderWithChanges(text.slice(cursor, visibleLength), changes)}</span>)

  return (
    <div className="gm-story" aria-live="polite">
      <span className="grandma-transcript__accessible">{text.replace(/\[([^\]]+)\]/g, '$1')}</span>
      <div aria-hidden="true">
        {pieces}
        {interimText ? <span className="gm-story__interim"> {renderTranscriptText(interimText, 'fill')}</span> : null}
      </div>
    </div>
  )
}

// A camera on the side of the screen. Tapping it grows a viewfinder card out of the button;
// with no camera (or if it's refused) the card frames a demo photo instead.
export function CameraButton({ onCapture, onOpenChange }: { onCapture: (src: string) => void; onOpenChange?: (isOpen: boolean) => void }) {
  const [view, setView] = useState<'closed' | 'live' | 'demo'>('closed')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    onOpenChange?.(view !== 'closed')
  }, [view, onOpenChange])

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [stream])

  const close = () => {
    setStream(null)
    setView('closed')
  }

  const open = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera')
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }))
      setView('live')
    } catch {
      setView('demo')
    }
  }

  const snap = () => {
    const frame = video.current
    if (view === 'live' && frame?.videoWidth) {
      const scale = Math.min(1, 640 / frame.videoWidth)
      const canvas = document.createElement('canvas')
      canvas.width = frame.videoWidth * scale
      canvas.height = frame.videoHeight * scale
      canvas.getContext('2d')?.drawImage(frame, 0, 0, canvas.width, canvas.height)
      onCapture(canvas.toDataURL('image/jpeg', 0.82))
    } else {
      onCapture(DEMO_PHOTO)
    }
    setIsFlashing(true)
    window.setTimeout(() => {
      setIsFlashing(false)
      close()
    }, SHUTTER_MS)
  }

  return (
    <>
      {view === 'closed' ? (
        <button type="button" className="gm-camera" aria-label="Take a photo" onClick={open}>
          <Camera size={22} weight="fill" />
        </button>
      ) : (
        <div className="gm-viewfinder" role="dialog" aria-label="Camera">
          {view === 'live' ? (
            <video ref={video} className="gm-viewfinder__view" autoPlay playsInline muted />
          ) : (
            <img className="gm-viewfinder__view" src={DEMO_PHOTO} alt="" />
          )}
          <button type="button" className="gm-viewfinder__close" aria-label="Close camera" onClick={close}>
            <X size={16} weight="bold" />
          </button>
          <button type="button" className="gm-viewfinder__shutter" aria-label="Take photo" onClick={snap} />
          {isFlashing ? <div className="gm-shutter" aria-hidden="true"><span /><span /></div> : null}
        </div>
      )}
    </>
  )
}
