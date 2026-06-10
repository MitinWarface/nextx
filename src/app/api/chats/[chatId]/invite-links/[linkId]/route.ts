/**
 * GET    /api/chats/[chatId]/invite-links/[linkId]  — single link with stats
 * DELETE /api/chats/[chatId]/invite-links/[linkId]  — deactivate link
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ chatId: string; linkId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId, linkId } = await ctx.params;
    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
    });
    if (!me) throw new HttpError(403, "not_a_participant");

    const link = await prisma.chatInvite.findFirst({
      where: { id: linkId, chatId },
      select: {
        id: true,
        code: true,
        name: true,
        usesCount: true,
        maxUses: true,
        isActive: true,
        isRevoked: true,
        expiresAt: true,
        createdAt: true,
        createdById: true,
      },
    });
    if (!link) throw new HttpError(404, "not_found");
    return ok({ link });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ chatId: string; linkId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId, linkId } = await ctx.params;
    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
    });
    if (!me) throw new HttpError(403, "not_a_participant");
    if (me.role !== "OWNER" && me.role !== "ADMIN") {
      throw new HttpError(403, "admin_only");
    }

    const link = await prisma.chatInvite.findFirst({
      where: { id: linkId, chatId },
    });
    if (!link) throw new HttpError(404, "not_found");

    await prisma.chatInvite.update({
      where: { id: linkId },
      data: { isActive: false, isRevoked: true },
    });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}
