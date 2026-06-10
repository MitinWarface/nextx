/**
 * GET  /api/users/me/devices — мои устройства
 * DELETE /api/users/me/devices/[deviceId] — завершить сеанс
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const devices = await prisma.device.findMany({
      where: { userId: user.id },
      orderBy: { lastActivity: "desc" },
      select: {
        id: true,
        deviceName: true,
        platform: true,
        browser: true,
        ipAddress: true,
        country: true,
        city: true,
        trustLevel: true,
        lastActivity: true,
        isRevoked: true,
        createdAt: true,
      },
    });

    return ok({ devices });
  } catch (err) {
    return fail(err);
  }
}
