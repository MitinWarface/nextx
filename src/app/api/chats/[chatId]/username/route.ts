import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

const usernameSchema = z
  .string()
  .min(5, "Username must be at least 5 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores allowed");

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
      select: { id: true, username: true, type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: currentUser!.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    return ok({ username: chat.username ?? null });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const { chatId } = await params;
    const { username: rawUsername } = await req.json();

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "GROUP" && chat.type !== "CHANNEL") {
      throw new HttpError(400, "username_only_for_groups_and_channels");
    }

    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: currentUser!.id } },
      select: { role: true },
    });
    if (!participant || (participant.role !== "OWNER" && participant.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    if (rawUsername === null || rawUsername === "") {
      await prisma.chat.update({ where: { id: chatId }, data: { username: null } });
      return ok({ username: null });
    }

    const parsed = usernameSchema.safeParse(rawUsername);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "invalid_username");
    }

    const username = parsed.data;

    const existing = await prisma.chat.findFirst({
      where: { username, NOT: { id: chatId } },
      select: { id: true },
    });
    if (existing) throw new HttpError(409, "username_taken");

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { username },
      select: { id: true, username: true },
    });

    return ok({ username: updated.username });
  } catch (err) {
    return fail(err);
  }
}
