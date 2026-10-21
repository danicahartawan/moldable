'use client'

import { useState } from 'react'
import { GooButton, GooTooltipGroup, type GooTooltipGroupProps } from './GooTooltip'

// 20 × 20 stroke icons, as everywhere on the kitchen display.
const ICON = {
  plus: 'M10 4v12M4 10h12',
  search: 'M9 3.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z M13 13l3.5 3.5',
  share: 'M10 12.5V3.5M6.5 7L10 3.5 13.5 7 M5 10.5v4.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-4.5',
  export: 'M10 3.5v9M6.5 9L10 12.5 13.5 9 M4.5 16.5h11',
  save: 'M6 3.5h8a1 1 0 0 1 1 1v12l-5-3.2-5 3.2v-12a1 1 0 0 1 1-1z',
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

// The row from the recording: two round icon buttons, then three labelled pills.
function DemoRow(props: Omit<GooTooltipGroupProps, 'children'>) {
  return (
    <GooTooltipGroup {...props}>
      <GooButton tooltip="Add item" aria-label="Add item" icon={<Icon d={ICON.plus} />} />
      <GooButton tooltip="Search" aria-label="Search" icon={<Icon d={ICON.search} />} />
      <GooButton tooltip="Copy a link" icon={<Icon d={ICON.share} />}>Share</GooButton>
      <GooButton tooltip="Download as CSV" icon={<Icon d={ICON.export} />}>Export</GooButton>
      <GooButton tooltip="Save to drafts" icon={<Icon d={ICON.save} />}>Save</GooButton>
    </GooTooltipGroup>
  )
}

export function GooDemo() {
  const [tint, setTint] = useState(false)
  return (
    <div className="goo-demo">
      <section className="goo-demo__case" aria-labelledby="goo-ink">
        <h2 id="goo-ink" className="goo-demo__title">Ink tooltip, as in the recording</h2>
        <p className="goo-demo__note">Same colour as the buttons: the drop and its button are one material.</p>
        <DemoRow aria-label="Actions" />
      </section>
      <section className="goo-demo__case" aria-labelledby="goo-apricot">
        <h2 id="goo-apricot" className="goo-demo__title">Apricot tooltip over ink buttons</h2>
        <p className="goo-demo__note">The neck blends ink into apricot where they meet. Neck tint turns the drop from ink to apricot as it leaves instead.</p>
        <DemoRow aria-label="Actions, apricot tooltip" color="#ffa24f" textColor="#1f1c19" neckTint={tint} />
        <label className="goo-demo__toggle">
          <input type="checkbox" checked={tint} onChange={(e) => setTint(e.target.checked)} />
          Neck tint
        </label>
      </section>
    </div>
  )
}
