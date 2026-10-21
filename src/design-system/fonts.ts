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

// Archivo (wght 100–900, wdth 62–125): the kitchen screens (fridge, recipe home view, cooking step), the goo tooltip
// and the case study. The upright face is preloaded, as it's the kitchen's main face; the italic is rarely needed, so it
// is declared separately under the same family name and only fetched if something on the page is set in it.
export const archivo = localFont({
  src: './fonts/Archivo-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-archivo',
  declarations: [
    { prop: 'font-family', value: 'Archivo' },
    { prop: 'font-stretch', value: '62% 125%' },
  ],
})

export const archivoItalic = localFont({
  src: './fonts/Archivo-Italic-Variable.woff2',
  weight: '100 900',
  style: 'italic',
  display: 'swap',
  preload: false,
  variable: '--font-archivo-italic',
  declarations: [
    { prop: 'font-family', value: 'Archivo' },
    { prop: 'font-stretch', value: '62% 125%' },
  ],
})
