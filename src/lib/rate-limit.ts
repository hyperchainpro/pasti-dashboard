// PASTI — Rate limiter + account lockout (in-memory, serverless-friendly)
//
// Two layers of protection:
//   1. IP-based rate limiting (5 attempts per 15 min per IP for auth endpoints)
//   2. Account lockout (5 failed logins → lock account 15 min, persisted to DB)
//
// In-memory Map works for Vercel serverless because each function instance
// keeps its own state — for production scale, swap to Redis/Upstash.

import { db } from './db'

// ── IP-based rate limiter (in-memory per instance) ──
interface RateBucket {
  count: number
  resetAt: number
}

const rateBuckets = new Map<string, RateBucket>()

interface RateLimitConfig {
  windowMs: number
  maxAttempts: number
}

const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  // Stricter for auth-write endpoints
  'auth:register': { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 3 per hour
  'auth:login': { windowMs: 15 * 60 * 1000, maxAttempts: 5 }, // 5 per 15min
  'auth:forgot-password': { windowMs: 60 * 60 * 1000, maxAttempts: 3 }, // 3 per hour
  'auth:reset-password': { windowMs: 60 * 60 * 1000, maxAttempts: 5 }, // 5 per hour
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfterSec: number
}

export function checkRateLimit(endpoint: string, identifier: string): RateLimitResult {
  const config = ENDPOINT_CONFIGS[endpoint]
  if (!config) {
    return { success: true, remaining: Infinity, resetAt: 0, retryAfterSec: 0 }
  }

  const key = `${endpoint}:${identifier}`
  const now = Date.now()
  let bucket = rateBuckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + config.windowMs }
    rateBuckets.set(key, bucket)
  }

  bucket.count += 1
  const remaining = Math.max(0, config.maxAttempts - bucket.count)
  const success = bucket.count <= config.maxAttempts

  // Clean up expired buckets occasionally (every 100 calls)
  if (Math.random() < 0.01) {
    for (const [k, b] of rateBuckets.entries()) {
      if (b.resetAt < now) rateBuckets.delete(k)
    }
  }

  return {
    success,
    remaining: success ? remaining : 0,
    resetAt: bucket.resetAt,
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
  }
}

// ── Account lockout (DB-backed, persists across instances) ──
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export interface LockoutResult {
  locked: boolean
  remaining: number
  unlockAt?: Date
}

export async function checkAccountLockout(email: string): Promise<LockoutResult> {
  // Use OwnerPreference as key-value store for lockout state
  // (avoids new Prisma model)
  const key = `lockout:${email.toLowerCase()}`
  const record = await db.ownerPreference.findUnique({ where: { prefKey: key } })
  if (!record) {
    return { locked: false, remaining: MAX_FAILED_ATTEMPTS }
  }

  const data = JSON.parse(record.prefValue) as {
    failedAttempts: number
    lockedUntil?: number
  }

  if (data.lockedUntil && data.lockedUntil > Date.now()) {
    return {
      locked: true,
      remaining: 0,
      unlockAt: new Date(data.lockedUntil),
    }
  }

  // Reset if lockout expired
  if (data.lockedUntil && data.lockedUntil <= Date.now()) {
    await db.ownerPreference.delete({ where: { prefKey: key } }).catch(() => {})
    return { locked: false, remaining: MAX_FAILED_ATTEMPTS }
  }

  return {
    locked: false,
    remaining: Math.max(0, MAX_FAILED_ATTEMPTS - data.failedAttempts),
  }
}

export async function recordFailedAttempt(email: string): Promise<LockoutResult> {
  const key = `lockout:${email.toLowerCase()}`
  const existing = await db.ownerPreference.findUnique({ where: { prefKey: key } })
  const data = existing
    ? (JSON.parse(existing.prefValue) as { failedAttempts: number; lockedUntil?: number })
    : { failedAttempts: 0 }

  data.failedAttempts += 1
  if (data.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
  }

  await db.ownerPreference.upsert({
    where: { prefKey: key },
    update: { prefValue: JSON.stringify(data) },
    create: { prefKey: key, prefValue: JSON.stringify(data) },
  })

  if (data.lockedUntil) {
    return {
      locked: true,
      remaining: 0,
      unlockAt: new Date(data.lockedUntil),
    }
  }

  return {
    locked: false,
    remaining: Math.max(0, MAX_FAILED_ATTEMPTS - data.failedAttempts),
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  const key = `lockout:${email.toLowerCase()}`
  await db.ownerPreference.delete({ where: { prefKey: key } }).catch(() => {})
}

// ── Client IP extraction helper ──
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
