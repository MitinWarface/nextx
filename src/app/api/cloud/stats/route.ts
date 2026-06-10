/**
 * GET /api/cloud/stats — return storage usage stats
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const isPremium = await hasFeature(user!.id, "large_upload");
    const storageLimit = isPremium
      ? 100 * 1024 * 1024 * 1024 // 100 GB
      : 5 * 1024 * 1024 * 1024; // 5 GB

    const [totalSizeAgg, photoCount, videoCount, documentCount, audioCount, otherCount] =
      await Promise.all([
        prisma.cloudFile.aggregate({
          where: { userId: user!.id },
          _sum: { size: true },
        }),
        prisma.cloudFile.count({
          where: { userId: user!.id, category: "photo" },
        }),
        prisma.cloudFile.count({
          where: { userId: user!.id, category: "video" },
        }),
        prisma.cloudFile.count({
          where: { userId: user!.id, category: "document" },
        }),
        prisma.cloudFile.count({
          where: { userId: user!.id, category: "audio" },
        }),
        prisma.cloudFile.count({
          where: { userId: user!.id, category: "other" },
        }),
      ]);

    return ok({
      totalSize: totalSizeAgg._sum.size ?? 0,
      photoCount,
      videoCount,
      documentCount,
      audioCount,
      otherCount,
      storageLimit,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
