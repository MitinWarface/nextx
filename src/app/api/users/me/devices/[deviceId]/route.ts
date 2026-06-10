/**
 * DELETE /api/users/me/devices/[deviceId] — завершить свой сеанс
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");
    const { deviceId } = await params;

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: user.id },
      select: { id: true, deviceName: true },
    });
    if (!device) throw new HttpError(404, "device_not_found");

    await prisma.device.update({
      where: { id: deviceId },
      data: { isRevoked: true },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: "session_revoked",
        details: { device: device.deviceName, deviceId },
      },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
