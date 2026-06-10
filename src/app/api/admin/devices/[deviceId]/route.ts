/**
 * DELETE /api/admin/devices/[deviceId] — завершить сеанс
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { deviceId } = await params;

    const device = await prisma.device.findUnique({ where: { id: deviceId }, select: { id: true, userId: true, deviceName: true } });
    if (!device) throw new HttpError(404, "device_not_found");

    await prisma.device.update({ where: { id: deviceId }, data: { isRevoked: true } });
    await logAudit(admin.id, "SETTINGS_CHANGE", `device:${deviceId}`, {
      action: "revoke_session",
      userId: device.userId,
      device: device.deviceName,
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
