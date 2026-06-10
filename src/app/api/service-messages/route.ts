/**
 * POST /api/service-messages — send a service notification to a user (admin only)
 * GET  /api/service-messages — list service messages for current user
 *
 * Body (POST):
 *   userId: string — target user
 *   serviceType: SECURITY | UPDATE | NEWS | SYSTEM | SUPPORT
 *   content: string
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-auth";
import { sendServiceMessage, getServiceChat } from "@/lib/service-chat";

const postSchema = z.object({
  userId: z.string().min(1),
  serviceType: z.enum(["SECURITY", "UPDATE", "NEWS", "SYSTEM", "SUPPORT"]),
  content: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    await requireAdmin();

    const body = await parseJson(req, postSchema);
    const message = await sendServiceMessage(body);
    return ok({ message });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const chat = await getServiceChat(user!.id);
    if (!chat) return ok({ messages: [] });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    const messages = await prisma.message.findMany({
      where: {
        chatId: chat.id,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;

    return ok({
      messages: data,
      nextCursor: hasMore ? data[data.length - 1]?.createdAt.toISOString() ?? null : null,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
