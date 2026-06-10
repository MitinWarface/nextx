/**
 * POST /api/invites/[code]/accept  — join chat via invite
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { code } = await ctx.params;

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.chatInvite.findUnique({
        where: { code },
        include: { chat: { select: { id: true, type: true } } },
      });
      if (!invite) throw new HttpError(404, "invite_not_found");
      if (invite.isRevoked) throw new HttpError(410, "invite_revoked");
      if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
        throw new HttpError(410, "invite_expired");
      }
      if (invite.maxUses != null && invite.usesCount >= invite.maxUses) {
        throw new HttpError(410, "invite_exhausted");
      }

      const existing = await tx.participant.findUnique({
        where: { chatId_userId: { chatId: invite.chatId, userId: user!.id } },
      });
      if (existing) {
        return { chatId: invite.chatId, alreadyMember: true };
      }

      await tx.participant.create({
        data: {
          chatId: invite.chatId,
          userId: user!.id,
          role: "MEMBER",
        },
      });
      await tx.chatInvite.update({
        where: { id: invite.id },
        data: { usesCount: { increment: 1 } },
      });
      return { chatId: invite.chatId, alreadyMember: false };
    });

    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
