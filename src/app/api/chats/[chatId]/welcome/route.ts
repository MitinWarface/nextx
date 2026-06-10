import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  welcomeMessage: z.string().max(2000).nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, welcomeMessage: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { id: true },
    });
    if (!p) throw new HttpError(403, "not_a_participant");

    return ok({ welcomeMessage: chat.welcomeMessage });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;
    const body = await parseJson(req, postSchema);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "GROUP") throw new HttpError(400, "not_a_group");

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!p || (p.role !== "OWNER" && p.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { welcomeMessage: body.welcomeMessage },
      select: { id: true, welcomeMessage: true },
    });

    return ok({ chat: updated });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
