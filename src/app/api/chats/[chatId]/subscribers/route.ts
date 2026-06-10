import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

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
      select: { creatorId: true, type: true, isPaidChannel: true, subscriptionPrice: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.creatorId !== me.id) throw new HttpError(403, "not_owner");

    const subscribers = await prisma.channelSubscriber.findMany({
      where: { chatId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      subscribers: subscribers.map((s) => ({
        id: s.id,
        user: s.user,
        expiresAt: s.expiresAt?.toISOString() ?? null,
        subscribedAt: s.createdAt.toISOString(),
      })),
      isPaidChannel: chat.isPaidChannel,
      subscriptionPrice: chat.subscriptionPrice,
      totalSubscribers: subscribers.length,
    });
  } catch (err) {
    return fail(err);
  }
}
