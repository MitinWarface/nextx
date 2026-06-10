/**
 * POST /api/scheduled  — schedule a message
 * GET  /api/scheduled  — list my scheduled messages
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const scheduleSchema = z.object({
  chatId: z.string().min(1),
  content: z.string().min(1),
  scheduledFor: z.string().datetime(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "FILE", "AUDIO"]).default("TEXT"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const messages = await prisma.message.findMany({
      where: {
        senderId: user!.id,
        isScheduled: true,
        scheduledFor: { gte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
      select: {
        id: true,
        chatId: true,
        content: true,
        type: true,
        scheduledFor: true,
        createdAt: true,
      },
    });
    return ok({ messages });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, scheduleSchema);

    const scheduledDate = new Date(body.scheduledFor);
    if (scheduledDate <= new Date()) {
      throw new HttpError(400, "scheduled_for_must_be_in_future");
    }

    // Verify user is participant of the chat
    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: body.chatId, userId: user!.id } },
    });
    if (!participant) {
      throw new HttpError(403, "not_participant");
    }

    const message = await prisma.message.create({
      data: {
        chatId: body.chatId,
        senderId: user!.id,
        type: body.type,
        content: body.content,
        isScheduled: true,
        scheduledFor: scheduledDate,
      },
      select: {
        id: true,
        chatId: true,
        content: true,
        type: true,
        scheduledFor: true,
      },
    });

    return ok({ message });
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}
