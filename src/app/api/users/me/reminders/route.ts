/**
 * GET    /api/users/me/reminders — list upcoming reminders
 * POST   /api/users/me/reminders — create a reminder
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  messageId: z.string().nullable().optional(),
  chatId: z.string().min(1),
  remindAt: z.string().datetime(),
  text: z.string().max(500).nullable().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
});

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const reminders = await prisma.reminder.findMany({
      where: {
        userId: me.id,
        isCompleted: false,
        remindAt: { gte: new Date() },
      },
      orderBy: { remindAt: "asc" },
      take: 50,
      include: {
        chat: { select: { id: true, name: true, type: true } },
        message: { select: { id: true, content: true, type: true } },
      },
    });

    return ok({ reminders });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, createSchema);

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: body.chatId, userId: me.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const remindAt = new Date(body.remindAt);
    if (remindAt <= new Date()) throw new HttpError(400, "remind_at_must_be_future");

    const recurrence = body.recurrence ?? "none";

    const reminder = await prisma.reminder.create({
      data: {
        userId: me.id,
        messageId: body.messageId ?? null,
        chatId: body.chatId,
        remindAt,
        text: body.text ?? null,
        recurrence: recurrence === "none" ? null : recurrence,
      },
    });

    return ok({ reminder });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
