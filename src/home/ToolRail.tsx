'use client'

import { Fan, Oven, Scales, Thermometer, Timer, type Icon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'

export type ToolId = 'microwave' | 'blend' | 'timer' | 'weigh' | 'temperature'

type ToolDefinition = {
  id: ToolId
  label: string
  Icon: Icon
}

const tools: readonly ToolDefinition[] = [
  { id: 'microwave', label: 'Microwave', Icon: Oven },
  { id: 'blend', label: 'Blend', Icon: Fan },
  { id: 'timer', label: 'Timer', Icon: Timer },
  { id: 'weigh', label: 'Weigh', Icon: Scales },
  { id: 'temperature', label: 'Temperature', Icon: Thermometer },
]

export function ToolRail() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null)
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const closeRail = () => {
    setIsOpen(false)
    setActiveTool(null)
  }

  return (
    <div
      className={`tool-rail${isOpen ? ' tool-rail--open' : ''}`}
      onPointerEnter={() => setIsOpen(true)}
      onPointerLeave={closeRail}
      onFocusCapture={() => setIsOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeRail()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        triggerRef.current?.focus()
        closeRail()
      }}
    >
      <button
        ref={triggerRef}
        className="tool-rail__trigger"
        type="button"
        aria-label="Open cooking tools"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />
      <div className="tool-rail__orbit" role="toolbar" aria-label="Cooking tools">
        {tools.map(({ id, label, Icon: ToolIcon }, index) => (
          <button
            className={`tool-chip${activeTool === id || selectedTool === id ? ' tool-chip--expanded' : ''}`}
            type="button"
            aria-label={label}
            aria-pressed={selectedTool === id}
            data-position={index - 2}
            key={id}
            onClick={() => {
              setSelectedTool(id)
              setActiveTool(id)
              setIsOpen(true)
            }}
            onFocus={() => setActiveTool(id)}
            onPointerEnter={() => setActiveTool(id)}
          >
            <ToolIcon size={21} weight="regular" aria-hidden="true" />
            <span className="tool-chip__label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
