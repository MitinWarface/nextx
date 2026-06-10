/**
 * DELETE /api/admin/segments/[segmentId] — удалить сегмент
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { segmentId } = await params;

    const segment = await prisma.userSegment.findUnique({ where: { id: segmentId }, select: { id: true, name: true } });
    if (!segment) throw new HttpError(404, "segment_not_found");

    await prisma.userSegment.delete({ where: { id: segmentId } });
    await logAudit(admin.id, "SETTINGS_CHANGE", `segment:${segmentId}`, { deleted: segment.name });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
