/**
 * POST /api/seasonal/[eventId]/join — join a seasonal event
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const user = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { eventId } = await params;

    const event = await prisma.seasonalEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new HttpError(404, "event_not_found");

    const now = new Date();
    if (now < event.startsAt || now > event.endsAt) {
      throw new HttpError(400, "event_not_active");
    }

    await prisma.seasonalEvent.update({
      where: { id: eventId },
      data: { participants: { increment: 1 } },
    });

    return ok({ joined: true, eventId });
  } catch (err) {
    return fail(err);
  }
}
