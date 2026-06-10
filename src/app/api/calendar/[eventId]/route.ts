/**
 * PATCH  /api/calendar/[eventId] — update event
 * DELETE /api/calendar/[eventId] — delete event
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, parseJson, HttpError } from "@/lib/api-helpers";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isAllDay: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { eventId } = await params;
    const body = await parseJson(req, updateSchema);

    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId: me.id },
    });
    if (!event) throw new HttpError(404, "event_not_found");

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description;
    if (body.location !== undefined) data.location = body.location;
    if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.isAllDay !== undefined) data.isAllDay = body.isAllDay;

    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data,
      include: {
        chat: { select: { id: true, name: true, type: true } },
      },
    });

    return ok({ event: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { eventId } = await params;

    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, userId: me.id },
    });
    if (!event) throw new HttpError(404, "event_not_found");

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
