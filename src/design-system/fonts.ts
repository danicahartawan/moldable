import localFont from 'next/font/local'

/* Self-hosted by next/font: hashed, long-cached files, and a preload for the main face. The files are the variable
   fonts cut to Latin (+ Latin Extended-A, fractions, arrows) as WOFF2. Both keep their plain family names, so the
   CSS that asks for "Inter Tight" or "Archivo" by name keeps working. SIL Open Font License: see ./fonts/*-OFL.txt. */

// Inter Tight (wght 100–900): the UI's own face (--font-sans, --font-display), used on every page.
export const interTight = localFont({
  src: './fonts/InterTight-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter-tight',
  declarations: [{ prop: 'font-family', value: 'Inter Tight' }],
})

// Archivo (wght 100–900, wdth 62–125): the kitchen screens, goo tooltip and case study. Not preloaded: most pages
// that use it also use Inter Tight first, and the italic is rarely needed.
export const archivo = localFont({
  src: [
    { path: './fonts/Archivo-Variable.woff2', style: 'normal' },
    { path: './fonts/Archivo-Italic-Variable.woff2', style: 'italic' },
  ],
  weight: '100 900',
  display: 'swap',
  preload: false,
  variable: '--font-archivo',
  declarations: [
    { prop: 'font-family', value: 'Archivo' },
    { prop: 'font-stretch', value: '62% 125%' },
  ],
})
