/**
 * DELETE /api/admin/content/[itemId] — permanently delete content item
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { itemId } = await params;

    const item = await prisma.contentItem.findUnique({
      where: { id: itemId },
      select: { fileKey: true },
    });
    if (!item) throw new HttpError(404, "not_found");

    // Delete from storage
    try {
      const { deleteFile } = await import("@/lib/s3");
      await deleteFile(item.fileKey);
    } catch {}

    await prisma.contentItem.delete({ where: { id: itemId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
