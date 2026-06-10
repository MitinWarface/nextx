/**
 * GET  /api/bookmarks/folders — list bookmark folders
 * POST /api/bookmarks/folders — create folder
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  icon: z.string().max(10).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const folders = await prisma.bookmarkFolder.findMany({
      where: { userId: user!.id },
      include: { _count: { select: { bookmarks: true } } },
      orderBy: { name: "asc" },
    });

    return ok({ folders });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, createSchema);
    const folder = await prisma.bookmarkFolder.create({
      data: {
        userId: user!.id,
        name: body.name,
        icon: body.icon ?? undefined,
      },
    });

    return created({ folder });
  } catch (err) {
    return fail(err);
  }
}
