/**
 * GET /api/admin/health — real health checks for DB, Redis, WebSocket, Storage
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function checkDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await redis.ping();
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkStorage(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const testDir = path.join(process.cwd(), "public", "uploads");
    await fs.access(testDir);
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkWebSocket(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const hasIo = typeof globalThis !== "undefined" && (globalThis as any).__ioInstance;
    return { ok: !!hasIo, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    async function checkSearch(): Promise<{ ok: boolean; latencyMs: number }> {
      const start = performance.now();
      try {
        const res = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/messages/search?q=test&limit=1`, {
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });
        return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
      } catch {
        return { ok: false, latencyMs: Math.round(performance.now() - start) };
      }
    }

    async function checkPayments(): Promise<{ ok: boolean; latencyMs: number }> {
      const start = performance.now();
      try {
        const res = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/premium/plans`, {
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });
        return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
      } catch {
        return { ok: false, latencyMs: Math.round(performance.now() - start) };
      }
    }

    async function checkNotifications(): Promise<{ ok: boolean; latencyMs: number }> {
      const start = performance.now();
      try {
        const res = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/admin/notifications`, {
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });
        return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
      } catch {
        return { ok: false, latencyMs: Math.round(performance.now() - start) };
      }
    }

    const [apiLatency, db, redis, storage, ws, search, payments, notifications] = await Promise.all([
      (async () => {
        const start = performance.now();
        try {
          const res = await fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/admin/stats`, {
            headers: { cookie: req.headers.get("cookie") ?? "" },
          });
          return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
        } catch {
          return { ok: false, latencyMs: Math.round(performance.now() - start) };
        }
      })(),
      checkDb(),
      checkRedis(),
      checkStorage(),
      checkWebSocket(),
      checkSearch(),
      checkPayments(),
      checkNotifications(),
    ]);

    return NextResponse.json({
      api: apiLatency,
      db,
      redis,
      storage,
      websocket: ws,
      search,
      payments,
      notifications,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error" }, { status: err.status ?? 500 });
  }
}
