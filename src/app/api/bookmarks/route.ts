/**
 * GET  /api/bookmarks — list bookmarks (with optional folder/type filter)
 * POST /api/bookmarks — create bookmark
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  type: z.enum(["message", "channel", "link", "file", "profile"]),
  targetId: z.string().min(1),
  folderId: z.string().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = { userId: user!.id };
    if (folderId) where.folderId = folderId;
    if (type) where.type = type;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { note: { contains: q, mode: "insensitive" } },
      ];
    }

    const bookmarks = await prisma.bookmark.findMany({
      where,
      include: { folder: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: "desc" },
    });

    return ok({ bookmarks });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, createSchema);
    const bookmark = await prisma.bookmark.create({
      data: {
        userId: user!.id,
        type: body.type,
        targetId: body.targetId,
        folderId: body.folderId ?? undefined,
        title: body.title ?? undefined,
        note: body.note ?? undefined,
      },
    });

    return created({ bookmark });
  } catch (err) {
    return fail(err);
  }
}
