/**
 * Rate limit middleware for Next.js API routes.
 * Supports both IP-based (withRateLimit) and user-based (withUserRateLimit) limiting.
 */
import { type NextRequest, NextResponse } from "next/server";
import { rateLimit, userRateLimit, RATE_LIMITS, type RateLimitConfig } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Wraps an API handler with IP-based rate limiting.
 * Works with both (req) and (req, context) signatures.
 */
export function withRateLimit<
  Args extends unknown[],
  R extends NextResponse,
>(
  handler: (req: NextRequest, ...args: Args) => Promise<R>,
  config: RateLimitConfig = RATE_LIMITS.api,
) {
  return async (req: NextRequest, ...args: Args): Promise<R> => {
    const { allowed, headers } = await rateLimit(req, config);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers },
      ) as R;
    }

    const response = await handler(req, ...args);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  };
}

/**
 * Wraps an API handler with user-aware rate limiting.
 * Uses DB-backed RateLimitConfig with premium vs free limits.
 * Falls back to IP-based if user not found.
 */
export function withUserRateLimit<
  Args extends unknown[],
  R extends NextResponse,
>(
  action: string,
  handler: (req: NextRequest, ...args: Args) => Promise<R>,
) {
  return async (req: NextRequest, ...args: Args): Promise<R> => {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    let allowed: boolean;
    let headers: Record<string, string>;

    if (user) {
      // Check if user is premium
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { premiumStatus: true },
      });
      const isPremium = fullUser?.premiumStatus === "active";
      const result = await userRateLimit(user.id, action, isPremium);
      allowed = result.allowed;
      headers = result.headers;
    } else {
      // Fallback to IP-based
      const result = await rateLimit(req, RATE_LIMITS.api);
      allowed = result.allowed;
      headers = result.headers;
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers },
      ) as R;
    }

    const response = await handler(req, ...args);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  };
}
