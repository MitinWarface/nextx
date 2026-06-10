/**
 * GET    /api/calendar — list user's calendar events (all upcoming)
 * POST   /api/calendar — create calendar event
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  chatId: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  isAllDay: z.boolean().optional(),
});

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const now = new Date();
    const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const events = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { userId: me.id },
          { chat: { participants: { some: { userId: me.id } } } },
        ],
        startsAt: { gte: now, lte: sixMonths },
      },
      orderBy: { startsAt: "asc" },
      take: 200,
      include: {
        chat: { select: { id: true, name: true, type: true } },
        rsvps: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
      },
    });

    return ok({ events });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, createSchema);

    if (body.chatId) {
      const participant = await prisma.participant.findUnique({
        where: { chatId_userId: { chatId: body.chatId, userId: me.id } },
        select: { id: true },
      });
      if (!participant) throw new HttpError(403, "not_a_participant");
    }

    const startsAt = new Date(body.startsAt);
    if (body.endsAt) {
      const endsAt = new Date(body.endsAt);
      if (endsAt <= startsAt) throw new HttpError(400, "ends_at_must_be_after_starts_at");
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: me.id,
        chatId: body.chatId ?? null,
        title: body.title.trim(),
        description: body.description ?? null,
        location: body.location ?? null,
        startsAt,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        isAllDay: body.isAllDay ?? false,
      },
      include: {
        chat: { select: { id: true, name: true, type: true } },
      },
    });

    return ok({ event });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
