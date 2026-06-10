/**
 * DELETE /api/cloud/files/[fileId] — delete file record and physical file
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, noContent, requireUser, HttpError } from "@/lib/api-helpers";
import { unlink } from "node:fs/promises";
import path from "node:path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { fileId } = await params;

    const file = await prisma.cloudFile.findFirst({
      where: { id: fileId, userId: user!.id },
    });
    if (!file) throw new HttpError(404, "file_not_found");

    // Delete physical file
    if (file.url.startsWith("/")) {
      try {
        await unlink(path.join(process.cwd(), "public", file.url));
      } catch {
        // ignore
      }
    }

    await prisma.cloudFile.delete({ where: { id: fileId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
