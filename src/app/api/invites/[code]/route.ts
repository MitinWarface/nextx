/**
 * GET /api/invites/[code]  — preview invite (chat info)
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { code } = await ctx.params;
    const invite = await prisma.chatInvite.findUnique({
      where: { code },
      include: {
        chat: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            type: true,
            participants: { select: { userId: true } },
          },
        },
      },
    });
    if (!invite) throw new HttpError(404, "invite_not_found");
    if (invite.isRevoked) throw new HttpError(410, "invite_revoked");
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new HttpError(410, "invite_expired");
    }
    if (invite.maxUses != null && invite.usesCount >= invite.maxUses) {
      throw new HttpError(410, "invite_exhausted");
    }
    const alreadyMember = invite.chat.participants.some(
      (p) => p.userId === user!.id,
    );
    return ok({
      invite: {
        code: invite.code,
        maxUses: invite.maxUses,
        usesCount: invite.usesCount,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
        chat: {
          id: invite.chat.id,
          name: invite.chat.name,
          avatarUrl: invite.chat.avatarUrl,
          type: invite.chat.type,
          memberCount: invite.chat.participants.length,
        },
        alreadyMember,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
