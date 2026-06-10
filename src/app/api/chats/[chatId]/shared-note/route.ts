/**
 * GET  /api/chats/[chatId]/shared-note  — get shared note for a chat
 * PUT  /api/chats/[chatId]/shared-note  — update shared note content
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

const putSchema = z.object({
  content: z.string().max(50000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const { chatId } = await params;

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: currentUser!.id } },
      select: { chatId: true },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    let note = await prisma.sharedNote.findUnique({
      where: { chatId },
      select: { id: true, content: true, updatedAt: true },
    });

    if (!note) {
      note = await prisma.sharedNote.create({
        data: { chatId, content: "" },
        select: { id: true, content: true, updatedAt: true },
      });
    }

    return ok({ note });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const { chatId } = await params;
    const body = await parseJson(req, putSchema);

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: currentUser!.id } },
      select: { chatId: true },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    const note = await prisma.sharedNote.upsert({
      where: { chatId },
      create: { chatId, content: body.content },
      update: { content: body.content },
      select: { id: true, content: true, updatedAt: true },
    });

    return ok({ note });
  } catch (err) {
    return fail(err);
  }
}
