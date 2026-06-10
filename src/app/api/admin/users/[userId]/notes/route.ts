/**
 * GET  /api/admin/users/[userId]/notes — заметки о пользователе
 * POST /api/admin/users/[userId]/notes — добавить заметку
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok, parseJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { userId } = await params;

    const notes = await prisma.adminNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, username: true, displayName: true } } },
    });

    return ok({ notes });
  } catch (err) {
    return fail(err);
  }
}

const noteSchema = z.object({ content: z.string().min(1).max(5000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { userId } = await params;
    const body = await parseJson(req, noteSchema);

    const note = await prisma.adminNote.create({
      data: { userId, authorId: admin.id, content: body.content },
      include: { author: { select: { id: true, username: true, displayName: true } } },
    });

    return ok({ note });
  } catch (err) {
    return fail(err);
  }
}
