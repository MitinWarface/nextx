/**
 * POST /api/calendar/[eventId]/rsvp — RSVP to an event
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const rsvpSchema = z.object({
  status: z.enum(["going", "maybe", "not_going"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { eventId } = await params;
    const body = await parseJson(req, rsvpSchema);

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new HttpError(404, "event_not_found");

    const rsvp = await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId: me.id } },
      update: { status: body.status },
      create: { eventId, userId: me.id, status: body.status },
    });

    return ok({ rsvp });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
