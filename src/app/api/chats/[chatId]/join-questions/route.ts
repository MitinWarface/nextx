import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  questions: z.array(z.string().min(1).max(500)).min(1).max(10),
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
      select: { id: true, joinQuestions: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    return ok({ questions: chat.joinQuestions ?? [] });
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
      data: { joinQuestions: body.questions },
      select: { id: true, joinQuestions: true },
    });

    return ok({ questions: updated.joinQuestions });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
