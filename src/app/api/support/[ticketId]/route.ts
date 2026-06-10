import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { ticketId } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ticket) throw new HttpError(404, "not_found");

    return ok({ ticket });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
