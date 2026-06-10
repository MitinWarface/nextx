/**
 * GET  /api/users/me/personal-channel — get or create personal channel
 * POST /api/users/me/personal-channel — create personal channel if not exists
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

async function getOrCreatePersonalChannel(userId: string, username: string) {
  // Check if personal channel already exists
  const existing = await prisma.chat.findFirst({
    where: {
      type: "CHANNEL",
      creatorId: userId,
      name: { startsWith: "📢 " },
      participants: { some: { userId } },
    },
  });

  if (existing) return existing;

  // Create personal channel
  const channel = await prisma.chat.create({
    data: {
      type: "CHANNEL",
      name: `📢 ${username}`,
      creatorId: userId,
      isVerified: false,
      participants: {
        create: { userId, role: "OWNER" },
      },
    },
  });

  return channel;
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const channel = await getOrCreatePersonalChannel(user!.id, user!.username);

    return ok({
      channelId: channel.id,
      name: channel.name,
      createdAt: channel.createdAt.toISOString(),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const channel = await getOrCreatePersonalChannel(user!.id, user!.username);

    return ok({
      channelId: channel.id,
      name: channel.name,
      createdAt: channel.createdAt.toISOString(),
    });
  } catch (err) {
    return fail(err);
  }
}
