/**
 * GET  /api/admin/devices — список устройств
 * DELETE /api/admin/devices/[deviceId] — завершить сеанс
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") ?? "all";

    const where: any = {};
    if (filter === "active") where.isRevoked = false;
    if (filter === "suspicious") where.trustLevel = "suspicious";

    const devices = await prisma.device.findMany({
      where,
      orderBy: { lastActivity: "desc" },
      take: 200,
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });

    return ok({ devices });
  } catch (err) {
    return fail(err);
  }
}
