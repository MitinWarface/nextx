/**
 * GET /api/cloud/recent — user's most recent files across all folders
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
    const category = searchParams.get("category") || null;

    const where: Record<string, unknown> = { userId: user!.id };
    if (category) {
      where.category = category;
    }

    const files = await prisma.cloudFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    const grouped: Record<string, typeof files> = {};
    for (const f of files) {
      const group = f.category || "other";
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(f);
    }

    return ok({ files, grouped });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
