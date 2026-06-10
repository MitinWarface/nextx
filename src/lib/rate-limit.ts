/**
 * Rate limiter using Redis sliding window.
 * Supports DB-backed configs for premium vs free limits.
 */
import { Redis } from "ioredis";
import { prisma } from "@/lib/prisma";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  lazyConnect: true,
});
redis.connect().catch(() => {});

export interface RateLimitConfig {
  windowMs: number;   // time window in milliseconds
  max: number;        // max requests per window
  keyPrefix?: string; // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;    // unix timestamp when window resets
}

/**
 * Check rate limit for a given key (e.g., IP or user ID).
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { windowMs, max, keyPrefix = "rl" } = config;
  const redisKey = `${keyPrefix}:${key}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now.toString(), `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.zcard(redisKey);
    pipeline.pexpire(redisKey, windowMs);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    return {
      allowed: count <= max,
      remaining: Math.max(0, max - count),
      resetAt: now + windowMs,
    };
  } catch {
    // Redis down — fail open (allow request)
    return {
      allowed: true,
      remaining: max,
      resetAt: now + windowMs,
    };
  }
}

/**
 * Middleware-style rate limit check.
 */
export async function rateLimit(
  req: Request,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
  const ip = forwarded || "unknown";
  const result = await checkRateLimit(ip, config);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": config.max.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };

  return { allowed: result.allowed, headers };
}

// ============================================================
// DB-backed rate limit configs with in-memory cache
// ============================================================

interface DbRateLimitRow {
  action: string;
  freeLimit: number;
  premiumLimit: number;
  windowMs: number;
}

let _dbCache: Map<string, DbRateLimitRow> | null = null;
let _dbCacheExpiry = 0;
const DB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadDbConfigs(): Promise<Map<string, DbRateLimitRow>> {
  if (_dbCache && Date.now() < _dbCacheExpiry) return _dbCache;
  try {
    const rows = await prisma.rateLimitConfig.findMany();
    const map = new Map<string, DbRateLimitRow>();
    for (const r of rows) {
      map.set(r.action, {
        action: r.action,
        freeLimit: r.freeLimit,
        premiumLimit: r.premiumLimit,
        windowMs: r.windowMs,
      });
    }
    _dbCache = map;
    _dbCacheExpiry = Date.now() + DB_CACHE_TTL_MS;
    return map;
  } catch {
    return _dbCache ?? new Map();
  }
}

export function invalidateRateLimitCache(): void {
  _dbCache = null;
  _dbCacheExpiry = 0;
}

/**
 * Get rate limit config for an action, considering premium status.
 * Falls back to hardcoded RATE_LIMITS if DB config not found.
 */
export async function getDbRateLimit(
  action: string,
  isPremium: boolean,
): Promise<RateLimitConfig> {
  const configs = await loadDbConfigs();
  const db = configs.get(action);
  if (db) {
    return {
      windowMs: db.windowMs,
      max: isPremium ? db.premiumLimit : db.freeLimit,
    };
  }
  // Fallback to preset
  return RATE_LIMITS[action as keyof typeof RATE_LIMITS] ?? RATE_LIMITS.api;
}

/**
 * User-aware rate limit check. Uses user ID as key.
 * Returns allowed + headers + premiumLimit info.
 */
export async function userRateLimit(
  userId: string,
  action: string,
  isPremium: boolean,
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const config = await getDbRateLimit(action, isPremium);
  const result = await checkRateLimit(`user:${userId}:${action}`, config);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": config.max.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };

  return { allowed: result.allowed, headers };
}

/**
 * Preset rate limit configs (used as fallback when DB has no entry).
 */
export const RATE_LIMITS = {
  /** General API: 100 req/min */
  api: { windowMs: 60_000, max: 100 },
  /** Auth endpoints: 10 req/min */
  auth: { windowMs: 60_000, max: 10 },
  /** Upload: 20 req/min */
  upload: { windowMs: 60_000, max: 20 },
  /** Messages: 60 req/min (overridden by DB: free=30, premium=120) */
  messages: { windowMs: 60_000, max: 60 },
  /** Search: 30 req/min (overridden by DB: free=15, premium=60) */
  search: { windowMs: 60_000, max: 30 },
} satisfies Record<string, RateLimitConfig>;
