import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";

const LABEL_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink"] as const;

const patchSchema = z.object({
  color: z.enum(LABEL_COLORS).nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const { chatId } = await params;
    const body = await parseJson(req, patchSchema);

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: currentUser!.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { colorLabel: body.color },
      select: { id: true, colorLabel: true },
    });
    return ok(updated);
  } catch (err) {
    return fail(err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { colorLabel: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    return ok({ colorLabel: chat.colorLabel });
  } catch (err) {
    return fail(err);
  }
}
