// A small per-caller limit for routes that spend money or change shared state. It lives in the server's memory, so on a
// serverless host it is a best-effort brake per instance, not a guarantee.
const buckets = new Map<string, number[]>()

export function tooMany(request: Request, name: string, max: number, windowMs = 60_000) {
  const caller = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  const key = `${name}:${caller}`
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  buckets.set(key, recent)
  return recent.length > max
}
