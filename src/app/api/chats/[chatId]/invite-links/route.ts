/**
 * GET  /api/chats/[chatId]/invite-links  — list all invite links with stats
 * POST /api/chats/[chatId]/invite-links  — create new named invite link
 */
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().max(100).optional(),
  maxUses: z.number().int().min(1).max(10000).optional(),
  expiresAt: z.string().datetime().optional(),
});

function generateInviteCode(): string {
  return randomBytes(9).toString("base64url").toUpperCase().slice(0, 12);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await ctx.params;
    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
    });
    if (!me) throw new HttpError(403, "not_a_participant");

    const links = await prisma.chatInvite.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
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
    return ok({ links });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await ctx.params;
    const me = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
    });
    if (!me) throw new HttpError(403, "not_a_participant");
    if (me.role !== "OWNER" && me.role !== "ADMIN") {
      throw new HttpError(403, "admin_only");
    }
    const body = await parseJson(req, createSchema);

    let code = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.chatInvite.findUnique({ where: { code } });
      if (!exists) break;
      code = generateInviteCode();
    }

    const link = await prisma.chatInvite.create({
      data: {
        chatId,
        code,
        createdById: user!.id,
        name: body.name ?? null,
        maxUses: body.maxUses ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return ok({ link });
  } catch (err) {
    return fail(err);
  }
}
