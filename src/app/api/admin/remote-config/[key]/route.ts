/**
 * DELETE /api/admin/remote-config/[key] — delete config entry
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { key } = await params;

    const existing = await prisma.remoteConfig.findUnique({ where: { key } });
    if (!existing) throw new HttpError(404, "not_found");

    await prisma.remoteConfig.delete({ where: { key } });
    await logAudit(admin.id, "DELETE_REMOTE_CONFIG", "remote-config", { key });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
