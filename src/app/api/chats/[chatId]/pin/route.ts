import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";

const postSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/, "pin_must_be_4_digits"),
  action: z.enum(["set", "remove", "verify"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { chatId } = await params;
    const body = await parseJson(req, postSchema);

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { chatPinHash: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    if (body.action === "verify") {
      if (!chat.chatPinHash) throw new HttpError(400, "no_pin_set");
      const valid = await bcrypt.compare(body.pin, chat.chatPinHash);
      if (!valid) throw new HttpError(403, "wrong_pin");
      return ok({ verified: true });
    }

    if (body.action === "set") {
      if (chat.chatPinHash) throw new HttpError(400, "pin_already_set");
      const hash = await bcrypt.hash(body.pin, 10);
      await prisma.chat.update({
        where: { id: chatId },
        data: { chatPinHash: hash },
      });
      return ok({ set: true });
    }

    if (body.action === "remove") {
      if (!chat.chatPinHash) throw new HttpError(400, "no_pin_set");
      const valid = await bcrypt.compare(body.pin, chat.chatPinHash);
      if (!valid) throw new HttpError(403, "wrong_pin");
      await prisma.chat.update({
        where: { id: chatId },
        data: { chatPinHash: null },
      });
      return ok({ removed: true });
    }
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

    // Participant check
    const participant = await prisma.participant.findFirst({
      where: { chatId, userId: currentUser!.id },
    });
    if (!participant) throw new HttpError(403, "not_participant");

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { chatPinHash: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    return ok({ isLocked: !!chat.chatPinHash });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { chatId } = await params;
    const body = await parseJson(req, z.object({ pin: z.string().length(4) }));

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { chatPinHash: true },
    });
    if (!chat?.chatPinHash) throw new HttpError(400, "no_pin_set");

    const valid = await bcrypt.compare(body.pin, chat.chatPinHash);
    if (!valid) throw new HttpError(403, "wrong_pin");

    await prisma.chat.update({
      where: { id: chatId },
      data: { chatPinHash: null },
    });
    return ok({ removed: true });
  } catch (err) {
    return fail(err);
  }
}
