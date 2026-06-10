/**
 * GET /api/admin/abuse/investigate?q=... — search user→IP→device graph
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    if (!q.trim()) return ok({ results: [] });

    const search = q.trim().toLowerCase();

    // Find matching users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: search },
          { username: { contains: search, mode: "insensitive" } },
          { displayName: { contains: search, mode: "insensitive" } },
        ],
      },
      select: { id: true, username: true, displayName: true },
      take: 20,
    });

    // Also find devices by IP or deviceName
    const devicesByIP = await prisma.device.findMany({
      where: {
        OR: [
          { ipAddress: { contains: search } },
          { deviceName: { contains: search, mode: "insensitive" } },
        ],
      },
      select: {
        userId: true,
        id: true,
        deviceName: true,
        ipAddress: true,
        trustLevel: true,
        lastActivity: true,
      },
      take: 50,
    });

    // Merge: get all unique userIds
    const userIds = new Set([
      ...users.map((u) => u.id),
      ...devicesByIP.map((d) => d.userId),
    ]);

    // Build graph: for each user, collect all their devices
    const results = await Promise.all(
      Array.from(userIds).slice(0, 20).map(async (userId) => {
        const user = users.find((u) => u.id === userId) ?? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, displayName: true },
        });
        const devices = await prisma.device.findMany({
          where: { userId },
          select: { id: true, deviceName: true, ipAddress: true, trustLevel: true, lastActivity: true },
          orderBy: { lastActivity: "desc" },
          take: 20,
        });
        return { userId, username: user?.username ?? "unknown", displayName: user?.displayName ?? "Unknown", devices };
      }),
    );

    return ok({ results });
  } catch (err) {
    return fail(err);
  }
}
