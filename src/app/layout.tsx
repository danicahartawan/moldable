import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/design-system/tokens.css'
import '@/styles.css'
import '@/boards/boards.css'
import { HapticClicks } from '@/haptics/HapticClicks'
import { archivo, interTight } from '@/design-system/fonts'

export const metadata: Metadata = {
  title: 'Moldable',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${interTight.variable} ${archivo.variable}`}>
      <body>
        {children}
        <HapticClicks />
      </body>
    </html>
  )
}
