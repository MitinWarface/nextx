import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });

    return ok({ tickets });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const subject = (body.subject as string)?.trim();
    const category = (body.category as string) ?? "technical";
    const priority = (body.priority as string) ?? "normal";
    const message = (body.message as string)?.trim();

    if (!subject || !message) {
      throw new HttpError(400, "subject and message required");
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user!.id,
        subject,
        category,
        priority,
        messageCount: 1,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user!.id,
        content: message,
      },
    });

    return ok({ ticket });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
