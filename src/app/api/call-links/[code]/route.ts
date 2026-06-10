/**
 * GET    /api/call-links/[code]  — get call link info (for joining)
 * DELETE /api/call-links/[code]  — revoke call link (owner only)
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { code } = await ctx.params;

    const link = await prisma.callLink.findUnique({
      where: { code },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        chat: {
          select: { id: true, name: true, avatarUrl: true, type: true },
        },
      },
    });

    if (!link) throw new HttpError(404, "link_not_found");
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new HttpError(410, "link_expired");
    }

    return ok({
      link: {
        id: link.id,
        code: link.code,
        createdAt: link.createdAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString() ?? null,
        url: `https://nextx.app/call/${link.code}`,
        creator: link.creator,
        chat: link.chat,
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { code } = await ctx.params;

    const link = await prisma.callLink.findUnique({
      where: { code },
      select: { id: true, creatorId: true },
    });

    if (!link) throw new HttpError(404, "link_not_found");
    if (link.creatorId !== user!.id) {
      throw new HttpError(403, "not_owner");
    }

    await prisma.callLink.delete({ where: { id: link.id } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}
