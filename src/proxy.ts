import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// On moldable.kitchen the site is one screen, the Grandma and Grandkids kitchen: it lives at the root (the home page itself is the kitchen), with no path, and no
// other page and no backend (API) route of the app is reachable. Everywhere else (localhost, previews) every route works as usual.
const KITCHEN_HOSTS = new Set(['moldable.kitchen', 'www.moldable.kitchen'])

// What the screens load: the app's scripts and styles, their images and fonts. No backend: every /api route is closed here.
const ALLOWED_PREFIXES = ['/_next/', '/assets/', '/fonts/']

export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  if (!KITCHEN_HOSTS.has(host)) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname === '/') return NextResponse.next()
  // The path is never shown: /grandma/blank on the domain goes back to the root.
  if (pathname === '/grandma/blank') return NextResponse.redirect(new URL('/', request.url))
  if (ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next()
  return new NextResponse('Not found', { status: 404 })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
