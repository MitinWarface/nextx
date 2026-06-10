/**
 * POST /api/secret-chats/:chatId/accept — accept and set public key
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const body = await req.json();
    const publicKey = body.publicKey as string;

    if (!publicKey) {
      throw new HttpError(400, "publicKey is required");
    }

    const chat = await prisma.secretChat.findFirst({
      where: {
        id: chatId,
        OR: [{ user1Id: user!.id }, { user2Id: user!.id }],
        isActive: true,
      },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");

    const isUser1 = chat.user1Id === user!.id;

    await prisma.secretChat.update({
      where: { id: chatId },
      data: isUser1 ? { publicKey1: publicKey } : { publicKey2: publicKey },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
