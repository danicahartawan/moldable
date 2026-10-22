import { promises as fs } from 'node:fs'
import path from 'node:path'
import { defaultRecipe, type RecipeDoc } from './model'

// Where the shared recipe lives, server side. In production it is a Redis database over REST (Upstash, which Vercel's
// Marketplace sets up and fills in KV_REST_API_URL and KV_REST_API_TOKEN for). Without that it is a file while developing, and
// memory as a last resort (which a serverless host throws away between requests, so production should have the database).
const KEY = 'moldable:recipe'

function redis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

async function redisCommand(db: { url: string; token: string }, command: string[]) {
  const response = await fetch(db.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${db.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Recipe database ${response.status}`)
  return (await response.json() as { result: unknown }).result
}

const FILE = path.join(process.cwd(), '.data', 'recipe.json')
let memory: RecipeDoc | null = null

function isDoc(value: unknown): value is RecipeDoc {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<RecipeDoc>
  return typeof d.rev === 'number' && !!d.mods && Array.isArray(d.storyEdits) && Array.isArray(d.versions)
}

export async function loadRecipe(): Promise<RecipeDoc> {
  const db = redis()
  try {
    if (db) {
      const raw = await redisCommand(db, ['GET', KEY])
      const doc = typeof raw === 'string' ? JSON.parse(raw) : null
      return isDoc(doc) ? doc : defaultRecipe()
    }
    if (process.env.VERCEL) return memory ?? defaultRecipe()
    const doc = JSON.parse(await fs.readFile(FILE, 'utf8'))
    return isDoc(doc) ? doc : defaultRecipe()
  } catch {
    return memory ?? defaultRecipe()
  }
}

export async function saveRecipe(doc: RecipeDoc): Promise<void> {
  memory = doc
  const db = redis()
  if (db) {
    await redisCommand(db, ['SET', KEY, JSON.stringify(doc)])
    return
  }
  if (process.env.VERCEL) return
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(doc, null, 2))
}

/** Reads the recipe, lets `change` return the next one, and saves it if it changed. */
export async function updateRecipe(change: (doc: RecipeDoc) => RecipeDoc): Promise<{ before: RecipeDoc; after: RecipeDoc }> {
  const before = await loadRecipe()
  const after = change(before)
  if (after !== before) await saveRecipe(after)
  return { before, after }
}
