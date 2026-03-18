// Simple in-memory rate limiter
// Tracks attempts per IP address

const attempts = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(ip: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (record.count >= maxAttempts) {
    return false // blocked
  }

  record.count++
  return true // allowed
}

export function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}
