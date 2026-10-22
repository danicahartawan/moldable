import { promises as fs } from 'node:fs'
import path from 'node:path'
import { applyCookbookOp, defaultCookbooks, isCookbooks, type CookbookOp, type Cookbooks } from './model'

// Where the cookbooks live, server side, the same way as the shared recipe (see src/recipe/store): Redis over REST in
// production (Upstash, KV_REST_API_URL / KV_REST_API_TOKEN), a file while developing, memory as a last resort.
const KEY = 'moldable:cookbooks'
const FILE = path.join(process.cwd(), '.data', 'cookbooks.json')
let memory: Cookbooks | null = null

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
  if (!response.ok) throw new Error(`Cookbook database ${response.status}`)
  return (await response.json() as { result: unknown }).result
}

export async function loadCookbooks(): Promise<Cookbooks> {
  const db = redis()
  try {
    if (db) {
      const raw = await redisCommand(db, ['GET', KEY])
      const doc = typeof raw === 'string' ? JSON.parse(raw) : null
      return isCookbooks(doc) ? doc : defaultCookbooks()
    }
    if (process.env.VERCEL) return memory ?? defaultCookbooks()
    const doc = JSON.parse(await fs.readFile(FILE, 'utf8'))
    return isCookbooks(doc) ? doc : defaultCookbooks()
  } catch {
    return memory ?? defaultCookbooks()
  }
}

export async function saveCookbooks(doc: Cookbooks): Promise<void> {
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

/** Reads the cookbooks, applies one change, and saves them if it changed anything. */
export async function changeCookbooks(op: CookbookOp): Promise<Cookbooks> {
  const before = await loadCookbooks()
  const after = applyCookbookOp(before, op)
  if (after !== before) await saveCookbooks(after)
  return after
}
