/**
 * PATCH  /api/bots/[botId] — update bot
 * DELETE /api/bots/[botId] — delete bot
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;
    const body = await req.json();

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw new HttpError(404, "bot_not_found");
    if (bot.creatorId !== user!.id) throw new HttpError(403, "forbidden");

    const updated = await prisma.bot.update({
      where: { id: botId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      },
    });

    return ok({ bot: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot) throw new HttpError(404, "bot_not_found");
    if (bot.creatorId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.bot.delete({ where: { id: botId } });

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
