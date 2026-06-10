import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const content = (body.content as string)?.trim();
    const isInternal = (body.isInternal as boolean) ?? false;

    if (!content) throw new HttpError(400, "content required");

    const { ticketId } = await params;
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, "not_found");

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: user!.id,
        content,
        isInternal,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        messageCount: { increment: 1 },
        lastReplyAt: new Date(),
        status: ticket.status === "open" ? "in_progress" : ticket.status,
      },
    });

    return ok({ message });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
