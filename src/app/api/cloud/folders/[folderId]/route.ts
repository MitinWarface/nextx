/**
 * DELETE /api/cloud/folders/[folderId] — delete folder and all contents (cascade)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, noContent, requireUser, HttpError } from "@/lib/api-helpers";
import { unlink } from "node:fs/promises";
import path from "node:path";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const user = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { folderId } = await params;

    const folder = await prisma.cloudFolder.findFirst({
      where: { id: folderId, userId: user!.id },
      include: { files: true, subfolders: true },
    });
    if (!folder) throw new HttpError(404, "folder_not_found");

    // Recursively collect all files in nested subfolders
    async function collectFiles(folderId: string): Promise<string[]> {
      const sub = await prisma.cloudFolder.findMany({
        where: { parentId: folderId },
        include: { files: true },
      });
      const fileUrls: string[] = [];
      for (const f of sub) {
        fileUrls.push(...f.files.map((x) => x.url));
        fileUrls.push(...(await collectFiles(f.id)));
      }
      return fileUrls;
    }

    const nestedFileUrls = await collectFiles(folderId);
    const allFileUrls = [...folder.files.map((f) => f.url), ...nestedFileUrls];

    // Delete physical files
    for (const url of allFileUrls) {
      if (url.startsWith("/")) {
        try {
          await unlink(path.join(process.cwd(), "public", url));
        } catch {
          // ignore — file may not exist
        }
      }
    }

    // Delete folder and all nested content (Prisma cascade handles subfolders + files)
    await prisma.cloudFolder.delete({ where: { id: folderId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
