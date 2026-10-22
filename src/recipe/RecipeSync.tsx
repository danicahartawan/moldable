'use client'

import { useEffect } from 'react'
import { announceRecipe, fetchRecipe } from './client'

const POLL_MS = 4000

/** Keeps every screen on the page in step with the shared recipe: reads it now, then again every few seconds and on return. */
export function RecipeSync() {
  useEffect(() => {
    let stopped = false
    const read = async () => {
      const doc = await fetchRecipe()
      if (doc && !stopped) announceRecipe(doc)
    }
    void read()
    const timer = window.setInterval(() => { if (!document.hidden) void read() }, POLL_MS)
    const onVisible = () => { if (!document.hidden) void read() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return null
}
