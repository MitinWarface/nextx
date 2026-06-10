import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const { status, assignedTo } = body;

    const data: Record<string, any> = {};
    if (status) {
      const allowed = ["open", "in_progress", "waiting", "resolved", "closed"];
      if (!allowed.includes(status)) throw new HttpError(400, "invalid status");
      data.status = status;
      if (status === "closed") data.closedAt = new Date();
    }
    if (assignedTo !== undefined) data.assignedTo = assignedTo;

    if (Object.keys(data).length === 0) throw new HttpError(400, "nothing to update");

    const { ticketId } = await params;
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data,
    });

    return ok({ ticket });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
