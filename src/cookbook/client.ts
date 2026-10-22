'use client'

import { useEffect, useState } from 'react'
import { applyCookbookOp, defaultCookbooks, type CookbookOp, type Cookbooks } from './model'
import type { Answer, Draft } from './tidy'

/** Sent on `window` whenever the cookbooks are first read or change; `detail` is all of them. */
export const COOKBOOKS_EVENT = 'moldable:cookbooks'
const POLL_MS = 5000

let latest: Cookbooks | null = null

/** The newest cookbooks this page has seen (the built-in two until the server answers). */
export const latestCookbooks = () => latest ?? defaultCookbooks(new Date(0))

/** Tells every screen on the page about the cookbooks. An older copy than the one shown is ignored. */
export function announceCookbooks(doc: Cookbooks, force = false) {
  if (!force && latest && latest.rev > doc.rev) return
  latest = doc
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<Cookbooks>(COOKBOOKS_EVENT, { detail: doc }))
}

export async function fetchCookbooks(): Promise<Cookbooks | null> {
  try {
    const response = await fetch('/api/cookbooks', { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json() as { cookbooks: Cookbooks }).cookbooks
  } catch {
    return null
  }
}

/**
 * Makes a change: it shows on this page at once, then the server's copy (which has it, and anyone else's) replaces it.
 * If the server can't be reached the change stays on this page.
 */
export async function changeCookbooks(op: CookbookOp): Promise<Cookbooks> {
  const mine = applyCookbookOp(latestCookbooks(), op)
  announceCookbooks(mine, true)
  try {
    const response = await fetch('/api/cookbooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op }) })
    if (!response.ok) return mine
    const doc = (await response.json() as { cookbooks: Cookbooks }).cookbooks
    announceCookbooks(doc, true)
    return doc
  } catch {
    return mine
  }
}

/** Tidies her story into a recipe draft (and the questions still worth asking). */
export async function tidyRecipe(body: { transcript: string; book: string; title?: string; answers?: Answer[] }): Promise<{ draft: Draft; by: 'ai' | 'rules' }> {
  const response = await fetch('/api/cookbooks/tidy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error((await response.json().catch(() => null) as { error?: string } | null)?.error ?? 'The recipe could not be tidied')
  return await response.json() as { draft: Draft; by: 'ai' | 'rules' }
}

/** The cookbooks, kept in step with the server: read now, then every few seconds while the page is showing. */
export function useCookbooks(): Cookbooks {
  const [doc, setDoc] = useState<Cookbooks>(latestCookbooks)
  useEffect(() => {
    const onChange = (event: Event) => setDoc((event as CustomEvent<Cookbooks>).detail)
    window.addEventListener(COOKBOOKS_EVENT, onChange)
    let stopped = false
    const read = async () => {
      const fresh = await fetchCookbooks()
      if (fresh && !stopped) announceCookbooks(fresh)
    }
    void read()
    const timer = window.setInterval(() => { if (!document.hidden) void read() }, POLL_MS)
    return () => {
      stopped = true
      window.removeEventListener(COOKBOOKS_EVENT, onChange)
      window.clearInterval(timer)
    }
  }, [])
  return doc
}
