/**
 * POST /api/secret-chats — create/initiate a secret chat
 * GET /api/secret-chats — list my secret chats
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const chats = await prisma.secretChat.findMany({
      where: {
        OR: [{ user1Id: user!.id }, { user2Id: user!.id }],
        isActive: true,
      },
      include: {
        user1: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        user2: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    return ok({ chats });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const recipientId = body.recipientId as string;

    if (!recipientId) {
      throw new HttpError(400, "recipientId is required");
    }

    // Check if secret chat already exists
    const existing = await prisma.secretChat.findFirst({
      where: {
        OR: [
          { user1Id: user!.id, user2Id: recipientId },
          { user1Id: recipientId, user2Id: user!.id },
        ],
        isActive: true,
      },
    });
    if (existing) {
      return ok({ chat: existing, chatId: existing.chatId });
    }

    // Create a linked regular chat for the secret chat
    const chat = await prisma.chat.create({
      data: {
        type: "PRIVATE",
        participants: {
          createMany: {
            data: [
              { userId: user!.id, role: "MEMBER" },
              { userId: recipientId, role: "MEMBER" },
            ],
          },
        },
      },
    });

    const secretChat = await prisma.secretChat.create({
      data: {
        user1Id: user!.id,
        user2Id: recipientId,
        chatId: chat.id,
        publicKey1: "",
        publicKey2: "",
        sharedSecret: "",
      },
    });

    return ok({ chat: secretChat, chatId: chat.id });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
