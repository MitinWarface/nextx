import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const { expiresAt, autoArchive } = body;
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: { where: { userId: user!.id, role: { in: ["OWNER", "ADMIN"] } } } },
    });
    if (!chat) throw new HttpError(404, "not_found");
    if (chat.participants.length === 0) throw new HttpError(403, "forbidden");

    const data: Record<string, any> = {};
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (autoArchive !== undefined) data.autoArchive = Boolean(autoArchive);

    const updated = await prisma.chat.update({ where: { id: chatId }, data });
    return ok({ chat: updated });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
