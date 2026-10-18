import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/design-system/fonts.css'
import '@/design-system/tokens.css'
import '@/styles.css'
import '@/boards/boards.css'

export const metadata: Metadata = {
  title: 'Moldable',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  )
}
