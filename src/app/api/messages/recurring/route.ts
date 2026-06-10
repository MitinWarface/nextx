/**
 * GET    /api/messages/recurring          — list recurring messages for current user
 * POST   /api/messages/recurring          — create a recurring message
 * DELETE /api/messages/recurring?id=xxx   — delete a recurring message
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, parseJson, HttpError, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  chatId: z.string().min(1),
  content: z.string().min(1).max(4000),
  recurrence: z.enum(["daily", "weekly", "monthly"]),
  nextSendAt: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const messages = await prisma.recurringMessage.findMany({
      where: { userId: currentUser!.id, isActive: true },
      orderBy: { nextSendAt: "asc" },
      include: {
        chat: { select: { id: true, name: true, type: true, avatarUrl: true } },
      },
    });

    return ok({ messages });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const body = await parseJson(req, createSchema);

    // Verify user is participant of the chat
    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: body.chatId, userId: currentUser!.id } },
      select: { chatId: true },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    const recurring = await prisma.recurringMessage.create({
      data: {
        userId: currentUser!.id,
        chatId: body.chatId,
        content: body.content,
        recurrence: body.recurrence,
        nextSendAt: new Date(body.nextSendAt),
      },
      include: {
        chat: { select: { id: true, name: true, type: true, avatarUrl: true } },
      },
    });

    return ok({ recurring });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new HttpError(400, "id_required");

    const result = await prisma.recurringMessage.deleteMany({
      where: { id, userId: currentUser!.id },
    });
    if (result.count === 0) throw new HttpError(404, "not_found");

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
