import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!redis) redis = Redis.fromEnv()
  return redis
}

const limiterCache = new Map<string, Ratelimit>()

export async function rateLimit(ip: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const r = getRedis()
  if (!r) return true // local dev — no Redis configured, allow all

  const key = `${maxAttempts}:${windowMs}`
  if (!limiterCache.has(key)) {
    limiterCache.set(key, new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(maxAttempts, `${Math.floor(windowMs / 1000)} s`),
      prefix: "@digital-will",
    }))
  }

  const { success } = await limiterCache.get(key)!.limit(ip)
  return success
}

export function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}
