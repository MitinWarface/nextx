/**
 * POST /api/bots/market/[botId]/install — install a bot
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return fail({ status: 401, message: "unauthorized" });
    }

    const { botId } = await params;

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: { id: true, isPublished: true, isActive: true },
    });

    if (!bot || !bot.isPublished || !bot.isActive) {
      return fail({ status: 404, message: "bot_not_found" });
    }

    const existing = await prisma.botInstall.findUnique({
      where: { botId_userId: { botId, userId: user.id } },
    });

    if (existing) {
      return ok({ installed: true, message: "already_installed" });
    }

    await prisma.$transaction([
      prisma.botInstall.create({
        data: { botId, userId: user.id },
      }),
      prisma.bot.update({
        where: { id: botId },
        data: { installCount: { increment: 1 } },
      }),
    ]);

    return ok({ installed: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
