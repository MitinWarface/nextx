/**
 * GET /api/cloud — list root folders and files for current user
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId") || null;
    const category = searchParams.get("category") || null;

    const where: Record<string, unknown> = { userId: user!.id };

    if (folderId) {
      where.folderId = folderId;
    } else {
      where.folderId = null;
    }

    if (category) {
      where.category = category;
    }

    const [folders, files, totalSizeAgg] = await Promise.all([
      prisma.cloudFolder.findMany({
        where: { userId: user!.id, parentId: folderId },
        orderBy: { name: "asc" },
      }),
      prisma.cloudFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.cloudFile.aggregate({
        where: { userId: user!.id },
        _sum: { size: true },
      }),
    ]);

    const totalSize = totalSizeAgg._sum.size ?? 0;

    return ok({ folders, files, totalSize, usedStorage: totalSize });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
